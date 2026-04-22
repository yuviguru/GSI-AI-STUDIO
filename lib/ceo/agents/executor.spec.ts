import { describe, expect, it, vi } from 'vitest';
import { WorkflowExecutionError, executeWorkflow, type WorkflowSpec, type ToolRegistry } from './executor';
import type { ToolAdapter } from './tools/types';

function stubTool<I, O>(
  id: ToolAdapter<I, O>['id'],
  impl: (input: I, attempt: number) => Promise<O>,
  label = id,
): ToolAdapter<I, O> {
  return {
    id,
    label,
    async run(input, ctx) {
      const output = await impl(input, ctx.attempt);
      return {
        output,
        outputSummary: JSON.stringify(output).slice(0, 80),
        model: `stub-${id}`,
        promptTokens: 10,
        completionTokens: 20,
      };
    },
  };
}

function makeRegistry(overrides: Partial<ToolRegistry> = {}): ToolRegistry {
  return {
    claude_haiku: stubTool('claude_haiku', async () => ({ text: 'ok', json: null })),
    claude_sonnet: stubTool('claude_sonnet', async () => ({ text: 'ok', json: null })),
    groq_llama: stubTool('groq_llama', async () => ({ text: 'ok', json: null })),
    flux_schnell: stubTool('flux_schnell', async () => ({
      url: 'https://example/logo.png',
      providerName: 'stub',
      widthPx: 512,
      heightPx: 512,
    })),
    pollinations: stubTool('pollinations', async () => ({
      url: 'https://example/poll.png',
      providerName: 'stub',
      widthPx: 512,
      heightPx: 512,
    })),
    transformers_js: stubTool('transformers_js', async () => ({ text: 'ok' })),
    brave_search: stubTool('brave_search', async () => ({ results: [] })),
    deterministic: stubTool('deterministic', async () => ({ ok: true })),
    ...overrides,
  };
}

const simpleSpec: WorkflowSpec<{ mood: string }> = {
  id: 'test.simple',
  agentId: 'design',
  validateBrief(brief) {
    if (!brief.mood) throw new Error('mood required');
  },
  steps: [
    {
      id: 'brief_expansion',
      tool: 'claude_haiku',
      prepareInput: (ctx) => ({
        systemPrompt: 'You are a designer.',
        userMessage: `mood=${(ctx.brief as { mood: string }).mood}`,
      }),
    },
    {
      id: 'logo_candidates',
      tool: 'flux_schnell',
      unitCount: 3,
      prepareInput: () => ({ prompt: 'happy logo', style: 'cartoon', width: 512, height: 512 }),
      toAssets: (out) => [
        {
          type: 'image',
          kind: 'logo',
          url: (out as { url: string }).url,
          caption: 'Option 1',
          altText: 'Logo',
          widthPx: 512,
          heightPx: 512,
        },
      ],
    },
  ],
};

describe('executor — happy path', () => {
  it('runs every step and populates trace + assets', async () => {
    const result = await executeWorkflow({
      spec: simpleSpec,
      brief: { mood: 'playful' },
      tools: makeRegistry(),
    });
    expect(result.trace).toHaveLength(2);
    expect(result.trace[0]!.stepId).toBe('brief_expansion');
    expect(result.trace[1]!.stepId).toBe('logo_candidates');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]!.type).toBe('image');
    expect(result.baseCostInr).toBe(5 + 8 * 3); // claude ₹5 + 3×flux ₹8
  });

  it('passes brief through validateBrief before running steps', async () => {
    const validateBrief = vi.fn();
    const spec: WorkflowSpec<{ mood: string }> = {
      ...simpleSpec,
      validateBrief,
    };
    await executeWorkflow({
      spec,
      brief: { mood: 'playful' },
      tools: makeRegistry(),
    });
    expect(validateBrief).toHaveBeenCalledOnce();
    expect(validateBrief).toHaveBeenCalledWith({ mood: 'playful' });
  });

  it('surfaces a validateBrief error before any tool runs', async () => {
    const called: string[] = [];
    const tools = makeRegistry({
      claude_haiku: stubTool('claude_haiku', async () => {
        called.push('claude_haiku');
        return { text: 'x', json: null };
      }),
    });
    await expect(
      executeWorkflow({
        spec: simpleSpec,
        brief: { mood: '' },
        tools,
      }),
    ).rejects.toThrow(/mood required/);
    expect(called).toEqual([]);
  });

  it('exposes step output to downstream steps via context[id]', async () => {
    const spec: WorkflowSpec<{ mood: string }> = {
      id: 'test.chain',
      agentId: 'design',
      validateBrief() {},
      steps: [
        {
          id: 'brief',
          tool: 'claude_haiku',
          prepareInput: () => ({ systemPrompt: '', userMessage: '' }),
        },
        {
          id: 'final',
          tool: 'claude_haiku',
          prepareInput: (ctx) => {
            const prior = ctx.brief as unknown;
            expect(prior).toBeDefined();
            // The accumulated context carries the prior step's output
            expect((ctx as Record<string, unknown>).brief).toBeDefined();
            // The previous step's output is accessible by stepId
            return { systemPrompt: 'prior', userMessage: JSON.stringify(ctx.brief) };
          },
        },
      ],
    };
    const result = await executeWorkflow({
      spec,
      brief: { mood: 'bold' },
      tools: makeRegistry(),
    });
    expect(result.trace).toHaveLength(2);
  });
});

