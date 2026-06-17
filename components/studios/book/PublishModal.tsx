'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Share2, Truck, X } from 'lucide-react';
import type { Book, BookPage } from '@gsi/types';
import { computeEffortBadge, getEffortBadgeMeta } from '@/lib/books/effortBadge';
import { validateBookForPublish } from '@/lib/books/bookValidation';
import { SalesConfigForm } from './SalesConfigForm';

interface PublishModalProps {
  book: Book;
  pages: BookPage[];
  onPublish: (isPublic: boolean) => Promise<{ shareUrl: string | null; pdfUrl: string | null } | null>;
  onExportPdf: () => Promise<{ pdfUrl: string } | null>;
  onClose: () => void;
}

export function PublishModal({ book, pages, onPublish, onExportPdf, onClose }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(book.pdfUrl);
  const [shareUrl, setShareUrl] = useState<string | null>(book.shareUrl);
  const [makePublic, setMakePublic] = useState(false);
  const [copied, setCopied] = useState(false);
  // BOOK-004 — keep a local mirror of the book so SalesConfigForm can
  // optimistically update sales fields after save without a full reload.
  // Sync from props whenever the parent refreshes (e.g. immediately after
  // publish, the parent re-fetches and passes a `status: 'published'`
  // book — without this useEffect, SalesConfigForm would keep seeing the
  // original `status: 'draft'` and refuse to enable sales until the kid
  // closed and reopened the modal). Codex review comment 3313051431.
  const [bookState, setBookState] = useState<Book>(book);
  useEffect(() => {
    setBookState(book);
  }, [book]);

  const isPublished = book.status === 'published';
  const hasCover = !!book.cover.title;
  const hasPages = book.pageCount >= 1;
  // BOOK-009 — make sure every page is finished enough (no empty pages, etc.)
  // before publishing, so the published/printed book reads properly.
  const validation = useMemo(() => validateBookForPublish(book, pages), [book, pages]);
  const canPublish = hasCover && hasPages && validation.ok;

  // BOOK-003 — predict the effort badge the kid will earn if they publish
  // right now. Computed live from the current authorship summary so the
  // kid can decide to rewrite a few more pages first to bump the badge.
  // For already-published books, show the persisted badge.
  const predictedBadge = useMemo(() => {
    if (isPublished && book.effortBadge) return book.effortBadge;
    if (!book.authorship) return null;
    return computeEffortBadge(book.authorship, new Date());
  }, [isPublished, book.effortBadge, book.authorship]);
  const predictedMeta = predictedBadge ? getEffortBadgeMeta(predictedBadge.key) : null;

  const handlePublish = async () => {
    setPublishing(true);
    const result = await onPublish(makePublic);
    setPublishing(false);
    if (result) {
      setShareUrl(result.shareUrl);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await onExportPdf();
    setExporting(false);
    if (result) {
      setPdfUrl(result.pdfUrl);
      // Trigger download immediately
      const link = document.createElement('a');
      link.href = result.pdfUrl;
      link.download = `${book.title || 'My Book'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    const fullUrl = `${window.location.origin}${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="publish-title" className="text-xl font-bold text-gray-900">
          {isPublished ? '🎉 Your book is published!' : 'Ready to publish?'}
        </h2>

        {!isPublished && (
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  hasCover ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                {hasCover && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className={hasCover ? 'text-gray-900' : 'text-gray-500'}>
                Cover set
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  hasPages ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                {hasPages && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className={hasPages ? 'text-gray-900' : 'text-gray-500'}>
                {book.pageCount} {book.pageCount === 1 ? 'page' : 'pages'} written
              </span>
            </li>
          </ul>
        )}

        {/* BOOK-009 — page-content checks. Blocking issues stop publishing;
            warnings are surfaced but the kid can publish anyway. */}
        {!isPublished && validation.blocking.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-xs font-bold text-red-700">Fix these before publishing</div>
            <ul className="mt-1 space-y-0.5 text-xs text-red-700">
              {validation.blocking.map((iss, i) => (
                <li key={i}>• {iss.message}</li>
              ))}
            </ul>
          </div>
        )}
        {!isPublished && validation.blocking.length === 0 && validation.warnings.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-bold text-amber-700">Just checking…</div>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
              {validation.warnings.map((iss, i) => (
                <li key={i}>• {iss.message}</li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-amber-600">You can still publish — just making sure!</p>
          </div>
        )}

        {/* BOOK-003 — effort badge preview (or persisted badge if already published). */}
        {predictedBadge && predictedMeta && (
          <div
            className={`mt-4 rounded-2xl border-2 p-3 ${predictedMeta.borderClass} ${predictedMeta.bgClass}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {isPublished ? 'Earned badge' : "You'll earn this badge"}
                </div>
                <div className="mt-0.5 inline-flex items-center gap-2">
                  <span className="text-2xl">{predictedMeta.emoji}</span>
                  <span className={`font-display text-base font-extrabold ${predictedMeta.textClass}`}>
                    {predictedMeta.displayName}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-600">{predictedMeta.tagline}</p>
              </div>
              <div className="text-right font-mono">
                <div className="text-2xl font-extrabold leading-none text-gray-900">
                  {predictedBadge.aiPercentage}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">AI</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
              <div className="rounded-lg bg-white/70 px-2 py-1.5">
                Words:{' '}
                <strong className="text-gray-900">{predictedBadge.breakdown.aiCharTotal}</strong>{' '}
                AI ·{' '}
                <strong className="text-gray-900">{predictedBadge.breakdown.kidCharTotal}</strong>{' '}
                you
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1.5">
                Images:{' '}
                <strong className="text-gray-900">{predictedBadge.breakdown.aiImagePageCount}</strong>{' '}
                AI ·{' '}
                <strong className="text-gray-900">{predictedBadge.breakdown.kidImagePageCount}</strong>{' '}
                you
              </div>
            </div>
            {!isPublished &&
              (predictedBadge.key === 'ai_generated' || predictedBadge.key === 'ai_sidekick') && (
                <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-[11px] text-gray-700">
                  💡 Want a higher badge? Cancel, edit a few more pages in your own words,
                  then come back here.
                </p>
              )}
          </div>
        )}

        {!isPublished && (
          <label className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={makePublic}
              onChange={(e) => setMakePublic(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
            />
            <div>
              <div className="font-medium text-gray-900">Share with everyone</div>
              <div className="text-xs text-gray-600">
                When on, your book appears in the public library. When off, only you (or
                people with the link) can read it.
              </div>
            </div>
          </label>
        )}

        <div className="mt-5 space-y-2">
          {!isPublished && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-3 font-semibold text-white shadow-button transition-colors hover:bg-brand-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? 'Publishing…' : 'Publish my book →'}
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !hasPages}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-button transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generating PDF…' : pdfUrl ? 'Download PDF again' : 'Download PDF'}
          </button>

          {shareUrl && (
            <button
              type="button"
              onClick={handleCopyShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy share link'}
            </button>
          )}

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 opacity-80"
            title="Print partner coming soon"
          >
            <Truck className="h-4 w-4" />
            Order printed copy — coming soon
          </button>
        </div>

        {/* BOOK-004 Phase 1 — sales setup. Author can configure sales now
            so the book lists on the shop the moment Phase 2 (purchase flow)
            ships. The Buy button stays disabled until then. */}
        <SalesConfigForm
          book={bookState}
          onSaved={(updated) => setBookState(updated)}
        />
      </motion.div>
    </div>
  );
}
