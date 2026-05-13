#!/usr/bin/env node
/**
 * MCP server entry point.
 *
 * Usage:
 *   tsx lib/mcp/bin.ts           # stdio (for Claude Desktop)
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "gsi": {
 *         "command": "tsx",
 *         "args": ["<absolute path to>/lib/mcp/bin.ts"],
 *         "env": {
 *           "ANTHROPIC_API_KEY": "...",
 *           "GROQ_API_KEY": "...",
 *           "PIXAZO_API_KEY": "...",
 *           "FIREBASE_CLIENT_EMAIL": "...",
 *           "FIREBASE_PRIVATE_KEY": "...",
 *           "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "..."
 *         }
 *       }
 *     }
 *   }
 */

import { runStdioServer } from './stdio';

runStdioServer().catch((err) => {
  process.stderr.write(`[mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
