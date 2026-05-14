/**
 * COMMS-002: persisted PTM notes — patch (status / body) and delete.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { getClass } from '@gsi/firebase/schoolService';
import type { AuthContext } from '@gsi/types';
import {
  deletePtmNote,
  getPtmNote,
  updatePtmNote,
  type PtmNoteDoc,
  type PtmNoteStatus,
} from '@gsi/firebase/ptmNotesService';

const ALLOWED_STATUSES: PtmNoteStatus[] = ['draft', 'sent', 'acknowledged'];

interface Params {
  params: Promise<{ id: string }>;
}

/** Teachers can only touch notes for classes they own; schoolAdmins are exempt. */
async function assertNoteAccess(auth: AuthContext, note: PtmNoteDoc) {
  if (auth.schoolId !== note.schoolId) {
    throw new AppException('FORBIDDEN', 'Note belongs to another school.', 403);
  }
  if (auth.role === 'schoolAdmin') return;
  const cls = await getClass(note.schoolId, note.classId);
  if (!cls || cls.teacherUid !== auth.userId) {
    throw new AppException(
      'FORBIDDEN',
      "Teachers can only access PTM notes for their own classes.",
      403,
    );
  }
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

    // Fetch + authorize FIRST so a foreign note can't be mutated and only
    // then get a 403 (the bug Codex flagged on r3237140763).
    const existing = await getPtmNote(id);
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    await assertNoteAccess(auth, existing);

    const result = await updatePtmNote(id, auth.schoolId, patch);
    if (result.status === 'not_found') {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    if (result.status === 'forbidden') {
      // Defence in depth — the schoolId scope check inside the service.
      throw new AppException('FORBIDDEN', 'Note belongs to another school.', 403);
    }
    return apiSuccess({ note: result.note });
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

    const existing = await getPtmNote(id);
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    await assertNoteAccess(auth, existing);

    const ok = await deletePtmNote(id, auth.schoolId);
    if (!ok) {
      throw new AppException('NOT_FOUND', 'Note not found.', 404);
    }
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
