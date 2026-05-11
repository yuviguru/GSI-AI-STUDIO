/**
 * INTEGRATION-001: GET / PUT a school's SIS integration config.
 *
 * Auth: schoolAdmin only. Calling user must be attached to the school in the
 * URL. Credentials live in secure storage; this endpoint stores only the
 * `credentialsRef` opaque pointer + the chosen provider id + the enabled flag.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  getErpIntegrationConfig,
  resolveProvider,
  saveErpIntegrationConfig,
  type SchoolDataProviderId,
} from '@/lib/integrations/schoolDataProvider';

const VALID_PROVIDERS: SchoolDataProviderId[] = [
  'local',
  'fedena',
  'mastersoft',
  'schoollog',
  'neverskip',
];

interface Params {
  params: Promise<{ id: string }>;
}

function assertSelf(authSchoolId: string | undefined, urlSchoolId: string) {
  if (!authSchoolId || authSchoolId !== urlSchoolId) {
    throw new AppException(
      'FORBIDDEN',
      'You can only manage integrations for your own school.',
      403,
    );
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    const { id } = await params;
    assertSelf(auth.schoolId, id);
    const config = await getErpIntegrationConfig(id);
    return apiSuccess({ config: config ?? { schoolId: id, provider: 'local', enabled: true } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    const { id } = await params;
    assertSelf(auth.schoolId, id);

    const body = (await request.json()) as Record<string, unknown>;
    const provider = body.provider as SchoolDataProviderId | undefined;
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      throw new AppException('INVALID_INPUT', 'Unknown provider.', 400);
    }
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;
    const credentialsRef =
      typeof body.credentialsRef === 'string' ? body.credentialsRef : undefined;

    const config = await saveErpIntegrationConfig({
      schoolId: id,
      provider,
      enabled,
      credentialsRef,
    });
    return apiSuccess({ config });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST = test the resolved provider's healthCheck. Does not modify state. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    const { id } = await params;
    assertSelf(auth.schoolId, id);
    const provider = await resolveProvider(id);
    const health = await provider.healthCheck();
    return apiSuccess({ health });
  } catch (error) {
    return handleApiError(error);
  }
}
