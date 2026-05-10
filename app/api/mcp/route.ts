/**
 * POST /api/mcp — HTTP transport for the MCP server.
 *
 * Single-request streamable HTTP transport (a subset of the MCP HTTP spec).
 * Authenticates via Bearer token (TODO: full OAuth flow). For pilot, treat
 * the token as the user's session ID — same auth as the web app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatch, isNotification } from '@/lib/mcp/server';
import type { JsonRpcRequest } from '@/lib/mcp/protocol';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      },
      { status: 400 },
    );
  }

  if (isNotification(body)) {
    // Acknowledged — no response body for notifications.
    return new NextResponse(null, { status: 204 });
  }

  // Auth — for v1 we treat the bearer token as the user's session ID.
  // A future iteration should verify it against the AuthProvider port.
  const auth = request.headers.get('authorization');
  const sessionId = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;

  const response = await dispatch(body as JsonRpcRequest, {
    auth: { sessionId, maxCostTier: 'cheap' },
  });

  return NextResponse.json(response);
}

export async function GET() {
  // Some MCP clients probe with GET first.
  return NextResponse.json({
    name: 'gsi-ai-studio',
    transport: 'http',
    endpoint: '/api/mcp',
    methods: ['POST'],
  });
}
