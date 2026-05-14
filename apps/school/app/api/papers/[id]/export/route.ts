/**
 * GET /api/papers/[id]/export?variant=question|answer|blueprint
 *
 * Renders a school-branded PDF for one of three variants. Default is
 * the question paper. Reuses the school-branding pipeline so logo +
 * letterhead are picked up automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { getQuestionPaper } from '@gsi/firebase/questionPaperService';
import {
  getSchoolBranding,
  renderBrandedHeader,
} from '@/lib/pdf/schoolBranding';

type Variant = 'question' | 'answer' | 'blueprint';

function parseVariant(raw: string | null): Variant {
  if (raw === 'answer') return 'answer';
  if (raw === 'blueprint') return 'blueprint';
  return 'question';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    const paper = await getQuestionPaper(params.id);
    if (!paper) {
      throw new AppException('NOT_FOUND', 'Paper not found.', 404);
    }
    if (paper.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Not your school.', 403);
    }
    if (auth.role === 'teacher' && paper.teacherUid !== auth.userId) {
      throw new AppException('FORBIDDEN', 'Not your paper.', 403);
    }

    const variant = parseVariant(new URL(request.url).searchParams.get('variant'));
    const branding = await getSchoolBranding(paper.schoolId);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    renderBrandedHeader(doc, branding);

    const margin = 14;
    const pageW = doc.internal.pageSize.getWidth();
    const textW = pageW - margin * 2;
    let y = 36;

    doc.setFontSize(11);
    doc.setTextColor('#475569');
    doc.text(
      `${paper.subject} · Class ${paper.classGrade} · ${paper.totalMarks} marks · ${paper.durationMinutes} min`,
      margin,
      y,
    );
    y += 6;
    doc.setFontSize(13);
    doc.setTextColor('#0f172a');
    const titleByVariant: Record<Variant, string> = {
      question: 'Question Paper',
      answer: 'Answer Key',
      blueprint: 'Blueprint',
    };
    doc.text(titleByVariant[variant], margin, y);
    y += 8;

    if (variant === 'blueprint') {
      doc.setFontSize(11);
      doc.setTextColor('#0f172a');
      doc.text('Bloom\'s distribution (actual % of marks):', margin, y);
      y += 6;
      const pct = paper.draft.bloomsActualPct;
      for (const level of [
        'remember',
        'understand',
        'apply',
        'analyze',
        'evaluate',
        'create',
      ] as const) {
        const v = pct[level] ?? 0;
        doc.text(`${level}: ${v}%`, margin + 6, y);
        y += 5;
      }
      y += 4;
      doc.text(`Computed total: ${paper.draft.computedTotalMarks} marks`, margin, y);
      y += 6;
    } else {
      for (const section of paper.draft.sections) {
        if (y > 270) {
          doc.addPage();
          renderBrandedHeader(doc, branding);
          y = 40;
        }
        doc.setFontSize(12);
        doc.setTextColor(branding.primaryColor);
        doc.text(section.title, margin, y);
        y += 5;
        if (section.instructions) {
          doc.setFontSize(9);
          doc.setTextColor('#64748b');
          const wrapped = doc.splitTextToSize(section.instructions, textW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 4 + 3;
        }
        for (const q of section.questions) {
          if (y > 275) {
            doc.addPage();
            renderBrandedHeader(doc, branding);
            y = 40;
          }
          doc.setFontSize(10);
          doc.setTextColor('#0f172a');
          const head = `${q.id}. (${q.marks} mark${q.marks > 1 ? 's' : ''})`;
          doc.text(head, margin, y);
          y += 5;
          const body = doc.splitTextToSize(q.text, textW - 4);
          doc.text(body, margin + 4, y);
          y += body.length * 4 + 1;
          if (variant === 'answer' && q.answerKey) {
            doc.setTextColor('#0f5132');
            const ans = doc.splitTextToSize(`Ans: ${q.answerKey}`, textW - 4);
            doc.text(ans, margin + 4, y);
            doc.setTextColor('#0f172a');
            y += ans.length * 4 + 2;
          }
          y += 1;
        }
        y += 2;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.text(
      `${branding.schoolName} · GSI AI Studio · ${variant} variant`,
      margin,
      290,
    );

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="paper-${paper.id}-${variant}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
