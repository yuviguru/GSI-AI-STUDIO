/**
 * Thin client helper that parses the api-utils response envelope and
 * raises typed errors for the billing-specific HTTP codes so callers
 * can render upgrade / topup CTAs instead of generic "Something went
 * wrong" messages.
 *
 * Server response shape (see lib/api-utils.ts):
 *   { success: true, data: T, error: null }
 *   { success: false, data: null, error: { code, message, details? } }
 *
 * Typed errors:
 *   - InsufficientCreditsError (402 INSUFFICIENT_CREDITS) →
 *     `error.details = { required, available, feature, topupUrl }`
 *   - PlanLockedError (403 FORBIDDEN_BY_PLAN) →
 *     `error.details = { currentPlan, requiredPlan, feature, upgradeUrl }`
 *
 * Other failures surface as a generic ApiError carrying the server's
 * `code` + `message`.
 */

export interface InsufficientCreditsDetails {
  required: number;
  available: number;
  feature?: string;
  topupUrl: string;
}

export interface PlanLockedDetails {
  currentPlan: string;
  requiredPlan: string | null;
  feature: string;
  upgradeUrl: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class InsufficientCreditsClientError extends ApiError {
  declare readonly details: InsufficientCreditsDetails;
  constructor(message: string, details: InsufficientCreditsDetails) {
    super('INSUFFICIENT_CREDITS', message, 402, details);
    this.name = 'InsufficientCreditsClientError';
    this.details = details;
  }
}

export class PlanLockedClientError extends ApiError {
  declare readonly details: PlanLockedDetails;
  constructor(message: string, details: PlanLockedDetails) {
    super('FORBIDDEN_BY_PLAN', message, 403, details);
    this.name = 'PlanLockedClientError';
    this.details = details;
  }
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
}

/**
 * POST/GET/etc. and parse the api-utils envelope.
 *
 *   try {
 *     const story = await fetchJson<StoryResponse>('/api/ai/story', { method: 'POST', body });
 *   } catch (err) {
 *     if (err instanceof InsufficientCreditsClientError) {
 *       openTopupModal(err.details);
 *       return;
 *     }
 *     if (err instanceof PlanLockedClientError) {
 *       openUpgradeModal(err.details);
 *       return;
 *     }
 *     showError(err.message);
 *   }
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);

  let envelope: ApiResponseEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiResponseEnvelope<T>;
  } catch {
    // Body wasn't JSON (e.g. 204 No Content, or HTML error page from a proxy).
    if (!res.ok) {
      throw new ApiError('NETWORK_ERROR', `Request failed with status ${res.status}`, res.status);
    }
    return undefined as T;
  }

  if (res.ok && envelope?.success) return envelope.data as T;

  const code = envelope?.error?.code ?? 'UNKNOWN';
  const message = envelope?.error?.message ?? `Request failed with status ${res.status}`;
  const details = envelope?.error?.details;

  if (res.status === 402 && code === 'INSUFFICIENT_CREDITS' && isInsufficientCreditsDetails(details)) {
    throw new InsufficientCreditsClientError(message, details);
  }
  if (res.status === 403 && code === 'FORBIDDEN_BY_PLAN' && isPlanLockedDetails(details)) {
    throw new PlanLockedClientError(message, details);
  }

  throw new ApiError(code, message, res.status, details);
}

function isInsufficientCreditsDetails(d: unknown): d is InsufficientCreditsDetails {
  return (
    typeof d === 'object' &&
    d !== null &&
    'required' in d &&
    'available' in d &&
    'topupUrl' in d
  );
}

function isPlanLockedDetails(d: unknown): d is PlanLockedDetails {
  return typeof d === 'object' && d !== null && 'currentPlan' in d && 'upgradeUrl' in d;
}
