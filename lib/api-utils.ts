import { NextResponse } from 'next/server';

export class AppException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    /**
     * Optional structured payload. Mirrors the `error.details` field
     * documented in `docs/api-contracts.md` — used by 402/403 billing
     * errors to ship upgrade/topup CTAs alongside the message.
     * Free-form on purpose; the client picks what it understands.
     */
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppException';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppException) {
    const errorBody: { code: string; message: string; details?: Record<string, unknown> } = {
      code: error.code,
      message: error.message,
    };
    if (error.details) errorBody.details = error.details;
    return NextResponse.json(
      { success: false, data: null, error: errorBody },
      { status: error.statusCode },
    );
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    },
    { status: 500 }
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data, error: null }, { status });
}
