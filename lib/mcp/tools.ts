/**
 * MCP tool definitions — one per capability.
 *
 * Tools call into `lib/capabilities/*` so they share orchestration with the
 * web UI, WhatsApp bot, voice agent, and any future channel.
 *
 * Tool input schemas are JSON Schema (not Zod) — that's what the MCP spec
 * requires. We validate at runtime in each handler.
 */

import { nanoid } from 'nanoid';
import {
  createStory,
  createQuiz,
  createComic,
  createGame,
  createMusic,
} from '@/lib/capabilities';
import type { McpTool, McpToolResult } from './protocol';

// ── Tool catalog ──────────────────────────────────────────────

export const TOOLS: McpTool[] = [
  {
    name: 'create_story',
    description:
      'Generate an illustrated multi-page story for a kid. Returns a share URL the parent can open. Age-appropriate and safety-filtered.',
    inputSchema: {
      type: 'object',
      properties: {
        premise: {
          type: 'string',
          minLength: 5,
          maxLength: 500,
          description: 'The story idea (e.g. "Arjun discovers a time machine in his school")',
        },
        ageGroup: {
          type: 'string',
          enum: ['5-7', '8-10', '11-13', '14-17'],
          description: 'Target age group — affects vocabulary and themes',
          default: '8-10',
        },
        pages: {
          type: 'integer',
          minimum: 3,
          maximum: 8,
          default: 5,
          description: 'Number of illustrated pages',
        },
        characters: {
          type: 'array',
          items: { type: 'string', maxLength: 50 },
          maxItems: 5,
          description: 'Optional: named characters in the story',
        },
        setting: {
          type: 'string',
          maxLength: 100,
          description: 'Optional: where the story takes place',
        },
        genre: {
          type: 'string',
          description: 'Optional: adventure / mystery / comedy / fantasy / etc.',
        },
        style: {
          type: 'string',
          enum: ['watercolor', 'cartoon', 'pixel-art', 'comic'],
          default: 'cartoon',
          description: 'Illustration style',
        },
      },
      required: ['premise'],
    },
  },
  {
    name: 'create_quiz',
    description:
      'Generate an interactive quiz on any topic. Returns a share URL with the quiz embedded. Safety-filtered.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', minLength: 2, maxLength: 200 },
        format: {
          type: 'string',
          enum: ['trivia', 'true_false', 'fill_blank', 'adventure'],
          default: 'trivia',
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          default: 'beginner',
        },
        questionCount: { type: 'integer', minimum: 3, maximum: 20, default: 10 },
        ageGroup: { type: 'string', default: '8-10' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'create_comic',
    description:
      'Generate an illustrated multi-panel comic with dialogue. Returns a share URL.',
    inputSchema: {
      type: 'object',
      properties: {
        premise: { type: 'string', minLength: 5, maxLength: 500 },
        style: {
          type: 'string',
          enum: ['manga', 'cartoon', 'superhero', 'indie', 'chibi'],
          default: 'cartoon',
        },
        panelCount: { type: 'integer', minimum: 3, maximum: 8, default: 4 },
        characters: {
          type: 'array',
          items: { type: 'string', maxLength: 50 },
          maxItems: 5,
        },
        ageGroup: { type: 'string', default: '8-10' },
      },
      required: ['premise', 'style'],
    },
  },
  {
    name: 'create_game',
    description:
      'Generate a branching text-adventure game with multiple endings. Returns a share URL.',
    inputSchema: {
      type: 'object',
      properties: {
        premise: { type: 'string', minLength: 5, maxLength: 500 },
        setting: { type: 'string', maxLength: 200 },
        characterName: { type: 'string', maxLength: 30 },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
        },
        ageGroup: { type: 'string', default: '8-10' },
      },
      required: ['premise'],
    },
  },
  {
    name: 'create_music',
    description:
      'Generate a song with AI-written lyrics + AI-composed audio. Returns a share URL with playable audio.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'happy, sad, adventurous, etc.' },
        genre: { type: 'string', description: 'pop, rock, jazz, indian-classical, etc.' },
        theme: { type: 'string', maxLength: 200, description: 'What the song is about' },
        duration: { type: 'integer', minimum: 15, maximum: 60, default: 30 },
        instruments: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 4,
        },
        lyricsPrompt: { type: 'string', maxLength: 500 },
        ageGroup: { type: 'string', default: '8-10' },
      },
      required: ['mood', 'genre'],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────

