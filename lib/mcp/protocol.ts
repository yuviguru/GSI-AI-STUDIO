/**
 * Minimal MCP (Model Context Protocol) protocol primitives.
 *
 * Implemented from the spec rather than via @modelcontextprotocol/sdk so we
 * have zero new dependencies. Covers the subset we need for stdio transport
 * + tools (no resources/prompts/sampling for v1).
 *
 * Spec: https://spec.modelcontextprotocol.io
 */

export const MCP_PROTOCOL_VERSION = '2025-06-18';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: number | string;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// ── Tool primitives ────────────────────────────────────────────

export interface McpTool {
  name: string;
  description: string;
  /** JSON Schema describing the tool's input. */
  inputSchema: object;
}

export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

export type McpContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; text?: string; mimeType?: string } };

// ── Standard error codes ──────────────────────────────────────

export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;
