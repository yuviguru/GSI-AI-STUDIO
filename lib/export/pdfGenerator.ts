import type { QuizContent } from '@/types/creation.types';
import type { Book, BookPage } from '@/types/book.types';

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

// ── Book Studio PDF generator ───────────────────────────────────

/** Convert a hex color to a [r,g,b] tuple. Falls back to white on bad input. */
function hexToRgb(hex: string | null | undefined): [number, number, number] {
  if (!hex) return [255, 255, 255];
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

/**
 * Generate a printable PDF for a kid-authored book.
 * Layout follows the page's `layout` field. Renders plainText (TipTap rich
 * formatting is preserved in `richText` but PDF rendering uses the flat
 * plainText for v1 — full rich-text rendering is a v1.1 enhancement).
 */
export async function generateBookPdf(book: Book, pages: BookPage[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const widthMm = book.dimensions.widthMm;
  const heightMm = book.dimensions.heightMm;
  const orientation = widthMm > heightMm ? 'landscape' : 'portrait';
  const pageMargin = Math.max(8, Math.round(Math.min(widthMm, heightMm) * 0.06));
  const contentWidth = widthMm - pageMargin * 2;
  const contentHeight = heightMm - pageMargin * 2;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  // ── Cover page ──
  const [bgR, bgG, bgB] = hexToRgb(book.cover.backgroundColor);
  doc.setFillColor(bgR, bgG, bgB);
  doc.rect(0, 0, widthMm, heightMm, 'F');

  // Optional cover image (full bleed top half)
  if (book.cover.imageUrl) {
    const dataUrl = await loadImageAsDataUrl(book.cover.imageUrl);
    if (dataUrl) {
      const imgH = heightMm * 0.55;
      doc.addImage(dataUrl, 'JPEG', 0, 0, widthMm, imgH);
    }
  }

  // Cover title
  doc.setFontSize(28);
  doc.setTextColor('#FFFFFF');
  const titleY = book.cover.imageUrl ? heightMm * 0.7 : heightMm * 0.4;
  const coverTitleLines = wrapText(doc, book.cover.title || book.title, contentWidth);
  coverTitleLines.forEach((line, i) => {
    doc.text(line, widthMm / 2, titleY + i * 12, { align: 'center' });
  });

  // Cover subtitle
  if (book.cover.subtitle) {
    doc.setFontSize(14);
    doc.text(book.cover.subtitle, widthMm / 2, titleY + coverTitleLines.length * 12 + 8, {
      align: 'center',
    });
  }

  // Author byline at bottom
  doc.setFontSize(12);
  doc.setTextColor('#FFFFFF');
  doc.text(
    `By ${book.cover.authorName || book.author}`,
    widthMm / 2,
    heightMm - pageMargin,
    { align: 'center' }
  );

  // ── Body pages ──
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  for (const page of sortedPages) {
    doc.addPage([widthMm, heightMm], orientation);

    // White background for body pages
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, widthMm, heightMm, 'F');

    const isFullBleed = page.layout === 'image_full_bleed' || page.layout === 'gallery';
    const isImageTop =
      page.layout === 'image_top_text_bottom' || page.layout === 'concept_letter';
    const isTextOnly = page.layout === 'text_only' || page.layout === 'entry_centered';
    const isCentered = page.layout === 'entry_centered';

    let imageDataUrl: string | null = null;
    if (page.imageUrl && !isTextOnly) {
      imageDataUrl = await loadImageAsDataUrl(page.imageUrl);
    }

    if (isFullBleed && imageDataUrl) {
      doc.addImage(imageDataUrl, 'JPEG', 0, 0, widthMm, heightMm);
      // Optional caption overlay at bottom
      if (page.plainText) {
        doc.setFillColor(0, 0, 0);
        doc.rect(0, heightMm - 18, widthMm, 18, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(11);
        const captionLines = wrapText(doc, page.plainText, contentWidth);
        doc.text(captionLines.slice(0, 2).join(' '), widthMm / 2, heightMm - 9, {
          align: 'center',
        });
      }
      continue;
    }

    let yPos = pageMargin;

    // Image (if any, half page)
    if (imageDataUrl && !isTextOnly) {
      const imgHeight = contentHeight * 0.5;
      if (isImageTop) {
        doc.addImage(imageDataUrl, 'JPEG', pageMargin, yPos, contentWidth, imgHeight);
        yPos += imgHeight + 6;
      }
    }

    // Text
    const fontSize = page.style?.fontSize ?? 13;
    doc.setFontSize(fontSize);
    const [tR, tG, tB] = hexToRgb(page.style?.textColor ?? '#1F2937');
    doc.setTextColor(tR, tG, tB);

    const textAlign = page.style?.alignment ?? (isCentered ? 'center' : 'left');
    const lineHeight = fontSize * 0.5;

    const textLines = wrapText(doc, page.plainText || ' ', contentWidth);
    if (isCentered && isTextOnly) {
      // Vertical center the text block
      const blockHeight = textLines.length * lineHeight;
      yPos = (heightMm - blockHeight) / 2;
    }

    for (const line of textLines) {
      if (yPos + lineHeight > heightMm - pageMargin) break;
      const x =
        textAlign === 'center'
          ? widthMm / 2
          : textAlign === 'right'
            ? widthMm - pageMargin
            : pageMargin;
      doc.text(line, x, yPos, { align: textAlign as 'left' | 'center' | 'right' });
      yPos += lineHeight;
    }

    // Image at bottom if not yet drawn
    if (imageDataUrl && !isImageTop && !isTextOnly) {
      const imgHeight = contentHeight * 0.45;
      const imgY = heightMm - pageMargin - imgHeight;
      if (imgY > yPos + 4) {
        doc.addImage(imageDataUrl, 'JPEG', pageMargin, imgY, contentWidth, imgHeight);
      }
    }

    // Page number footer
    doc.setFontSize(9);
    doc.setTextColor(BRAND_GRAY);
    doc.text(`${page.pageNumber}`, widthMm / 2, heightMm - 4, { align: 'center' });
  }

  // ── Back cover (optional) ──
  if (book.backCover && (book.backCover.text || book.backCover.imageUrl)) {
    doc.addPage([widthMm, heightMm], orientation);
    const [bcR, bcG, bcB] = hexToRgb(book.cover.backgroundColor);
    doc.setFillColor(bcR, bcG, bcB);
    doc.rect(0, 0, widthMm, heightMm, 'F');

    if (book.backCover.imageUrl) {
      const dataUrl = await loadImageAsDataUrl(book.backCover.imageUrl);
      if (dataUrl) {
        doc.addImage(dataUrl, 'JPEG', pageMargin, pageMargin, contentWidth, contentHeight * 0.5);
      }
    }

    if (book.backCover.text) {
      doc.setFontSize(12);
      doc.setTextColor('#FFFFFF');
      const lines = wrapText(doc, book.backCover.text, contentWidth);
      lines.forEach((line, i) => {
        doc.text(line, widthMm / 2, heightMm * 0.7 + i * 6, { align: 'center' });
      });
    }
  }

  // ── Branding page ──
  doc.addPage([widthMm, heightMm], orientation);
  doc.setFillColor('#F9FAFB');
  doc.rect(0, 0, widthMm, heightMm, 'F');
  doc.setFontSize(16);
  doc.setTextColor(BRAND_PURPLE);
  doc.text(BRANDING_TEXT, widthMm / 2, heightMm / 2, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(BRAND_GRAY);
  doc.text(
    'gsi-ai-studio.netlify.app',
    widthMm / 2,
    heightMm / 2 + 8,
    { align: 'center' }
  );

  return doc.output('blob');
}
