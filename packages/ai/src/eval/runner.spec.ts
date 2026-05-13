/**
 * Phase 4 (QA-001): vitest entry for the AI eval harness.
 *
 * Picks up via the project-wide `pnpm test` (vitest matches *.spec.ts).
 * Run only the eval slice with `pnpm test:ai-eval` (vitest run lib/ai/eval).
 *
 * Pure suites (runner-smoke, feedback-prompt-assembly) always run. Live-
 * Claude suites self-skip when ANTHROPIC_API_KEY is missing, so this is
 * safe in CI without secrets configured.
 */

import { describe, expect, it } from 'vitest';
import { formatReport, runEvalSuites } from './runner';
import { feedbackPromptSuite } from './suites/feedbackPrompt.suite';
import { runnerSmokeSuite } from './suites/runner.smoke.suite';

describe('AI eval harness', () => {
  it('passes every registered suite', async () => {
    const report = await runEvalSuites([runnerSmokeSuite, feedbackPromptSuite]);
    if (!report.ok) {
      // Surface the formatted report on failure so the diff is actionable.
      // eslint-disable-next-line no-console
      console.error(formatReport(report));
    }
    expect(report.ok).toBe(true);
  });
});
