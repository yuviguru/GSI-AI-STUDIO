/**
 * COMMS-001: GET /api/schools/kids
 *
 * Lists every kid in the requesting teacher/schoolAdmin's school, joined with
 * the class name and parent-link status. Used by the Parent Digests page so
 * the school admin can pick recipients without drilling into each class.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { listClassesForSchool } from '@gsi/firebase/schoolService';

const KIDS = 'kids';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    const classes = await listClassesForSchool(auth.schoolId);
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));

    const snap = await adminDb
      .collection(KIDS)
      .where('schoolId', '==', auth.schoolId)
      .limit(500)
      .get();

    const kids = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      // Kid memberships live in `classIds: string[]` (set by joinClassByCode +
      // the seeder). The legacy singular `classId` field never gets populated,
      // so reading it left every student tagged "Unassigned class". Codex
      // r3237140779. Surface the first class for the picker — the schema
      // allows multi-class but the digest UI only needs one label.
      const classIds = Array.isArray(data.classIds) ? (data.classIds as string[]) : [];
      const primaryClassId = classIds[0];
      return {
        id: d.id,
        name: (data.name as string) ?? 'Student',
        classId: primaryClassId,
        className: primaryClassId ? classNameById.get(primaryClassId) : undefined,
        parentLinked: typeof data.parentId === 'string' && data.parentId.length > 0,
      };
    });

    kids.sort((a, b) => a.name.localeCompare(b.name));
    return apiSuccess({ kids });
  } catch (error) {
    return handleApiError(error);
  }
}
