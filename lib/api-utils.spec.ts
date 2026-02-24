import { describe, it, expect, vi } from 'vitest';
import { AppException, handleApiError, apiSuccess } from './api-utils';

// Mock NextResponse.json
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

describe('AppException', () => {
  it('creates with code, message, and status', () => {
    const err = new AppException('RATE_LIMITED', 'Too fast', 429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toBe('Too fast');
    expect(err.statusCode).toBe(429);
  });

  it('defaults to status 500', () => {
    const err = new AppException('INTERNAL_ERROR', 'Something broke');
    expect(err.statusCode).toBe(500);
  });

  it('extends Error', () => {
    const err = new AppException('TEST', 'test');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name AppException', () => {
    const err = new AppException('TEST', 'test');
    expect(err.name).toBe('AppException');
  });
});

describe('handleApiError', () => {
  it('returns structured JSON for AppException', () => {
    const err = new AppException('RATE_LIMITED', 'Slow down', 429);
    const res = handleApiError(err) as unknown as { body: unknown; status: number };
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Slow down' },
    });
  });

  it('returns 500 for unknown errors', () => {
    const res = handleApiError(new Error('random')) as unknown as { body: unknown; status: number };
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });

  it('handles string errors', () => {
    const res = handleApiError('oops') as unknown as { body: unknown; status: number };
    expect(res.status).toBe(500);
  });
});

describe('apiSuccess', () => {
  it('wraps data in success envelope', () => {
    const res = apiSuccess({ foo: 'bar' }) as unknown as { body: unknown; status: number };
    expect(res.body).toEqual({
      success: true,
      data: { foo: 'bar' },
      error: null,
    });
    expect(res.status).toBe(200);
  });

  it('allows custom status code', () => {
    const res = apiSuccess({ id: '123' }, 201) as unknown as { body: unknown; status: number };
    expect(res.status).toBe(201);
  });
});
