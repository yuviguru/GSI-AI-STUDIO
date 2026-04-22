import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  saveErpIntegration,
  removeErpIntegration,
} from '@/lib/firebase/erpIntegrationService';
import '@/lib/integrations'; // ensure adapters register
import {
  getErpIntegrationConfig,
  resolveProvider,
  type SchoolDataProviderId,
} from '@/lib/integrations/schoolDataProvider';

function requireSchoolId(schoolId: string | undefined): asserts schoolId is string {
  if (!schoolId) {
    throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
  }
}

/** GET /api/integrations/erp — current config + live health. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    requireSchoolId(auth.schoolId);

    const config = await getErpIntegrationConfig(auth.schoolId);
    const provider = await resolveProvider(auth.schoolId);
    const health = await provider.healthCheck();

    return apiSuccess({ config, health });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/integrations/erp — save provider + credentials ref. */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    requireSchoolId(auth.schoolId);

    const body = (await request.json()) as {
      provider?: SchoolDataProviderId;
      credentialsRef?: string;
      enabled?: boolean;
    };
    if (!body.provider) {
      throw new AppException('INVALID_INPUT', 'provider is required.', 400);
    }

    const config = await saveErpIntegration({
      schoolId: auth.schoolId,
      provider: body.provider,
      credentialsRef: body.credentialsRef,
      enabled: body.enabled,
    });

    return apiSuccess({ config });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/integrations/erp — remove config (falls back to local). */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    requireSchoolId(auth.schoolId);
    await removeErpIntegration(auth.schoolId);
    return apiSuccess({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
