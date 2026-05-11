/**
 * Capability layer — channel-neutral business operations.
 *
 * Every channel (web UI, MCP server, voice agent, WhatsApp bot, email
 * scheduler) calls these instead of duplicating orchestration logic.
 *
 * Each capability:
 *   - Pure function (no HTTP, no Next.js)
 *   - Self-contained orchestration (LLM + image + storage + persist)
 *   - Returns a typed result with creationId, shareUrl, content, telemetry
 *   - Wraps execution in `usageTracker.withContext` for cost tagging
 */

export { createStory } from './createStory';
export type { CreateStoryInput, CreateStoryResult } from './createStory';

export { createQuiz } from './createQuiz';
export type { CreateQuizInput, CreateQuizResult } from './createQuiz';

export { createComic } from './createComic';
export type { CreateComicInput, CreateComicResult } from './createComic';

export { createGame } from './createGame';
export type { CreateGameInput, CreateGameResult } from './createGame';

export { createMusic } from './createMusic';
export type { CreateMusicInput, CreateMusicResult } from './createMusic';
