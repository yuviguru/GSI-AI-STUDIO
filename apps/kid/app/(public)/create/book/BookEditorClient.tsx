'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Image as ImageIcon, Upload } from 'lucide-react';
import { useBook } from '@/hooks/useBook';
import { useBookPages } from '@/hooks/useBookPages';
import { BUCKET_LAYOUTS } from '@/lib/templates/bookTemplates';
import type { PagePatchInput } from '@/lib/validators';
import { EditableBook } from '@/components/studios/book/EditableBook';
import { CoverDesigner } from '@/components/studios/book/CoverDesigner';
import { FlipbookPreview } from '@/components/studios/book/FlipbookPreview';
import { PublishModal } from '@/components/studios/book/PublishModal';

interface BookEditorClientProps {
  bookId: string;
}

export function BookEditorClient({ bookId }: BookEditorClientProps) {
  const router = useRouter();
  const {
    book,
    pages,
    isLoading,
    notFound,
    error,
    actionLoading,
    deleteBook,
    publishBook,
    exportPdf,
    refresh,
  } = useBook(bookId);

  const pagesHook = useBookPages(bookId, refresh);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  // Auto-select first page on load. If no pages, append one.
  useEffect(() => {
    if (!book) return;
    if (pages.length === 0) {
      const layout = BUCKET_LAYOUTS[book.bucket][0]!;
      void pagesHook.appendPage({ layout });
      return;
    }
    if (!currentPageId || !pages.find((p) => p.id === currentPageId)) {
      setCurrentPageId(pages[0]!.id);
    }
  }, [book, pages, currentPageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (notFound) {
      router.replace('/create/book');
    }
  }, [notFound, router]);

  // Error first — when SWR's fetch fails, isLoading flips back to false and
  // book is null. The previous order (loading-or-no-book → loading) trapped
  // session/auth/network failures on an infinite "Loading…" screen.
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">📕</div>
        <p className="text-sm font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  if (isLoading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading your book…
      </div>
    );
  }

  const handleAppendPage = async () => {
    const layout = BUCKET_LAYOUTS[book.bucket][0]!;
    const result = await pagesHook.appendPage({ layout });
    if (result?.page) {
      setCurrentPageId(result.page.id);
    }
  };

  const handleDeletePage = async () => {
    if (!currentPageId) return;
    if (pages.length <= 1) {
      alert('A book needs at least one page!');
      return;
    }
    if (!confirm('Delete this page? This can\'t be undone.')) return;
    await pagesHook.deletePage(currentPageId);
    setCurrentPageId(null);
  };

  const handleDeleteBook = async () => {
    if (!confirm('Delete the whole book? This can\'t be undone.')) return;
    const result = await deleteBook();
    if (result) router.replace('/create/book');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <h1 className="line-clamp-1 flex-1 text-base font-semibold text-gray-900">
            {book.title}
          </h1>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCoverOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              aria-label="Edit cover"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Cover</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              aria-label="Preview book"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white shadow-button hover:bg-brand-purple/90"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">
                {book.status === 'published' ? 'Share' : 'Publish'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-5">
        <EditableBook
          book={book}
          pages={pages}
          currentPageId={currentPageId}
          onSelectPage={setCurrentPageId}
          onSave={async (patch) => {
            if (!currentPageId) return { ok: false, error: 'No page selected' };
            const result = await pagesHook.patchPage(
              currentPageId,
              patch as unknown as PagePatchInput
            );
            // null = the run() helper swallowed the error; surface it so the
            // editor can show "Couldn't save" instead of silently keeping the
            // old text/image up.
            if (result === null) {
              return { ok: false, error: pagesHook.error ?? undefined };
            }
            return { ok: true };
          }}
          onAppendPage={handleAppendPage}
          onDeletePage={handleDeletePage}
          onBookChange={async () => {
            await refresh();
          }}
          saving={pagesHook.busy}
        />

        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <button
            type="button"
            onClick={handleDeleteBook}
            disabled={actionLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            Delete whole book
          </button>
        </div>
      </main>

      {coverOpen && <CoverDesigner bookId={bookId} onClose={() => setCoverOpen(false)} />}
      {previewOpen && (
        <FlipbookPreview book={book} pages={pages} onClose={() => setPreviewOpen(false)} />
      )}
      {publishOpen && (
        <PublishModal
          book={book}
          onPublish={async (isPublic) => {
            const r = await publishBook(isPublic);
            return r ? { shareUrl: r.shareUrl, pdfUrl: r.pdfUrl } : null;
          }}
          onExportPdf={async () => {
            const r = await exportPdf();
            return r ? { pdfUrl: r.pdfUrl } : null;
          }}
          onClose={() => setPublishOpen(false)}
        />
      )}
    </div>
  );
}
