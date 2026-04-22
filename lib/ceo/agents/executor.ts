/**
 * Kid CEO agent workflow executor.
 *
 * Takes a `WorkflowSpec` — an ordered pipeline of tool invocations — and
 * runs them step-by-step, producing:
 *   - the final artifact assets, and
 *   - a `CeoWorkflowStepTrace[]` the UI renders in the X-ray panel.
 *
 * Explicit design choices:
 *   1. One retry per step on transient failure (1 × 500ms backoff). More
 *      retries risk compounding latency past the kid's attention window.
 *   2. Fails closed on the whole workflow only if a step marked
 *      `required: true` fails twice. Optional steps that fail are
 *      recorded as `failed: true` traces but don't abort the run.
 *   3. Cost tracking uses `lib/ceo/agents/pricing.ts` as the single
 *      source of truth — adapters don't compute their own ₹.
 *   4. No Firestore writes — pure compute. The caller (API route)
 *      persists the artifact.
 */

import { stepCostInr, type CeoAgentTool } from './pricing';
import type { ToolAdapter } from './tools/types';
import type { CeoArtifactAsset, CeoWorkflowStepTrace } from '@/types';

/** One step in a workflow. Each step resolves an adapter by `tool` id
 *  and invokes it with `prepareInput(context)`, where `context` is the
 *  accumulated map of prior step outputs (`{ [stepId]: output }`). */
export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  id: string;
  tool: CeoAgentTool;
  /** Default unit count (e.g. 1 for Claude, 3 for 3-logo Flux step). */
  unitCount?: number;
  required?: boolean;
  /** Build the input for this step from the accumulated outputs. */
  prepareInput: (context: WorkflowStepContext) => TInput;
  /** Optional post-processor that maps the step's raw output into the
   *  final `CeoArtifactAsset[]` contribution. When omitted, the step is
   *  "context-only" — its output feeds later steps but produces no
   *  kid-visible asset. */
  toAssets?: (output: TOutput) => CeoArtifactAsset[];
}

export type WorkflowStepContext = Record<string, unknown>;

/** The static shape declared per-workflow (BRAND, marketing, …). */
export interface WorkflowSpec<TBrief = unknown> {
  id: string;
  agentId: string;
  steps: ReadonlyArray<WorkflowStep<unknown, unknown>>;
  /** Brief validator — called by the executor before any step runs.
   *  Throws a descriptive Error on bad input. */
  validateBrief: (brief: TBrief) => void;
}

export type ToolRegistry = Record<CeoAgentTool, ToolAdapter<unknown, unknown>>;

export interface ExecuteWorkflowInput<TBrief = unknown> {
  spec: WorkflowSpec<TBrief>;
  brief: TBrief;
  /** Tool registry — injected so tests can pass stubs. */
  tools: ToolRegistry;
  /** Optional preamble merged into the step context (e.g.
   *  `{ business: CeoBusiness, brief: { ... } }`) so workflow steps can
   *  reference it via `context.business`. */
  contextPreamble?: Record<string, unknown>;
}

export interface ExecuteWorkflowResult {
  assets: CeoArtifactAsset[];
  trace: CeoWorkflowStepTrace[];
  /** Sum of per-step costs in in-sim ₹ at multiplier 1.0. Caller layers
   *  the re-roll multiplier on top before deducting cash. */
  baseCostInr: number;
}

export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public readonly stepId: string,
    public readonly trace: CeoWorkflowStepTrace[],
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

const RETRY_BACKOFF_MS = 500;

function makeTrace(
  stepId: string,
  tool: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  unitCount: number,
  inputSummary: string,
  outputSummary: string,
  latencyMs: number,
  attemptCount?: number,
  failed?: boolean,
): CeoWorkflowStepTrace {
  return {
    stepId,
    tool,
    model,
    promptTokens,
    completionTokens,
    costInr: stepCostInr(tool as CeoAgentTool, unitCount),
    inputSummary,
    outputSummary,
    latencyMs,
    ...(attemptCount !== undefined ? { attemptCount } : {}),
    ...(failed ? { failed: true } : {}),
  };
}

function summariseInput(input: unknown): string {
  if (typeof input === 'string') {
    return input.length > 120 ? `${input.slice(0, 117)}…` : input;
  }
  try {
    const s = JSON.stringify(input);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return '[unserialisable input]';
  }
}

export async function executeWorkflow<TBrief>(
  params: ExecuteWorkflowInput<TBrief>,
): Promise<ExecuteWorkflowResult> {
  const { spec, brief, tools, contextPreamble } = params;
  spec.validateBrief(brief);

  const context: WorkflowStepContext = {
    brief,
    ...(contextPreamble ?? {}),
  };
  const trace: CeoWorkflowStepTrace[] = [];
  const assets: CeoArtifactAsset[] = [];
  let baseCostInr = 0;

  for (const step of spec.steps) {
    const adapter = tools[step.tool];
    if (!adapter) {
      throw new WorkflowExecutionError(
        `No tool adapter registered for '${step.tool}'`,
        step.id,
        trace,
      );
    }

    const input = step.prepareInput(context);
    const inputSummary = summariseInput(input);

    let lastError: unknown = undefined;
    let result: Awaited<ReturnType<typeof adapter.run>> | null = null;
    let attemptCount = 0;
    const stepStart = Date.now();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      attemptCount = attempt;
      try {
        result = await adapter.run(input, { attempt });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
        }
      }
    }

    const latencyMs = Date.now() - stepStart;
    const unitCount = step.unitCount ?? adapter.unitCount ?? 1;

    if (!result) {
      trace.push(
        makeTrace(
          step.id,
          step.tool,
          '',
          0,
          0,
          unitCount,
          inputSummary,
          (lastError as Error | undefined)?.message ?? 'unknown error',
          latencyMs,
          attemptCount,
          true,
        ),
      );
      if (step.required !== false) {
        throw new WorkflowExecutionError(
          `Step '${step.id}' failed after ${attemptCount} attempts: ${
            (lastError as Error | undefined)?.message ?? 'unknown'
          }`,
          step.id,
          trace,
          lastError,
        );
      }
      continue;
    }

    trace.push(
      makeTrace(
        step.id,
        step.tool,
        result.model,
        result.promptTokens,
        result.completionTokens,
        unitCount,
        inputSummary,
        result.outputSummary,
        latencyMs,
        attemptCount,
      ),
    );
    baseCostInr += stepCostInr(step.tool, unitCount);

    // Expose the step output to downstream steps under `context[step.id]`.
    context[step.id] = result.output;

    if (step.toAssets) {
      const stepAssets = step.toAssets(result.output);
      if (Array.isArray(stepAssets)) assets.push(...stepAssets);
    }
  }

  return { assets, trace, baseCostInr };
}
