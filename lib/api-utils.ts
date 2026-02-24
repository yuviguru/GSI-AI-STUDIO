import { NextResponse } from 'next/server';

export class AppException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppException';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppException) {
    return NextResponse.json(
      { success: false, data: null, error: { code: error.code, message: error.message } },
      { status: error.statusCode }
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
