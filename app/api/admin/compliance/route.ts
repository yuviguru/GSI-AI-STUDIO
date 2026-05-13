import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import {
  getSchool,
  listClassesForSchool,
} from '@/lib/firebase/schoolService';
import { buildComplianceReport } from '@/lib/export/complianceReport';
import { buildComplianceReportV2 } from '@/lib/export/complianceReportV2';
import {
  getConsentSnapshotForSchool,
  getTeacherAiUsageRollup,
  listErasureRequestsForSchool,
} from '@/lib/firebase/complianceQueryService';
import type {
  AssignmentDoc,
  SubmissionDoc,
  ClassDoc,
} from '@gsi/types';

/**
 * GET /api/admin/compliance?start=...&end=...
 * Streams a CBSE AI compliance PDF for the caller's school.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'No school attached.', 403);
    }

    const url = new URL(request.url);
    const version = url.searchParams.get('version') === '2' ? 2 : 1;
    const startStr = url.searchParams.get('start');
    const endStr = url.searchParams.get('end');
    const dateRange = startStr && endStr
      ? { start: new Date(startStr), end: new Date(endStr) }
      : undefined;

    const school = await getSchool(auth.schoolId);
    if (!school) throw new AppException('NOT_FOUND', 'School not found.', 404);

    const classes = await listClassesForSchool(auth.schoolId);

    const assignmentsSnap = await adminDb
      .collection('assignments')
      .where('schoolId', '==', auth.schoolId)
      .get();
    const assignments: AssignmentDoc[] = assignmentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        ...(data as AssignmentDoc),
        dueDate: data.dueDate?.toDate?.() ?? new Date(),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      } as AssignmentDoc;
    });

    const submissionsSnap = await adminDb
      .collection('submissions')
      .where('schoolId', '==', auth.schoolId)
      .get();
    const submissions: SubmissionDoc[] = submissionsSnap.docs.map((d) => {
      const data = d.data();
      return {
        ...(data as SubmissionDoc),
        submittedAt: data.submittedAt?.toDate?.() ?? new Date(),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        reviewedAt: data.reviewedAt?.toDate?.(),
      } as SubmissionDoc;
    });

    // Pre-filter by date range if provided
    const filteredAssignments = dateRange
      ? assignments.filter(
          (a) =>
            a.createdAt >= dateRange.start && a.createdAt <= dateRange.end,
        )
      : assignments;
    const filteredSubmissions = dateRange
      ? submissions.filter(
          (s) =>
            s.submittedAt >= dateRange.start && s.submittedAt <= dateRange.end,
        )
      : submissions;

    // Students across all classes in the school
    const kidIds = Array.from(
      new Set(classes.flatMap((c: ClassDoc) => c.studentKidIds ?? [])),
    );
    const students: {
      id: string;
      name: string;
      grade?: string;
      totalCreations: number;
      conceptsLearned: string[];
    }[] = [];
    for (let i = 0; i < kidIds.length; i += 30) {
      const chunk = kidIds.slice(i, i + 30);
      if (chunk.length === 0) continue;
      const snap = await adminDb
        .collection('kids')
        .where('__name__', 'in', chunk)
        .get();
      for (const k of snap.docs) {
        const data = k.data();
        students.push({
          id: k.id,
          name: (data.name as string) ?? 'Student',
          grade: data.grade as string | undefined,
          totalCreations: (data.totalCreations as number) ?? 0,
          conceptsLearned: (data.conceptsLearned as string[]) ?? [],
        });
      }
    }

    const baseInput = {
      school,
      classes,
      assignments: filteredAssignments,
      submissions: filteredSubmissions,
      students,
      dateRange,
    };

    const doc =
      version === 2
        ? buildComplianceReportV2({
            ...baseInput,
            dpdp: {
              consentSnapshot: await getConsentSnapshotForSchool(auth.schoolId),
              teacherAiUsage: await getTeacherAiUsageRollup(auth.schoolId),
              erasureRequests: await listErasureRequestsForSchool(auth.schoolId),
            },
          })
        : buildComplianceReport(baseInput);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const versionTag = version === 2 ? 'v2' : 'v1';
    const filename = `compliance-${versionTag}-${school.schoolCode || school.id}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
