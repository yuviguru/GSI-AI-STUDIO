import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { AGENT_CATALOG } from '@/lib/ceo/agents/catalog';

/**
 * GET /api/ceo/agents/catalog
 *
 * Returns the static Kid CEO agent catalog. No auth needed — this is
 * product configuration, not kid-specific data. Safe to cache at the
 * edge.
 */
export async function GET(_request: NextRequest) {
  try {
    return apiSuccess({ agents: AGENT_CATALOG });
  } catch (error) {
    return handleApiError(error);
  }
}
