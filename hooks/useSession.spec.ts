import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';

// ─── Setup ──────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSuccess(data: Record<string, unknown> = {}) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          sessionId: 'test-session',
          creationsRemaining: 5,
          cooldownSeconds: 0,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          ...data,
        },
      }),
  });
}

function mockFetchFailure() {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
}

// Flush microtasks to let useEffect + fetch resolve (real timers only)
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// Flush with fake timers — advance 1ms to process microtasks without triggering 1s interval
async function flushFake() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

// ─── Tests ──────────────────────────────────────────────

describe('useSession', () => {
  it('initializes with default state', () => {
    mockFetchSuccess();
    const { result } = renderHook(() => useSession());
    // Initial display value before server sync. Bumped 5→25 to match
    // the new MAX_CREATIONS_PER_DAY in sessionService.ts.
    expect(result.current.creationsRemaining).toBe(25);
    expect(result.current.cooldownSeconds).toBe(0);
  });

  it('generates and stores sessionId in localStorage when none exists', async () => {
    mockFetchSuccess();
    const { result } = renderHook(() => useSession());
    await flush();

    expect(localStorage.getItem('gsi-session-id')).toBeTruthy();
    expect(result.current.sessionId).toBeTruthy();
    expect(result.current.isReady).toBe(true);
  });

  it('restores existing sessionId from localStorage', async () => {
    localStorage.setItem('gsi-session-id', 'existing-session-123');
    mockFetchSuccess();

    const { result } = renderHook(() => useSession());
    await flush();

    expect(result.current.sessionId).toBe('existing-session-123');
    expect(result.current.isReady).toBe(true);
  });

  it('syncs with server on mount', async () => {
    mockFetchSuccess({ creationsRemaining: 3 });

    const { result } = renderHook(() => useSession());
    await flush();

    expect(result.current.creationsRemaining).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('handles server failure gracefully (non-blocking)', async () => {
    mockFetchFailure();

    const { result } = renderHook(() => useSession());
    await flush();

    expect(result.current.isReady).toBe(true);
    // Falls back to the optimistic default cap (25) when the sync fails.
    expect(result.current.creationsRemaining).toBe(25);
    expect(result.current.error).toBeNull();
  });

  it('starts cooldown timer when server returns cooldown', async () => {
    vi.useFakeTimers();
    mockFetchSuccess({ cooldownSeconds: 60 });

    const { result } = renderHook(() => useSession());
    await flushFake();

    expect(result.current.cooldownSeconds).toBe(60);

    // Advance exactly 1 second — cooldown should tick down by 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.cooldownSeconds).toBe(59);

    vi.useRealTimers();
  });

  it('clears cooldown when it reaches 0', async () => {
    vi.useFakeTimers();
    mockFetchSuccess({ cooldownSeconds: 2 });

    const { result } = renderHook(() => useSession());
    await flushFake();

    expect(result.current.cooldownSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.cooldownSeconds).toBe(0);

    vi.useRealTimers();
  });

  it('canCreate is true when ready, has remaining, no cooldown', async () => {
    mockFetchSuccess({ creationsRemaining: 3, cooldownSeconds: 0 });

    const { result } = renderHook(() => useSession());
    await flush();

    expect(result.current.canCreate).toBe(true);
  });

  it('canCreate is false when no creations remaining', async () => {
    mockFetchSuccess({ creationsRemaining: 0 });

    const { result } = renderHook(() => useSession());
    await flush();

    expect(result.current.creationsRemaining).toBe(0);
    expect(result.current.canCreate).toBe(false);
  });

  it('canCreate is false during cooldown', async () => {
    vi.useFakeTimers();
    mockFetchSuccess({ cooldownSeconds: 30, creationsRemaining: 3 });

    const { result } = renderHook(() => useSession());
    await flushFake();

    expect(result.current.cooldownSeconds).toBe(30);
    expect(result.current.canCreate).toBe(false);

    vi.useRealTimers();
  });

  it('trackCreation triggers server sync', async () => {
    mockFetchSuccess({ creationsRemaining: 5 });

    const { result } = renderHook(() => useSession());
    await flush();

    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    mockFetchSuccess({ creationsRemaining: 4 });

    await act(async () => {
      await result.current.trackCreation();
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('cleans up cooldown timer on unmount', async () => {
    vi.useFakeTimers();
    mockFetchSuccess({ cooldownSeconds: 60 });

    const { result, unmount } = renderHook(() => useSession());
    await flushFake();

    expect(result.current.cooldownSeconds).toBe(60);
    unmount();

    vi.useRealTimers();
  });
});
