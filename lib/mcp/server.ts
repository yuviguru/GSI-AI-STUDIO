/**
 * MCP server core — transport-agnostic JSON-RPC dispatcher.
 *
 * Implements the subset of MCP we need:
 *   - initialize / initialized handshake
 *   - tools/list and tools/call
 *
 * Transports (stdio, HTTP) wrap this with input/output framing.
 */

import { TOOLS, executeTool, type McpAuthContext } from './tools';
import {
  ErrorCode,
  MCP_PROTOCOL_VERSION,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcSuccessResponse,
  type JsonRpcErrorResponse,
} from './protocol';

export interface ServerInfo {
  name: string;
  version: string;
}

export interface ServerCapabilities {
  tools: { listChanged?: boolean };
}

const DEFAULT_SERVER_INFO: ServerInfo = {
  name: 'gsi-ai-studio',
  version: '0.1.0',
};

const DEFAULT_CAPABILITIES: ServerCapabilities = {
  tools: { listChanged: false },
};

export interface DispatchOptions {
  /** Auth context derived from the transport (e.g. OAuth bearer token in HTTP). */
  auth?: McpAuthContext;
}

/**
 * Process a single JSON-RPC request and return a response.
 *
 * Notifications (no `id`) are not handled here — transports should drop
 * them. The only one MCP standardly sends is `notifications/initialized`,
 * which is informational.
 */
export async function dispatch(
  request: JsonRpcRequest,
  opts: DispatchOptions = {},
): Promise<JsonRpcResponse> {
  try {
    switch (request.method) {
      case 'initialize': {
        return success(request.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: DEFAULT_CAPABILITIES,
          serverInfo: DEFAULT_SERVER_INFO,
        });
      }

      case 'ping': {
        return success(request.id, {});
      }

      case 'tools/list': {
        return success(request.id, { tools: TOOLS });
      }

      case 'tools/call': {
        const params = (request.params ?? {}) as {
          name?: string;
          arguments?: Record<string, unknown>;
        };
        if (!params.name) {
          return error(request.id, ErrorCode.InvalidParams, "Missing 'name' parameter");
        }
        const tool = TOOLS.find((t) => t.name === params.name);
        if (!tool) {
          return error(
            request.id,
            ErrorCode.InvalidParams,
            `Unknown tool: ${params.name}`,
          );
        }
        const result = await executeTool(
          params.name,
          params.arguments ?? {},
          opts.auth ?? {},
        );
        return success(request.id, result);
      }

      // Optional MCP methods we don't support yet — return MethodNotFound
      // rather than a fake empty list so clients fall back gracefully.
      case 'resources/list':
      case 'resources/read':
      case 'prompts/list':
      case 'prompts/get':
        return error(
          request.id,
          ErrorCode.MethodNotFound,
          `Method '${request.method}' not implemented yet`,
        );

      default:
        return error(
          request.id,
          ErrorCode.MethodNotFound,
          `Unknown method: ${request.method}`,
        );
    }
  } catch (err) {
    return error(
      request.id,
      ErrorCode.InternalError,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function success(id: number | string, result: unknown): JsonRpcSuccessResponse {
  return { jsonrpc: '2.0', id, result };
}

function error(
  id: number | string | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

/** True if `msg` looks like a notification (no id). Notifications never get a response. */
export function isNotification(msg: unknown): boolean {
  if (typeof msg !== 'object' || msg === null) return false;
  return !('id' in msg);
}
