'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { useBookPages } from '@/hooks/useBookPages';
import { useKidProfile } from '@/hooks/useKidProfile';
import { BUCKET_LAYOUTS } from '@/lib/templates/bookTemplates';
import type { BookPatchInput, PagePatchInput } from '@/lib/validators';
import { EditableBook } from '@/components/studios/book/EditableBook';
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
    updateCover,
    patchBook,
    refresh,
  } = useBook(bookId);

  const pagesHook = useBookPages(bookId, refresh);
  const { activeKid, refreshKids } = useKidProfile();
  const { getIdToken } = useAuth();
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  // Freshest backCover across the back-cover editor's two-step save (text save
  // → author save). The `book` closure goes stale between the two PATCHes;
  // without this, the author-photo patch would resurrect the pre-save bio.
  const latestBackCoverRef = useRef(book?.backCover ?? null);
  useEffect(() => {
    latestBackCoverRef.current = book?.backCover ?? null;
  }, [book?.backCover]);

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

  // BOOK-010 — give every book the kid's name + photo by default. Books are
  // created as "Anonymous Author" with no author photo; backfill them once from
  // the active profile so the published book + PDF show the real author. Still
  // overridable per-book in the cover / back-cover editor.
  const authorBackfilledRef = useRef(false);
  useEffect(() => {
    if (authorBackfilledRef.current || !book || !activeKid) return;
    // Prefer the kid's REAL author identity (BOOK-011) when they've set one;
    // otherwise fall back to the play profile (name + generated avatar).
    const kidName = (activeKid.authorName ?? activeKid.name)?.trim();
    const preferredPhoto = activeKid.authorPhotoUrl ?? activeKid.avatarUrl;
    const kidPhoto =
      preferredPhoto && /^https?:\/\//.test(preferredPhoto) ? preferredPhoto : null;
    const needsName =
      !!kidName && (!book.author || book.author.trim().toLowerCase() === 'anonymous author');
    const needsPhoto = !!kidPhoto && !book.backCover?.authorPhotoUrl;
    authorBackfilledRef.current = true;
    if (!needsName && !needsPhoto) return;
    const patch: BookPatchInput = {};
    if (needsName) patch.author = kidName;
    if (needsPhoto) {
      patch.backCover = {
        text: book.backCover?.text ?? '',
        imageUrl: book.backCover?.imageUrl ?? null,
        authorBio: book.backCover?.authorBio ?? null,
        authorPhotoUrl: kidPhoto,
      };
    }
    void patchBook(patch);
  }, [book, activeKid, patchBook]);

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
    <div className="min-h-full bg-gradient-to-b from-indigo-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <h1 className="line-clamp-1 flex-1 text-base font-semibold text-gray-900">
            {book.title}
          </h1>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDeleteBook}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              aria-label="Delete book"
              title="Delete this book"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete Book</span>
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
          onSaveCover={async (patch) => {
            // The cover endpoint does a partial merge, so we send ONLY the
            // changed fields. (Re-sending the stored imagePrompt would trip the
            // 500-char cap, since AI covers carry the long assembled scene
            // prompt.)
            const r = await updateCover(patch);
            return r ? { ok: true } : { ok: false, error: 'Could not save the cover.' };
          }}
          onSaveBackCover={async (patch) => {
            const b = latestBackCoverRef.current ?? book.backCover;
            const next = {
              text: patch.text !== undefined ? patch.text : (b?.text ?? ''),
              imageUrl: b?.imageUrl ?? null,
              authorBio: patch.authorBio !== undefined ? patch.authorBio : (b?.authorBio ?? null),
              authorPhotoUrl: b?.authorPhotoUrl ?? null,
            };
            const r = await patchBook({ backCover: next });
            if (r) latestBackCoverRef.current = r.backCover ?? next;
            return r ? { ok: true } : { ok: false, error: 'Could not save the back cover.' };
          }}
          onSaveAuthor={
            activeKid
              ? async ({ name, photoBase64, photoContentType }) => {
                  try {
                    const token = await getIdToken();
                    if (!token) return { ok: false, error: 'Please sign in again to save.' };

                    // 1) Real photo → upload + persist on the kid profile, then
                    //    stamp the returned URL on THIS book's back cover.
                    if (photoBase64 && photoContentType) {
                      const res = await fetch(`/api/users/kids/${activeKid.id}/author-photo`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ imageBase64: photoBase64, contentType: photoContentType }),
                      });
                      const json = await res.json();
                      if (!json.success) {
                        return {
                          ok: false,
                          error: json.error?.message ?? 'Could not upload your photo.',
                        };
                      }
                      const url = json.data.url as string;
                      const b = latestBackCoverRef.current ?? book.backCover;
                      const next = {
                        text: b?.text ?? '',
                        imageUrl: b?.imageUrl ?? null,
                        authorBio: b?.authorBio ?? null,
                        authorPhotoUrl: url,
                      };
                      const r = await patchBook({ backCover: next });
                      if (r) latestBackCoverRef.current = r.backCover ?? next;
                    }

                    // 2) Real name → this book + the kid profile (default for
                    //    all future books).
                    if (name) {
                      await patchBook({ author: name });
                      await fetch(`/api/users/kids/${activeKid.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ authorName: name }),
                      });
                    }

                    await refreshKids();
                    return { ok: true };
                  } catch {
                    return { ok: false, error: 'Could not save your author details.' };
                  }
                }
              : undefined
          }
          hasRealAuthorIdentity={!!(activeKid?.authorName || activeKid?.authorPhotoUrl)}
          onAppendPage={handleAppendPage}
          onDeletePage={handleDeletePage}
          onBookChange={async () => {
            await refresh();
          }}
          saving={pagesHook.busy}
          defaultAuthorName={activeKid?.authorName ?? activeKid?.name}
          defaultAuthorPhoto={activeKid?.authorPhotoUrl ?? activeKid?.avatarUrl}
        />
      </main>

      {publishOpen && (
        <PublishModal
          book={book}
          pages={pages}
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
