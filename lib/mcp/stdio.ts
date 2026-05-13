/**
 * MCP stdio transport — line-delimited JSON-RPC over stdin/stdout.
 *
 * Run via `tsx lib/mcp/bin.ts` or compiled to a binary. The Claude Desktop
 * config points at this script.
 */

import { dispatch, isNotification } from './server';
import type { JsonRpcRequest } from './protocol';

export async function runStdioServer(): Promise<void> {
  const lines: string[] = [];
  let buffer = '';

  // Stderr is the only safe place to log — stdout is reserved for protocol.
  const log = (msg: string) => process.stderr.write(`[mcp] ${msg}\n`);

  log('GSI AI Studio MCP server started (stdio)');

  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) lines.push(line);
    }
    void drain();
  });

  let processing = false;

  async function drain(): Promise<void> {
    if (processing) return;
    processing = true;
    while (lines.length > 0) {
      const line = lines.shift()!;
      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch (err) {
        log(`parse error: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      // Drop notifications — they never get a response.
      if (isNotification(msg)) continue;

      const response = await dispatch(msg as JsonRpcRequest);
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    processing = false;
  }

  process.stdin.on('end', () => {
    log('stdin closed, exiting');
    process.exit(0);
  });

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}
