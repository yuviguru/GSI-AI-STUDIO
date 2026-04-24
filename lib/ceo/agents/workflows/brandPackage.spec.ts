import { describe, expect, it } from 'vitest';
import { executeWorkflow, type ToolRegistry } from '../executor';
import type { ToolAdapter } from '../tools/types';
import { BRAND_PACKAGE_WORKFLOW } from './brandPackage';
import type { ClaudeToolOutput } from '../tools/claude';
import type { FluxSchnellOutput } from '../tools/fluxSchnell';

function stub<O>(
  id: ToolAdapter<unknown, O>['id'],
  output: O,
  summary = 'stub',
): ToolAdapter<unknown, O> {
  return {
    id,
    label: id,
    async run() {
      return {
        output,
        outputSummary: summary,
        model: `stub-${id}`,
        promptTokens: 10,
        completionTokens: 20,
      };
    },
  };
}

function registry(): ToolRegistry {
  const briefExpansion: ClaudeToolOutput = {
    text: '{"visualStyle":"soft watercolor","palette":["#F9A","#9AF","#FFD"],"taglineDirection":"warm","logoPrompts":["p1","p2","p3"]}',
    json: {
      visualStyle: 'soft watercolor',
      palette: ['#F9A', '#9AF', '#FFD'],
      taglineDirection: 'warm',
      logoPrompts: ['p1', 'p2', 'p3'],
    },
  };
  const mottoAndVoice: ClaudeToolOutput = {
    text: '{"mottos":["m1","m2","m3"],"voice":"friendly and curious"}',
    json: {
      mottos: ['m1', 'm2', 'm3'],
      voice: 'friendly and curious',
    },
  };
  const flux: FluxSchnellOutput = {
    url: 'https://example/logo.png',
    providerName: 'stub',
    widthPx: 512,
    heightPx: 512,
  };
  return {
    claude_haiku: {
      id: 'claude_haiku',
      label: 'Claude Haiku',
      async run(input) {
        // Return different outputs for the two claude steps based on
        // the system prompt signature.
        const sys = String((input as { systemPrompt: string }).systemPrompt);
        const isMotto = sys.toLowerCase().includes('motto');
        const result = isMotto ? mottoAndVoice : briefExpansion;
        return {
          output: result,
          outputSummary: 'stub',
          model: 'claude-haiku-stub',
          promptTokens: 10,
          completionTokens: 20,
        };
      },
    } as ToolAdapter<unknown, unknown>,
    claude_sonnet: stub('claude_sonnet', briefExpansion),
    groq_llama: stub('groq_llama', briefExpansion),
    flux_schnell: stub('flux_schnell', flux),
    pollinations: stub('pollinations', flux),
    transformers_js: stub('transformers_js', { text: '' }),
    brave_search: stub('brave_search', { results: [] }),
    deterministic: stub('deterministic', { ok: true }),
  } as unknown as ToolRegistry;
}

const business = {
  id: 'b1',
  userId: 'u1',
  kidId: 'k1',
  businessName: 'Tropical Sips',
  businessType: 'lemonade',
  customBusinessDescription: null,
  location: 'Bangalore',
  startingCapital: 3000,
  currentCash: 3000,
  reputation: 50,
  morale: 50,
  employees: 0,
  phase: 'pre_launch' as const,
  phaseMilestones: {},
  totalDecisions: 0,
  status: 'active' as const,
  pace: '30' as const,
  nextEventAt: null,
  createdAt: '',
  updatedAt: '',
  completedAt: null,
};

describe('brand.package — validateBrief', () => {
  it('rejects unknown mood', () => {
    expect(() =>
      BRAND_PACKAGE_WORKFLOW.validateBrief({
        mood: 'mysterious-extra',
        audience: 'kids_my_age',
        oneWord: 'tropical',
      } as never),
    ).toThrow(/mood must be one of/);
  });

  it('rejects unknown audience', () => {
    expect(() =>
      BRAND_PACKAGE_WORKFLOW.validateBrief({
        mood: 'playful',
        audience: 'teachers',
        oneWord: 'tropical',
      } as never),
    ).toThrow(/audience must be one of/);
  });

  it('rejects oneWord longer than 20 chars', () => {
    expect(() =>
      BRAND_PACKAGE_WORKFLOW.validateBrief({
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: 'x'.repeat(21),
      } as never),
    ).toThrow(/≤ 20 characters/);
  });

  it('accepts a valid brief', () => {
    expect(() =>
      BRAND_PACKAGE_WORKFLOW.validateBrief({
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: 'tropical',
      } as never),
    ).not.toThrow();
  });

  it('accepts all 9 mood options', () => {
    const moods = [
      'playful',
      'serious',
      'bold',
      'dreamy',
      'mysterious',
      'warm',
      'clean',
      'retro',
      'energetic',
    ] as const;
    for (const m of moods) {
      expect(() =>
        BRAND_PACKAGE_WORKFLOW.validateBrief({
          mood: m,
          audience: 'kids_my_age',
          oneWord: 'tropical',
        } as never),
      ).not.toThrow();
    }
  });
});

describe('brand.package — end-to-end with stubbed tools', () => {
  it('produces 3 logos + 3 mottos + 1 voice asset', async () => {
    const result = await executeWorkflow({
      spec: BRAND_PACKAGE_WORKFLOW,
      brief: {
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: 'tropical',
      },
      tools: registry(),
      contextPreamble: { business },
    });

    const logos = result.assets.filter(
      (a) => a.type === 'image' && a.kind === 'logo',
    );
    const mottos = result.assets.filter(
      (a) => a.type === 'text' && a.kind === 'motto',
    );
    const voice = result.assets.filter(
      (a) => a.type === 'text' && a.kind === 'voice',
    );

    expect(logos).toHaveLength(3);
    expect(mottos).toHaveLength(3);
    expect(voice).toHaveLength(1);
  });

  it('trace captures all 5 steps in order', async () => {
    const result = await executeWorkflow({
      spec: BRAND_PACKAGE_WORKFLOW,
      brief: {
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: 'tropical',
      },
      tools: registry(),
      contextPreamble: { business },
    });
    const ids = result.trace.map((t) => t.stepId);
    expect(ids).toEqual([
      'brief_expansion',
      'logo_candidate_0',
      'logo_candidate_1',
      'logo_candidate_2',
      'motto_and_voice',
    ]);
  });

  it('base cost = Claude ₹5 + 3×Flux ₹24 + Claude ₹5 = ₹34', async () => {
    const result = await executeWorkflow({
      spec: BRAND_PACKAGE_WORKFLOW,
      brief: {
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: 'tropical',
      },
      tools: registry(),
      contextPreamble: { business },
    });
    expect(result.baseCostInr).toBe(34);
  });
});
