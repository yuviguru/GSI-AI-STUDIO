'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { useBook } from '@/hooks/useBook';
import { useBookPages } from '@/hooks/useBookPages';
import { BUCKET_LAYOUTS } from '@/lib/templates/bookTemplates';
import type { PagePatchInput } from '@/lib/validators';
import { PageEditor } from '@/components/studios/book/PageEditor';
import { PageNavigator } from '@/components/studios/book/PageNavigator';
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

  if (isLoading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading your book…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/create/book" className="text-sm text-brand-purple underline">
          Back to library
        </Link>
      </div>
    );
  }

  const currentPage = pages.find((p) => p.id === currentPageId) ?? null;

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
          <Link
            href="/create/book"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-purple"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">My Books</span>
          </Link>

          <h1 className="line-clamp-1 flex-1 text-center text-base font-semibold text-gray-900">
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

      <PageNavigator
        pages={pages}
        currentPageId={currentPageId}
        pageLimit={book.pageLimit}
        onSelectPage={setCurrentPageId}
        onAppendPage={handleAppendPage}
        appendDisabled={pagesHook.busy}
      />

      <main className="mx-auto max-w-5xl px-3 py-4">
        {currentPage ? (
          <>
            <PageEditor
              book={book}
              page={currentPage}
              onSave={async (patch) => {
                const result = await pagesHook.patchPage(
                  currentPage.id,
                  patch as unknown as PagePatchInput
                );
                // null = the run() helper swallowed the error; surface it back
                // so the picture panel can show "Couldn't save" instead of
                // silently keeping the old image up.
                if (result === null) {
                  return { ok: false, error: pagesHook.error ?? undefined };
                }
                return { ok: true };
              }}
              onBookChange={async () => {
                await refresh();
              }}
              saving={pagesHook.busy}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleDeletePage}
                disabled={pages.length <= 1}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete this page
              </button>
              <button
                type="button"
                onClick={handleDeleteBook}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete whole book
              </button>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-sm text-gray-500">Setting up your book…</div>
        )}
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
