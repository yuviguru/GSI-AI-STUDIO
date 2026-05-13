/**
 * Phase 4 (COMPLIANCE-001): compliance report v2.
 *
 * Wraps the v1 builder for the existing CBSE AI-CT sections and appends
 * the DPDP-specific pages: data-processing register, teacher AI usage
 * summary, consent snapshot, erasure request log. v1 stays available
 * for back-compat — the route picks via `?version=2`.
 */

import jsPDF from 'jspdf';
import {
  buildComplianceReport,
  type ComplianceReportInput,
} from './complianceReport';
import type { ConsentScope } from '@gsi/types';
import type { ErasureRequest } from '@gsi/types';
import type { AiGenerator } from '@/lib/firebase/teacherAiUsageService';

const A4_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const BRAND_PURPLE = '#7C3AED';
const BRAND_TEXT = '#1F2937';
const BRAND_GRAY = '#6B7280';

function ensureSpace(doc: jsPDF, y: number, min = 40): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - min) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}
function sectionHeader(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(BRAND_PURPLE);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(BRAND_PURPLE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 1.5, MARGIN + CONTENT_WIDTH, y + 1.5);
  return y + 7;
}
function kv(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_GRAY);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_TEXT);
  doc.text(value, MARGIN + 55, y);
  return y + 6;
}
function paragraph(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    y = ensureSpace(doc, y);
    doc.text(line, MARGIN, y);
    y += 5;
  }
  return y + 2;
}
function tableRow(
  doc: jsPDF,
  cols: Array<{ text: string; width: number; bold?: boolean }>,
  y: number,
): number {
  y = ensureSpace(doc, y, 12);
  let x = MARGIN;
  for (const c of cols) {
    doc.setFont('helvetica', c.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(c.bold ? BRAND_PURPLE : BRAND_TEXT);
    const lines = doc.splitTextToSize(c.text, c.width - 2);
    doc.text(lines, x, y);
    x += c.width;
  }
  return y + 5.5;
}

const DATA_REGISTER: Array<{
  category: string;
  fields: string;
  purpose: string;
  retention: string;
  legalBasis: string;
}> = [
  {
    category: 'Identity (kid)',
    fields: 'Name, age, grade, board, avatar',
    purpose: 'Personalize learning + display',
    retention: 'Until parent revokes consent or requests erasure',
    legalBasis: 'Verifiable parental consent (DPDP s.9)',
  },
  {
    category: 'Identity (parent)',
    fields: 'Phone, optional email, optional name',
    purpose: 'Account auth + comms',
    retention: 'Account lifetime + 30 days post-deletion',
    legalBasis: 'Contract performance (DPDP s.7(a))',
  },
  {
    category: 'Creations',
    fields: 'Story / quiz / game / music / comic content',
    purpose: 'Display in account + class feed (if shared)',
    retention: 'Account lifetime; erased on request within 30 days',
    legalBasis: 'data_storage consent',
  },
  {
    category: 'AI prompts',
    fields: 'Inputs sent to Claude / image / audio APIs',
    purpose: 'Generate creations + traceability',
    retention: '90 days, then aggregated only',
    legalBasis: 'ai_generation consent',
  },
  {
    category: 'Submissions + feedback',
    fields: 'Per-assignment submission, teacher notes, AI suggestions',
    purpose: 'Curriculum tracking + HPC narratives',
    retention: 'Term + 1 academic year',
    legalBasis: 'data_storage consent',
  },
  {
    category: 'Concept progress',
    fields: 'aiConceptsTaught[], badges, AI points, streaks',
    purpose: 'Progress reporting + analytics',
    retention: 'Account lifetime',
    legalBasis: 'analytics consent',
  },
  {
    category: 'Communications',
    fields: 'Telegram / WhatsApp template sends + delivery receipts',
    purpose: 'Parent updates',
    retention: 'commsLog retained 12 months',
    legalBasis: 'parent_messaging consent',
  },
];

const GENERATOR_LABELS: Record<AiGenerator, string> = {
  hpc: 'HPC narratives',
  questionPaper: 'Question papers',
  feedback: 'Submission feedback',
  lessonPlan: 'Lesson plans',
  ptm: 'PTM notes',
  digest: 'Parent digests',
  adhoc: 'Ad-hoc messages',
  subInstructions: 'Substitute instructions',
};

export interface DpdpReportData {
  consentSnapshot: {
    kidsTotal: number;
    consentCounts: Partial<Record<ConsentScope, number>>;
  };
  teacherAiUsage: Array<{
    generator: AiGenerator;
    last30Days: number;
    last12Months: number;
  }>;
  erasureRequests: Array<
    Pick<ErasureRequest, 'id' | 'status' | 'createdAt' | 'completedAt'>
  >;
}

export interface ComplianceReportV2Input extends ComplianceReportInput {
  dpdp: DpdpReportData;
}

export function buildComplianceReportV2(
  input: ComplianceReportV2Input,
): jsPDF {
  const doc = buildComplianceReport(input);
  doc.addPage();
  let y = MARGIN;

  // ── DPDP register ──
  y = sectionHeader(doc, 'DPDP Data-Processing Register', y);
  y = paragraph(
    doc,
    'India\'s Digital Personal Data Protection Act 2023 requires every processor to maintain a record of personal data categories, their purpose, retention, and legal basis. This register is generated from the live data model.',
    y,
  );

  for (const row of DATA_REGISTER) {
    y = ensureSpace(doc, y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(BRAND_PURPLE);
    doc.text(row.category, MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_TEXT);
    y = paragraph(doc, `Fields: ${row.fields}`, y);
    y = paragraph(doc, `Purpose: ${row.purpose}`, y);
    y = paragraph(doc, `Retention: ${row.retention}`, y);
    y = paragraph(doc, `Legal basis: ${row.legalBasis}`, y);
    y += 1;
  }

  // ── Consent snapshot ──
  y = sectionHeader(doc, 'Consent Snapshot', y);
  y = kv(doc, 'Kids on roster', String(input.dpdp.consentSnapshot.kidsTotal), y);
  for (const [scope, count] of Object.entries(
    input.dpdp.consentSnapshot.consentCounts,
  )) {
    const label = (scope as ConsentScope).replace(/_/g, ' ');
    y = kv(doc, `Granted "${label}"`, String(count ?? 0), y);
  }
  y += 2;

  // ── Teacher AI usage ──
  y = sectionHeader(doc, 'Teacher AI Usage Summary', y);
  y = tableRow(
    doc,
    [
      { text: 'Generator', width: 70, bold: true },
      { text: 'Last 30 days', width: 35, bold: true },
      { text: 'Last 12 months', width: 35, bold: true },
    ],
    y,
  );
  for (const u of input.dpdp.teacherAiUsage) {
    y = tableRow(
      doc,
      [
        { text: GENERATOR_LABELS[u.generator] ?? u.generator, width: 70 },
        { text: String(u.last30Days), width: 35 },
        { text: String(u.last12Months), width: 35 },
      ],
      y,
    );
  }
  y += 2;

  // ── Erasure log ──
  y = sectionHeader(doc, 'Right-to-Erasure Request Log', y);
  if (input.dpdp.erasureRequests.length === 0) {
    y = paragraph(doc, 'No erasure requests in the reporting period.', y);
  } else {
    y = tableRow(
      doc,
      [
        { text: 'Request ID', width: 60, bold: true },
        { text: 'Status', width: 30, bold: true },
        { text: 'Created', width: 35, bold: true },
        { text: 'Completed', width: 35, bold: true },
      ],
      y,
    );
    for (const r of input.dpdp.erasureRequests) {
      y = tableRow(
        doc,
        [
          { text: r.id.slice(0, 12), width: 60 },
          { text: r.status, width: 30 },
          { text: r.createdAt.toLocaleDateString(), width: 35 },
          {
            text: r.completedAt ? r.completedAt.toLocaleDateString() : '—',
            width: 35,
          },
        ],
        y,
      );
    }
  }

  return doc;
}
