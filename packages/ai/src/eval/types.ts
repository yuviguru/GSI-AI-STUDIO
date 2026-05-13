/** Phase 4 (QA-001): AI evaluation harness shared types. */

export type Locale = 'en' | 'hi';

export type Assertion =
  | { kind: 'hasKeys'; keys: string[] }
  | { kind: 'lengthBetween'; path: string; min: number; max: number }
  | { kind: 'wordsBetween'; path: string; min: number; max: number }
  | { kind: 'isArrayBetween'; path: string; min: number; max: number }
  | { kind: 'noPhrases'; path: string; phrases: string[] }
  | { kind: 'includesAny'; path: string; needles: string[] }
  | { kind: 'scriptIs'; path: string; script: 'latin' | 'devanagari' }
  | { kind: 'noOtherStudentNames'; path: string; allowedFirstName: string; otherNames: string[] };

export interface AssertionResult {
  kind: Assertion['kind'];
  pass: boolean;
  detail?: string;
}

export interface EvalCase<TInput, TOutput> {
  id: string;
  description?: string;
  input: TInput;
  /** Called by the runner — typically calls the generator. */
  run: (input: TInput) => Promise<TOutput>;
  assertions: Assertion[];
}

export interface EvalSuite<TInput = unknown, TOutput = unknown> {
  name: string;
  cases: EvalCase<TInput, TOutput>[];
  /** Skip the suite at runtime (e.g. when ANTHROPIC_API_KEY is missing). */
  skipReason?: () => string | null;
}

export interface CaseReport {
  id: string;
  ok: boolean;
  durationMs: number;
  assertions: AssertionResult[];
  error?: string;
}

export interface SuiteReport {
  name: string;
  ok: boolean;
  skipped: boolean;
  skipReason?: string;
  cases: CaseReport[];
}

export interface EvalReport {
  startedAt: Date;
  durationMs: number;
  suites: SuiteReport[];
  ok: boolean;
}
