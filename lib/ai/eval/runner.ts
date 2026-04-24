/**
 * Phase 4 (QA-001): minimal eval runner.
 *
 * Standalone — no vitest / mock framework needed. Suites describe their
 * own input + how to call the generator + the structural assertions to
 * apply. The runner just orchestrates execution and aggregates a report.
 *
 * Suites that need a live ANTHROPIC_API_KEY should set `skipReason` so
 * the runner skips cleanly in CI environments without secrets.
 */

import type {
  Assertion,
  AssertionResult,
  CaseReport,
  EvalCase,
  EvalReport,
  EvalSuite,
  SuiteReport,
} from './types';

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;
const LATIN_RANGE = /[A-Za-z]/;

function getPath(value: unknown, path: string): unknown {
  if (path === '' || path === '$') return value;
  const parts = path.split('.');
  let cur: unknown = value;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function evaluate(value: unknown, a: Assertion): AssertionResult {
  switch (a.kind) {
    case 'hasKeys': {
      if (value === null || typeof value !== 'object') {
        return { kind: a.kind, pass: false, detail: 'value is not an object' };
      }
      const obj = value as Record<string, unknown>;
      const missing = a.keys.filter((k) => !(k in obj));
      return {
        kind: a.kind,
        pass: missing.length === 0,
        detail: missing.length === 0 ? undefined : `missing: ${missing.join(', ')}`,
      };
    }
    case 'lengthBetween': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const ok = v.length >= a.min && v.length <= a.max;
      return {
        kind: a.kind,
        pass: ok,
        detail: ok ? undefined : `${a.path}.length=${v.length} not in [${a.min}, ${a.max}]`,
      };
    }
    case 'wordsBetween': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const wc = wordCount(v);
      const ok = wc >= a.min && wc <= a.max;
      return {
        kind: a.kind,
        pass: ok,
        detail: ok ? undefined : `${a.path} word count=${wc} not in [${a.min}, ${a.max}]`,
      };
    }
    case 'isArrayBetween': {
      const v = getPath(value, a.path);
      if (!Array.isArray(v)) {
        return { kind: a.kind, pass: false, detail: `${a.path} is not an array` };
      }
      const ok = v.length >= a.min && v.length <= a.max;
      return {
        kind: a.kind,
        pass: ok,
        detail: ok ? undefined : `${a.path}.length=${v.length} not in [${a.min}, ${a.max}]`,
      };
    }
    case 'noPhrases': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const lower = v.toLowerCase();
      const hits = a.phrases.filter((p) => lower.includes(p.toLowerCase()));
      return {
        kind: a.kind,
        pass: hits.length === 0,
        detail: hits.length === 0 ? undefined : `found banned phrase(s): ${hits.join(', ')}`,
      };
    }
    case 'includesAny': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const lower = v.toLowerCase();
      const hit = a.needles.some((n) => lower.includes(n.toLowerCase()));
      return {
        kind: a.kind,
        pass: hit,
        detail: hit ? undefined : `none of [${a.needles.join(', ')}] present`,
      };
    }
    case 'scriptIs': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const hasDevanagari = DEVANAGARI_RANGE.test(v);
      const hasLatin = LATIN_RANGE.test(v);
      const ok =
        a.script === 'devanagari'
          ? hasDevanagari && !hasLatin
          : hasLatin && !hasDevanagari;
      return {
        kind: a.kind,
        pass: ok,
        detail: ok
          ? undefined
          : `${a.path} expected ${a.script} only (devanagari=${hasDevanagari}, latin=${hasLatin})`,
      };
    }
    case 'noOtherStudentNames': {
      const v = getPath(value, a.path);
      if (typeof v !== 'string') {
        return { kind: a.kind, pass: false, detail: `${a.path} is not a string` };
      }
      const hits = a.otherNames.filter((n) => {
        if (n === a.allowedFirstName) return false;
        return new RegExp(`\\b${escapeRegex(n)}\\b`, 'i').test(v);
      });
      return {
        kind: a.kind,
        pass: hits.length === 0,
        detail: hits.length === 0 ? undefined : `cross-student leak: ${hits.join(', ')}`,
      };
    }
  }
}

async function runCase<TInput, TOutput>(
  c: EvalCase<TInput, TOutput>,
): Promise<CaseReport> {
  const t0 = Date.now();
  try {
    const value = await c.run(c.input);
    const assertions = c.assertions.map((a) => evaluate(value, a));
    const ok = assertions.every((r) => r.pass);
    return {
      id: c.id,
      ok,
      durationMs: Date.now() - t0,
      assertions,
    };
  } catch (err) {
    return {
      id: c.id,
      ok: false,
      durationMs: Date.now() - t0,
      assertions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runSuite<TInput, TOutput>(
  suite: EvalSuite<TInput, TOutput>,
): Promise<SuiteReport> {
  const skipReason = suite.skipReason?.();
  if (skipReason) {
    return {
      name: suite.name,
      ok: true,
      skipped: true,
      skipReason,
      cases: [],
    };
  }
  const cases: CaseReport[] = [];
  for (const c of suite.cases) {
    cases.push(await runCase(c));
  }
  return {
    name: suite.name,
    ok: cases.every((c) => c.ok),
    skipped: false,
    cases,
  };
}

// Heterogeneous array of suites with differing input/output shapes.
// `any` is the variance escape hatch: TS function-argument contravariance
// means a concrete `EvalSuite<X, Y>` is NOT assignable to
// `EvalSuite<unknown, unknown>` because `(input: unknown) => ...` cannot
// accept the concrete X. The runner only inspects outputs via path-string
// lookups and never relies on the I/O types being correct — this `any`
// stays internal to this file.
// eslint-config-next does not enforce `no-explicit-any` so no suppression
// is needed; referencing that rule by name broke CI when it wasn't
// registered.
type AnySuite = EvalSuite<any, any>;

export async function runEvalSuites(suites: AnySuite[]): Promise<EvalReport> {
  const startedAt = new Date();
  const t0 = Date.now();
  const results: SuiteReport[] = [];
  for (const s of suites) {
    results.push(await runSuite(s));
  }
  return {
    startedAt,
    durationMs: Date.now() - t0,
    suites: results,
    ok: results.every((s) => s.ok),
  };
}

export function formatReport(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(
    `Eval ${report.ok ? 'PASS' : 'FAIL'} · ${report.suites.length} suites · ${report.durationMs}ms`,
  );
  for (const s of report.suites) {
    if (s.skipped) {
      lines.push(`  ⊘ ${s.name} — skipped: ${s.skipReason}`);
      continue;
    }
    const passCount = s.cases.filter((c) => c.ok).length;
    lines.push(
      `  ${s.ok ? '✓' : '✗'} ${s.name} (${passCount}/${s.cases.length})`,
    );
    for (const c of s.cases) {
      if (c.ok) continue;
      lines.push(`    ✗ ${c.id} (${c.durationMs}ms)`);
      if (c.error) lines.push(`        error: ${c.error}`);
      for (const a of c.assertions) {
        if (a.pass) continue;
        lines.push(`        ${a.kind}: ${a.detail ?? 'failed'}`);
      }
    }
  }
  return lines.join('\n');
}
