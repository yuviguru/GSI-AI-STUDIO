'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Share2, Truck, X } from 'lucide-react';
import type { Book } from '@gsi/types';

interface PublishModalProps {
  book: Book;
  onPublish: (isPublic: boolean) => Promise<{ shareUrl: string | null; pdfUrl: string | null } | null>;
  onExportPdf: () => Promise<{ pdfUrl: string } | null>;
  onClose: () => void;
}

export function PublishModal({ book, onPublish, onExportPdf, onClose }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(book.pdfUrl);
  const [shareUrl, setShareUrl] = useState<string | null>(book.shareUrl);
  const [makePublic, setMakePublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPublished = book.status === 'published';
  const hasCover = !!book.cover.title;
  const hasPages = book.pageCount >= 1;
  const canPublish = hasCover && hasPages;

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
      </motion.div>
    </div>
  );
}
