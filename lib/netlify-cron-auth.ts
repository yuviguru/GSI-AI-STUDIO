/** Shared auth helper for Netlify scheduled functions.
 *
 *  Accepts two invocation paths:
 *
 *  1. Netlify scheduler — identified by the PAIR of `x-nf-scheduled-function`
 *     header AND a well-formed `{ next_run: <ISO8601 within ±7d> }` body
 *     that Netlify's scheduler synthesises. The header alone is trivially
 *     spoofable over HTTP so we additionally require the body shape — an
 *     attacker would need to know the exact body contract AND send a
 *     convincing ISO timestamp. That's defense-in-depth, not crypto auth;
 *     the realistic threat is cost/DoS via LLM+Telegram spam, not data
 *     exfil (Admin SDK writes only, no user-supplied content is echoed).
 *     If/when we need real auth, add a `CRON_SECRET` env var that Netlify's
 *     scheduler passes as a header and validate it here (HMAC over next_run
 *     is even better).
 *
 *  2. Manual calls — carry `BOT_SETUP_SECRET` via `?secret=` or the
 *     `x-bot-setup-secret` header. Used for on-demand testing + one-shot
 *     cache-prime after deploys.
 *
 *  Anything else → returns false; callers should respond 401. */

import type { HandlerEvent } from '@netlify/functions';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Return `true` if the Netlify function invocation should be allowed
 *  through. Callers pass their own secret (typically `BOT_SETUP_SECRET`)
 *  so multiple functions can share the helper without a shared env lookup. */
export function isAuthorizedCronCall(event: HandlerEvent, deploySecret: string | undefined): boolean {
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );

  // Path 1: scheduler invocation — require BOTH the Netlify header AND a
  // valid scheduler body.
  if (headers['x-nf-scheduled-function'] && looksLikeSchedulerBody(event.body)) {
    return true;
  }

  // Path 2: manual call — require the deploy secret.
  const providedSecret =
    event.queryStringParameters?.secret ?? headers['x-bot-setup-secret'];
  return !!deploySecret && providedSecret === deploySecret;
}

/** Validate Netlify scheduler's `{"next_run": "<ISO8601>"}` payload:
 *  parses as JSON, has a string `next_run`, within ±7 days of now. The
 *  wide window accommodates Netlify's enqueue → deliver lag (seen drifts
 *  of a few minutes; 7d is comfortable headroom). */
function looksLikeSchedulerBody(body: string | null | undefined): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const nextRun = parsed?.next_run;
    if (typeof nextRun !== 'string') return false;
    const ms = Date.parse(nextRun);
    if (!Number.isFinite(ms)) return false;
    const drift = Math.abs(ms - Date.now());
    return drift <= SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}