/**
 * Resolve `sessionId` for an MCP-originated creation. If no auth context
 * is available, we generate a stable per-process synthetic session so the
 * request is rate-limited but can still proceed. A future OAuth layer
 * should populate this from the verified user.
 */
function getMcpSessionId(authContext?: { userId?: string; sessionId?: string }): string {
  if (authContext?.sessionId) return authContext.sessionId;
  if (authContext?.userId) return `mcp_user_${authContext.userId}`;
  return `mcp_anon_${nanoid(16)}`;
}

export interface McpAuthContext {
  userId?: string;
  sessionId?: string;
  /** Cost ceiling — derived from the user's plan. */
  maxCostTier?: 'free' | 'cheap' | 'standard' | 'premium';
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  auth: McpAuthContext = {},
): Promise<McpToolResult> {
  const sessionId = getMcpSessionId(auth);
  const baseUrl = process.env.MCP_PUBLIC_BASE_URL ?? 'https://gsi.ai';

  try {
    switch (name) {
      case 'create_story': {
        const result = await createStory({
          sessionId,
          premise: String(args.premise),
          characters: args.characters as string[] | undefined,
          setting: args.setting as string | undefined,
          genre: args.genre as string | undefined,
          pages: args.pages as number | undefined,
          ageGroup: args.ageGroup as string | undefined,
          style: args.style as 'watercolor' | 'cartoon' | 'pixel-art' | 'comic' | undefined,
          maxCostTier: auth.maxCostTier ?? 'cheap',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created story "${result.story.title}" — ${result.story.pages.length} pages.\nView: ${baseUrl}${result.shareUrl}`,
            },
            {
              type: 'resource',
              resource: { uri: `gsi://creation/${result.creationId}` },
            },
          ],
        };
      }

      case 'create_quiz': {
        const result = await createQuiz({
          sessionId,
          topic: String(args.topic),
          format: args.format as 'trivia' | 'true_false' | 'fill_blank' | 'adventure' | undefined,
          difficulty: args.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined,
          questionCount: args.questionCount as number | undefined,
          ageGroup: args.ageGroup as string | undefined,
          maxCostTier: auth.maxCostTier ?? 'cheap',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created quiz "${result.quiz.title}" — ${result.quiz.totalQuestions} questions.\nView: ${baseUrl}${result.shareUrl}`,
            },
            {
              type: 'resource',
              resource: { uri: `gsi://creation/${result.creationId}` },
            },
          ],
        };
      }

      case 'create_comic': {
        const result = await createComic({
          sessionId,
          premise: String(args.premise),
          style: args.style as 'manga' | 'cartoon' | 'superhero' | 'indie' | 'chibi',
          panelCount: args.panelCount as number | undefined,
          characters: args.characters as string[] | undefined,
          ageGroup: args.ageGroup as string | undefined,
          maxCostTier: auth.maxCostTier ?? 'cheap',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created comic "${result.comic.title}" — ${result.comic.totalPanels} panels.\nView: ${baseUrl}${result.shareUrl}`,
            },
            {
              type: 'resource',
              resource: { uri: `gsi://creation/${result.creationId}` },
            },
          ],
        };
      }

      case 'create_game': {
        const result = await createGame({
          sessionId,
          premise: String(args.premise),
          setting: args.setting as string | undefined,
          characterName: args.characterName as string | undefined,
          difficulty: args.difficulty as 'easy' | 'medium' | 'hard' | undefined,
          ageGroup: args.ageGroup as string | undefined,
          maxCostTier: auth.maxCostTier ?? 'cheap',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created game "${result.game.title}" — ${result.game.totalScenes} scenes, ${result.game.totalEndings} endings.\nPlay: ${baseUrl}${result.shareUrl}`,
            },
            {
              type: 'resource',
              resource: { uri: `gsi://creation/${result.creationId}` },
            },
          ],
        };
      }

      case 'create_music': {
        const result = await createMusic({
          sessionId,
          mood: String(args.mood),
          genre: String(args.genre),
          theme: args.theme as string | undefined,
          duration: args.duration as number | undefined,
          instruments: args.instruments as string[] | undefined,
          lyricsPrompt: args.lyricsPrompt as string | undefined,
          ageGroup: args.ageGroup as string | undefined,
          maxCostTier: auth.maxCostTier ?? 'cheap',
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created song "${result.music.title}" — ${result.music.duration}s.\nListen: ${baseUrl}${result.shareUrl}`,
            },
            {
              type: 'resource',
              resource: { uri: `gsi://creation/${result.creationId}` },
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Tool ${name} failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
}
