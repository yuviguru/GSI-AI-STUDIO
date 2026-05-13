import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all capabilities so we don't pull in firebase / AI providers.
vi.mock('@/lib/capabilities', () => ({
  createStory: vi.fn().mockResolvedValue({
    creationId: 'c1',
    shareUrl: '/view/c1',
    story: { title: 'X', pages: [{}, {}] },
    aiXray: {},
    durationMs: 0,
  }),
  createQuiz: vi.fn(),
  createComic: vi.fn(),
  createGame: vi.fn(),
  createMusic: vi.fn(),
}));

import { executeTool, TOOLS } from './tools';

describe('MCP executeTool — runtime arg validation (Zod)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unknown tool names with a non-throwing error result', async () => {
    const result = await executeTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: /Unknown tool/ });
  });

  it('rejects oversized premise (length > 500) — Zod blocks before LLM cost', async () => {
    const huge = 'a'.repeat(50_000);
    const result = await executeTool('create_story', { premise: huge });
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: /Invalid arguments/ });
    // Should NOT have called the capability.
    const { createStory } = await import('@/lib/capabilities');
    expect(createStory).not.toHaveBeenCalled();
  });

  it('rejects undersized premise (length < 5)', async () => {
    const result = await executeTool('create_story', { premise: 'hi' });
    expect(result.isError).toBe(true);
  });

  it('rejects out-of-range pages (e.g. 100)', async () => {
    const result = await executeTool('create_story', {
      premise: 'A valid story idea about Arjun and a robot',
      pages: 100,
    });
    expect(result.isError).toBe(true);
  });

  it('accepts a valid create_story payload and dispatches to the capability', async () => {
    const result = await executeTool('create_story', {
      premise: 'Arjun finds a time machine in his school basement',
      ageGroup: '8-10',
      pages: 5,
    });
    expect(result.isError).toBeUndefined();
    const { createStory } = await import('@/lib/capabilities');
    expect(createStory).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown enum values for style', async () => {
    const result = await executeTool('create_comic', {
      premise: 'Two friends discover a secret tunnel',
      style: 'noir-drama-grit', // not in enum
    });
    expect(result.isError).toBe(true);
  });

  it('all 5 tools have arg schemas registered', () => {
    // Sanity: every TOOL has a corresponding Zod schema entry. Catches the
    // case where a new tool is added to TOOLS without its validator.
    const expected = ['create_story', 'create_quiz', 'create_comic', 'create_game', 'create_music'];
    expect(TOOLS.map((t) => t.name).sort()).toEqual(expected.sort());
  });
});

describe('MCP executeTool — error sanitization', () => {
  it('does not leak provider error details to the client', async () => {
    vi.doMock('@/lib/capabilities', () => ({
      createStory: vi.fn().mockRejectedValue(
        new Error('Anthropic API request_id=abc123: invalid_api_key for org_xyz'),
      ),
      createQuiz: vi.fn(),
      createComic: vi.fn(),
      createGame: vi.fn(),
      createMusic: vi.fn(),
    }));
    vi.resetModules();
    const { executeTool: et } = await import('./tools');

    const result = await et('create_story', {
      premise: 'A valid story idea about a friendly robot',
    });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    // Generic message, no Anthropic / API key / internal details.
    expect(text).not.toMatch(/anthropic|api_key|request_id|org_/i);
  });
});
