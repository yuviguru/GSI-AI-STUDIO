import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiGeneration } from './useAiGeneration';

beforeEach(() => {
  vi.useFakeTimers();
  global.fetch = vi.fn();
  localStorage.setItem('gsi-session-id', 'test-session');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

function mockFetchSuccess(data: Record<string, unknown> = {}) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          story: { pages: [{ text: 'Once upon a time', imageUrl: '', pageNumber: 1 }] },
          aiXray: {
            model: 'claude',
            concept: 'prompt engineering',
            explanation: 'AI generates text from prompts',
            curriculumTag: 'AI-101',
            aiPoints: 10,
          },
          ...data,
        },
      }),
  });
}

function mockFetchError() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: false,
        data: null,
        error: { code: 'AI_GENERATION_FAILED', message: 'Failed' },
      }),
  });
}

describe('useAiGeneration', () => {
  it('initializes with idle state', () => {
    const { result } = renderHook(() => useAiGeneration('story'));
    expect(result.current.data).toBeNull();
    expect(result.current.aiXray).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progressMessage).toBe('');
  });

  it('sets loading during generation', async () => {
    // Make fetch never resolve to check loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAiGeneration('story'));

    act(() => {
      result.current.generate({ premise: 'A cat adventure' });
    });

    expect(result.current.loading).toBe(true);
  });

  it('sets progress message during generation', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAiGeneration('story'));

    act(() => {
      result.current.generate({ premise: 'A cat adventure' });
    });

    // First progress message should be set immediately
    expect(result.current.progressMessage).toContain('Imagining');
  });

  it('rotates progress messages over time', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAiGeneration('story'));

    act(() => {
      result.current.generate({ premise: 'test' });
    });

    const firstMessage = result.current.progressMessage;

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Message should have rotated
    expect(result.current.progressMessage).not.toBe(firstMessage);
  });

  it('returns data on success', async () => {
    mockFetchSuccess();

    const { result } = renderHook(() => useAiGeneration('story'));

    await act(async () => {
      vi.useRealTimers(); // need real timers for async
      await result.current.generate({ premise: 'A cat adventure' });
    });

    expect(result.current.data).toBeTruthy();
    expect(result.current.aiXray).toBeTruthy();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    mockFetchError();

    const { result } = renderHook(() => useAiGeneration('story'));

    await act(async () => {
      vi.useRealTimers();
      await result.current.generate({ premise: 'test' });
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error on network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAiGeneration('story'));

    await act(async () => {
      vi.useRealTimers();
      await result.current.generate({ premise: 'test' });
    });

    expect(result.current.error).toContain('Something went wrong');
    expect(result.current.loading).toBe(false);
  });

  it('sends session ID header', async () => {
    mockFetchSuccess();

    const { result } = renderHook(() => useAiGeneration('story'));

    await act(async () => {
      vi.useRealTimers();
      await result.current.generate({ premise: 'test' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/story',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Session-Id': 'test-session',
        }),
      })
    );
  });

  it('resets state', async () => {
    mockFetchSuccess();

    const { result } = renderHook(() => useAiGeneration('story'));

    await act(async () => {
      vi.useRealTimers();
      await result.current.generate({ premise: 'test' });
    });

    expect(result.current.data).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.aiXray).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progressMessage).toBe('');
  });

  it('uses correct endpoint for different studio types', async () => {
    mockFetchSuccess();

    const { result } = renderHook(() => useAiGeneration('quiz'));

    await act(async () => {
      vi.useRealTimers();
      await result.current.generate({ topic: 'Space' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/quiz',
      expect.anything()
    );
  });
});
