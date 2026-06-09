/**
 * Hand a book-generation job to the background worker (BOOK-008).
 *
 * Mirrors `enqueueWhatsAppJob`:
 *   - Dev (no BOOK_GENERATE_BACKGROUND_URL): run inline — the dev server is
 *     long-lived, so fire-and-forget works and the whole flow is testable.
 *   - Prod: POST to the Netlify Background Function (15-min budget), token-gated.
 */

import type { BookGenerationJob } from './generateBookJob';

export async function enqueueBookGenerationJob(job: BookGenerationJob): Promise<void> {
  const backgroundUrl = process.env.BOOK_GENERATE_BACKGROUND_URL;

  if (!backgroundUrl) {
    // Local mode: fire-and-forget inline. The job records its own failures on
    // generation.status, so we only catch unexpected throws here.
    const { generateBookJob } = await import('./generateBookJob');
    void generateBookJob(job).catch((err) => {
      console.warn('[enqueueBookGenerationJob] inline handler error:', err);
    });
    return;
  }

  await fetch(backgroundUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': process.env.INTERNAL_FUNCTION_TOKEN ?? '',
    },
    body: JSON.stringify(job),
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    console.warn('[enqueueBookGenerationJob] enqueue error:', err);
  });
}