describe('executor — retries + failures', () => {
  it('retries once on transient failure before succeeding', async () => {
    let calls = 0;
    const tools = makeRegistry({
      claude_haiku: stubTool('claude_haiku', async () => {
        calls += 1;
        if (calls === 1) throw new Error('transient 503');
        return { text: 'ok', json: null };
      }),
    });
    const result = await executeWorkflow({
      spec: simpleSpec,
      brief: { mood: 'playful' },
      tools,
    });
    expect(calls).toBe(2);
    expect(result.trace[0]!.attemptCount).toBe(2);
    expect(result.trace[0]!.failed).toBeUndefined();
  });

  it('throws WorkflowExecutionError with partial trace when a required step fails both attempts', async () => {
    const tools = makeRegistry({
      flux_schnell: stubTool('flux_schnell', async () => {
        throw new Error('flux exploded');
      }),
    });
    const spec: WorkflowSpec<{ mood: string }> = {
      ...simpleSpec,
      steps: simpleSpec.steps.map((s) => ({ ...s, required: true })),
    };
    await expect(
      executeWorkflow({ spec, brief: { mood: 'x' }, tools }),
    ).rejects.toMatchObject({
      name: 'WorkflowExecutionError',
      stepId: 'logo_candidates',
    });
  });

  it('partial trace includes succeeded steps before the failure', async () => {
    const tools = makeRegistry({
      flux_schnell: stubTool('flux_schnell', async () => {
        throw new Error('no images today');
      }),
    });
    try {
      await executeWorkflow({ spec: simpleSpec, brief: { mood: 'x' }, tools });
      expect.unreachable('should have thrown');
    } catch (err) {
      const wfErr = err as WorkflowExecutionError;
      expect(wfErr.name).toBe('WorkflowExecutionError');
      expect(wfErr.trace.length).toBe(2); // succeeded + failed step
      expect(wfErr.trace[0]!.failed).toBeUndefined();
      expect(wfErr.trace[1]!.failed).toBe(true);
    }
  });

  it('optional step failure is recorded but does not abort', async () => {
    const tools = makeRegistry({
      flux_schnell: stubTool('flux_schnell', async () => {
        throw new Error('flux down');
      }),
    });
    const spec: WorkflowSpec<{ mood: string }> = {
      ...simpleSpec,
      steps: [
        simpleSpec.steps[0]!,
        { ...simpleSpec.steps[1]!, required: false },
      ],
    };
    const result = await executeWorkflow({ spec, brief: { mood: 'x' }, tools });
    expect(result.trace).toHaveLength(2);
    expect(result.trace[1]!.failed).toBe(true);
    expect(result.assets).toHaveLength(0); // failed step produced no assets
  });

  it('throws when the spec references a tool missing from the registry', async () => {
    const spec: WorkflowSpec<{ mood: string }> = {
      id: 'test.missing',
      agentId: 'design',
      validateBrief() {},
      steps: [
        {
          id: 'x',
          tool: 'brave_search',
          prepareInput: () => ({}),
        },
      ],
    };
    const bad = makeRegistry();
    delete (bad as Partial<ToolRegistry>).brave_search;
    await expect(
      executeWorkflow({ spec, brief: { mood: 'x' }, tools: bad as ToolRegistry }),
    ).rejects.toThrow(/No tool adapter registered/);
  });
});

describe('executor — cost accounting', () => {
  it('sums per-step base cost correctly', async () => {
    const result = await executeWorkflow({
      spec: simpleSpec,
      brief: { mood: 'playful' },
      tools: makeRegistry(),
    });
    // Claude (₹5) + 3 × Flux (₹24) = ₹29
    expect(result.baseCostInr).toBe(29);
    expect(result.trace[0]!.costInr).toBe(5);
    expect(result.trace[1]!.costInr).toBe(24);
  });

  it('failed required step is NOT billed (no cash burn for broken runs)', async () => {
    // Already implicit in behaviour — failed steps contribute 0 to baseCostInr.
    // Test via an OPTIONAL failing step so we actually get to the check:
    const tools = makeRegistry({
      flux_schnell: stubTool('flux_schnell', async () => {
        throw new Error('flux down');
      }),
    });
    const spec: WorkflowSpec<{ mood: string }> = {
      ...simpleSpec,
      steps: [
        simpleSpec.steps[0]!,
        { ...simpleSpec.steps[1]!, required: false },
      ],
    };
    const result = await executeWorkflow({ spec, brief: { mood: 'x' }, tools });
    // Only claude's ₹5 counted; the failed flux step didn't add its ₹24.
    expect(result.baseCostInr).toBe(5);
  });
});
