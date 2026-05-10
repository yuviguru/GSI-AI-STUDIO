/**
 * POST /api/mcp — HTTP transport for the MCP server.
 *
 * Auth: Bearer token = Firebase ID token. Verified via backend.auth.verifyToken.
 * Without a valid token the route returns 401 — never silently accepts the
 * token-as-session-ID shortcut.
 *
 * Set MCP_HTTP_ENABLED=true to enable. Defaults to disabled until an OAuth
 * flow is wired up (the bearer-token-as-Firebase-ID-token flow above is
 * acceptable for trusted first-party clients but not for general public
 * MCP discovery).
 *
 * Timeout: tool calls (story creation = 20-40s) need more than the 10s
 * Next.js default. maxDuration = 60 raises the lambda ceiling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatch, isNotification } from '@/lib/mcp/server';
import { backend } from '@/lib/backend';
import type { JsonRpcRequest } from '@/lib/mcp/protocol';
import type { CostTier } from '@/lib/ai/ports';

export const maxDuration = 60;

function isEnabled(): boolean {
  return process.env.MCP_HTTP_ENABLED === 'true';
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: 'MCP HTTP transport disabled. Set MCP_HTTP_ENABLED=true to enable.' },
      { status: 404 },
    );
  }

  // 1. Parse body (we need it before auth so we can return JSON-RPC notifications).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 },
    );
  }

  if (isNotification(body)) {
    // Notifications are server-bound; nothing to authenticate or respond.
    return new NextResponse(null, { status: 204 });
  }

  // 2. Authenticate. Bearer token must be a valid Firebase ID token.
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: (body as { id?: unknown }).id ?? null,
        error: { code: -32001, message: 'Missing or malformed Authorization header' },
      },
      { status: 401 },
    );
  }
  const token = authHeader.slice('Bearer '.length);

  let userId: string;
  let costTier: CostTier;
  try {
    const user = await backend.auth.verifyToken(token);
    userId = user.id;
    // Map plan → cost tier. Default to 'cheap' for unknown plans.
    const plan = (user.customClaims?.plan as string | undefined) ?? 'free';
    costTier = planToCostTier(plan);
  } catch (err) {
    console.warn('[mcp/http] auth failed:', err);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: (body as { id?: unknown }).id ?? null,
        error: { code: -32001, message: 'Invalid or expired token' },
      },
      { status: 401 },
    );
  }

  // 3. Dispatch under the authenticated user's identity.
  const response = await dispatch(body as JsonRpcRequest, {
    auth: {
      sessionId: `user_${userId}`, // bucket creations under the verified user
      userId,
      maxCostTier: costTier,
    },
  });

  return NextResponse.json(response);
}

export async function GET() {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  return NextResponse.json({
    name: 'gsi-ai-studio',
    transport: 'http',
    endpoint: '/api/mcp',
    methods: ['POST'],
    auth: 'Bearer <Firebase ID token>',
  });
}

function planToCostTier(plan: string): CostTier {
  switch (plan) {
    case 'pro':
      return 'premium';
    case 'creator':
      return 'standard';
    case 'free':
    default:
      return 'cheap';
  }
}
