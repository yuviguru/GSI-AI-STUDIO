/**
 * COMMS-002: persisted PTM notes — patch (status / body) and delete.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  deletePtmNote,
  updatePtmNote,
  type PtmNoteStatus,
} from '@/lib/firebase/ptmNotesService';

const ALLOWED_STATUSES: PtmNoteStatus[] = ['draft', 'sent', 'acknowledged'];

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const patch: { body?: string; status?: PtmNoteStatus } = {};
    if (typeof body.body === 'string') patch.body = body.body;
    if (typeof body.status === 'string' && ALLOWED_STATUSES.includes(body.status as PtmNoteStatus)) {
      patch.status = body.status as PtmNoteStatus;
    }

    if (Object.keys(patch).length === 0) {
      throw new AppException('INVALID_INPUT', 'No supported fields to update.', 400);
    }

    const note = await updatePtmNote(id, patch);
    if (!note) {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    if (note.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Note belongs to another school.', 403);
    }
    return apiSuccess({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const { id } = await params;
    const ok = await deletePtmNote(id, auth.schoolId);
    if (!ok) {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
