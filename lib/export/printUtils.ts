/** Minimal story shape needed for printing — accepts full StoryContent or the viewer subset */
interface PrintableStory {
  title: string;
  genre: string;
  pages: Array<{ text: string; imageUrl: string; pageNumber: number }>;
}

/**
 * Opens the browser print dialog with a formatted story layout.
 * Creates a hidden iframe with print-optimized styles, triggers window.print(),
 * then removes the iframe.
 */
export function printStory(story: PrintableStory): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const pagesHtml = story.pages
    .map(
      (page) => `
      <div class="story-page">
        ${
          page.imageUrl
            ? `<img src="${page.imageUrl}" alt="Story illustration" class="story-image" />`
            : ''
        }
        <p class="story-text">${page.text}</p>
        <div class="page-number">Page ${page.pageNumber} of ${story.pages.length}</div>
      </div>
    `
    )
    .join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${story.title} - GSI AI Studio</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1F2937;
            line-height: 1.6;
          }

          .title-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 40px;
          }

          .title-page h1 {
            font-size: 32px;
            color: #7C3AED;
            margin-bottom: 12px;
          }

          .title-page .genre {
            font-size: 16px;
            color: #6B7280;
            text-transform: capitalize;
          }

          .title-page .branding {
            margin-top: 40px;
            font-size: 12px;
            color: #9CA3AF;
          }

          .story-page {
            page-break-before: always;
            padding: 40px;
            min-height: 100vh;
          }

          .story-image {
            width: 100%;
            max-height: 50vh;
            object-fit: contain;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .story-text {
            font-size: 16px;
            line-height: 1.8;
            text-align: justify;
          }

          .page-number {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #9CA3AF;
          }

          @media print {
            .story-page { page-break-before: always; }
            .title-page { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="title-page">
          <h1>${story.title}</h1>
          <div class="genre">${story.genre}</div>
          <div class="branding">Made with GSI AI Studio</div>
        </div>
        ${pagesHtml}
      </body>
    </html>
  `);
  doc.close();

  // Wait for images to load before printing
  const images = doc.querySelectorAll('img');
  const imagePromises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      })
  );

  Promise.all(imagePromises).then(() => {
    iframe.contentWindow?.print();
    // Clean up after a delay to allow the print dialog to open
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  });
}
