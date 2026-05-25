import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchJson,
  ApiError,
  InsufficientCreditsClientError,
  PlanLockedClientError,
} from './fetchJson';

describe('fetchJson', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function mockResponse(status: number, body: unknown) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  it('returns data on 200 success envelope', async () => {
    mockResponse(200, { success: true, data: { hello: 'world' }, error: null });
    const out = await fetchJson<{ hello: string }>('/api/x');
    expect(out.hello).toBe('world');
  });

  it('maps 402 INSUFFICIENT_CREDITS to a typed error with topupUrl', async () => {
    mockResponse(402, {
      success: false,
      data: null,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: 'Need 25 credits, have 5.',
        details: { required: 25, available: 5, feature: 'image.sdxl', topupUrl: '/billing/topup?suggested=100' },
      },
    });

    await expect(fetchJson('/api/ai/image')).rejects.toBeInstanceOf(InsufficientCreditsClientError);
    try {
      await fetchJson('/api/ai/image');
    } catch (err) {
      if (err instanceof InsufficientCreditsClientError) {
        expect(err.details.required).toBe(25);
        expect(err.details.available).toBe(5);
        expect(err.details.topupUrl).toContain('suggested=100');
      }
    }
  });

  it('maps 403 FORBIDDEN_BY_PLAN to a typed error with upgradeUrl', async () => {
    mockResponse(403, {
      success: false,
      data: null,
      error: {
        code: 'FORBIDDEN_BY_PLAN',
        message: "Plan 'free' does not include capability 'canExportPdf'.",
        details: { currentPlan: 'free', requiredPlan: 'pro', feature: 'canExportPdf', upgradeUrl: '/billing/upgrade?to=pro' },
      },
    });

    try {
      await fetchJson('/api/books/x/export-pdf');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanLockedClientError);
      if (err instanceof PlanLockedClientError) {
        expect(err.details.requiredPlan).toBe('pro');
        expect(err.details.upgradeUrl).toContain('to=pro');
      }
    }
  });

  it('falls back to a generic ApiError for other failures', async () => {
    mockResponse(500, {
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });

    try {
      await fetchJson('/api/x');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err).not.toBeInstanceOf(InsufficientCreditsClientError);
      expect(err).not.toBeInstanceOf(PlanLockedClientError);
      if (err instanceof ApiError) {
        expect(err.code).toBe('INTERNAL_ERROR');
        expect(err.status).toBe(500);
      }
    }
  });

  it('rejects on a 402 missing the required details shape', async () => {
    mockResponse(402, {
      success: false,
      data: null,
      error: { code: 'INSUFFICIENT_CREDITS', message: 'broken' }, // no details
    });

    try {
      await fetchJson('/api/x');
      expect.unreachable();
    } catch (err) {
      // Should fall back to ApiError, NOT crash trying to read missing fields
      expect(err).toBeInstanceOf(ApiError);
      expect(err).not.toBeInstanceOf(InsufficientCreditsClientError);
    }
  });
});
