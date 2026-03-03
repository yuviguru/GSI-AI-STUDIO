import type { QuizContent } from '@/types/creation.types';

/** Minimal story shape needed for PDF generation */
interface PdfStory {
  title: string;
  genre: string;
  pages: Array<{ text: string; imageUrl: string; pageNumber: number }>;
}

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const BRAND_PURPLE = '#7C3AED';
const BRAND_CYAN = '#06B6D4';
const BRAND_TEXT = '#1F2937';
const BRAND_GRAY = '#6B7280';
const BRANDING_TEXT = 'Made with GSI AI Studio';

/**
 * Load an image URL as a base64 data URL for embedding in the PDF.
 * Returns null if the image cannot be loaded.
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Wrap text into lines that fit within the given max width.
 * Uses jsPDF's getStringUnitWidth to measure text.
 */
function wrapText(
  doc: import('jspdf').jsPDF,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth =
        (doc.getStringUnitWidth(testLine) * doc.getFontSize()) /
        doc.internal.scaleFactor;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate a PDF for a story with illustrations.
 * Layout: title page, then one page per story page with image + text.
 * Final page has "Made with GSI AI Studio" branding.
 */
export async function generateStoryPdf(
  story: PdfStory
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Title page ──
  doc.setFillColor(BRAND_PURPLE);
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFontSize(32);
  const titleLines = wrapText(doc, story.title, CONTENT_WIDTH);
  const titleStartY = A4_HEIGHT / 2 - titleLines.length * 14;
  titleLines.forEach((line, i) => {
    doc.text(line, A4_WIDTH / 2, titleStartY + i * 14, { align: 'center' });
  });

  doc.setFontSize(14);
  doc.text(story.genre, A4_WIDTH / 2, titleStartY + titleLines.length * 14 + 10, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setTextColor('#E5E7EB');
  doc.text(BRANDING_TEXT, A4_WIDTH / 2, A4_HEIGHT - 20, { align: 'center' });

  // ── Story pages ──
  for (const page of story.pages) {
    doc.addPage();

    let yPos = MARGIN;

    // Page number header
    doc.setFontSize(10);
    doc.setTextColor(BRAND_GRAY);
    doc.text(
      `Page ${page.pageNumber} of ${story.pages.length}`,
      A4_WIDTH / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 10;

    // Image
    if (page.imageUrl) {
      const dataUrl = await loadImageAsDataUrl(page.imageUrl);
      if (dataUrl) {
        const imgWidth = CONTENT_WIDTH;
        const imgHeight = imgWidth * 0.6; // 5:3 aspect ratio
        doc.addImage(dataUrl, 'JPEG', MARGIN, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 8;
      }
    }

    // Story text
    doc.setFontSize(13);
    doc.setTextColor(BRAND_TEXT);
    const textLines = wrapText(doc, page.text, CONTENT_WIDTH);
    const lineHeight = 6.5;

    for (const line of textLines) {
      if (yPos + lineHeight > A4_HEIGHT - MARGIN) {
        doc.addPage();
        yPos = MARGIN;
      }
      doc.text(line, MARGIN, yPos);
      yPos += lineHeight;
    }
  }

  // ── Branding page ──
  doc.addPage();
  doc.setFillColor('#F9FAFB');
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');

  doc.setFontSize(20);
  doc.setTextColor(BRAND_PURPLE);
  doc.text(BRANDING_TEXT, A4_WIDTH / 2, A4_HEIGHT / 2 - 10, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(BRAND_GRAY);
  doc.text(
    'Create your own AI-powered stories at gsi-ai-studio.netlify.app',
    A4_WIDTH / 2,
    A4_HEIGHT / 2 + 5,
    { align: 'center' }
  );

  return doc.output('blob');
}

/**
 * Generate a printable PDF for a quiz with questions and answer key.
 * Layout: title + topic info, numbered questions with options, answer key on last page.
 */
export async function generateQuizPdf(
  quiz: QuizContent & { title: string }
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Title section ──
  doc.setFillColor(BRAND_CYAN);
  doc.rect(0, 0, A4_WIDTH, 60, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFontSize(24);
  const titleLines = wrapText(doc, quiz.title, CONTENT_WIDTH);
  titleLines.forEach((line, i) => {
    doc.text(line, A4_WIDTH / 2, 25 + i * 10, { align: 'center' });
  });

  doc.setFontSize(12);
  doc.text(
    `${quiz.topic} | ${quiz.difficulty} | ${quiz.totalQuestions} Questions`,
    A4_WIDTH / 2,
    48,
    { align: 'center' }
  );

  let yPos = 75;

  // ── Questions ──
  doc.setTextColor(BRAND_TEXT);

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]!;

    // Check if we need a new page
    const estimatedHeight = 30 + q.options.length * 8;
    if (yPos + estimatedHeight > A4_HEIGHT - MARGIN) {
      doc.addPage();
      yPos = MARGIN;
    }

    // Question number + text
    doc.setFontSize(13);
    doc.setTextColor(BRAND_CYAN);
    doc.text(`Q${i + 1}.`, MARGIN, yPos);

    doc.setTextColor(BRAND_TEXT);
    const qLines = wrapText(doc, q.question, CONTENT_WIDTH - 15);
    qLines.forEach((line, li) => {
      doc.text(line, MARGIN + 15, yPos + li * 6);
    });
    yPos += qLines.length * 6 + 4;

    // Options
    doc.setFontSize(11);
    const optionLabels = ['A', 'B', 'C', 'D'];
    for (let j = 0; j < q.options.length; j++) {
      if (yPos + 7 > A4_HEIGHT - MARGIN) {
        doc.addPage();
        yPos = MARGIN;
      }

      doc.setTextColor(BRAND_GRAY);
      doc.text(`${optionLabels[j]})`, MARGIN + 8, yPos);

      doc.setTextColor(BRAND_TEXT);
      const optLines = wrapText(doc, q.options[j]!, CONTENT_WIDTH - 25);
      optLines.forEach((line, li) => {
        doc.text(line, MARGIN + 20, yPos + li * 5.5);
      });
      yPos += optLines.length * 5.5 + 2;
    }

    yPos += 8; // gap between questions
  }

  // ── Answer key page ──
  doc.addPage();
  doc.setFillColor('#F0FDFA');
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');

  doc.setFontSize(20);
  doc.setTextColor(BRAND_CYAN);
  doc.text('Answer Key', A4_WIDTH / 2, 30, { align: 'center' });

  yPos = 50;
  doc.setFontSize(12);

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]!;

    if (yPos + 20 > A4_HEIGHT - MARGIN) {
      doc.addPage();
      doc.setFillColor('#F0FDFA');
      doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, 'F');
      yPos = MARGIN;
    }

    // Question number + answer
    doc.setTextColor(BRAND_CYAN);
    doc.text(`Q${i + 1}:`, MARGIN, yPos);

    doc.setTextColor(BRAND_TEXT);
    doc.text(q.answer, MARGIN + 15, yPos);
    yPos += 7;

    // Explanation
    doc.setFontSize(10);
    doc.setTextColor(BRAND_GRAY);
    const explLines = wrapText(doc, q.explanation, CONTENT_WIDTH - 15);
    explLines.forEach((line, li) => {
      doc.text(line, MARGIN + 15, yPos + li * 5);
    });
    yPos += explLines.length * 5 + 8;
    doc.setFontSize(12);
  }

  // Branding
  doc.setFontSize(10);
  doc.setTextColor(BRAND_GRAY);
  doc.text(BRANDING_TEXT, A4_WIDTH / 2, A4_HEIGHT - 15, { align: 'center' });

  return doc.output('blob');
}
