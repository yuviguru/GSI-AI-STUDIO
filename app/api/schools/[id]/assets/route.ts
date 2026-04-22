import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  uploadSchoolAsset,
  deleteSchoolAsset,
  type SchoolAssetKind,
} from '@/lib/storage/schoolAssets';
import { invalidateSchoolBranding } from '@/lib/pdf/schoolBranding';

function assertSchoolAccess(schoolId: string, authSchoolId?: string) {
  if (!authSchoolId || authSchoolId !== schoolId) {
    throw new AppException(
      'FORBIDDEN',
      'You can only manage your own school.',
      403,
    );
  }
}

function parseKind(raw: FormDataEntryValue | string | null): SchoolAssetKind {
  const v = typeof raw === 'string' ? raw : '';
  if (v === 'logo' || v === 'letterhead') return v;
  throw new AppException('INVALID_INPUT', 'type must be "logo" or "letterhead".', 400);
}

/**
 * POST /api/schools/[id]/assets — upload a branding asset (logo or
 * letterhead). Expects multipart form data with fields `type` and `file`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const form = await request.formData();
    const kind = parseKind(form.get('type'));
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new AppException('INVALID_INPUT', 'Missing "file" upload.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadSchoolAsset(params.id, kind, buffer, file.type);
    invalidateSchoolBranding(params.id);
    return apiSuccess({ kind, url });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/schools/[id]/assets?type=logo|letterhead */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const kind = parseKind(new URL(request.url).searchParams.get('type'));
    await deleteSchoolAsset(params.id, kind);
    invalidateSchoolBranding(params.id);
    return apiSuccess({ kind, removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
