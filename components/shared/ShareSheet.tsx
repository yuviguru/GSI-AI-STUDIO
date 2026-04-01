'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  whatsappUrl: string;
  creationTitle: string;
}

export function ShareSheet({
  isOpen,
  onClose,
  shareUrl,
  whatsappUrl,
  creationTitle,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleWhatsAppShare = useCallback(() => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [whatsappUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: creationTitle,
        text: `Check out what I made with AI: ${creationTitle}`,
        url: shareUrl,
      });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User cancelled — ignore
    }
  }, [creationTitle, shareUrl]);

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-4 bottom-0 z-50 mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-xl"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label="Share options"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

            {/* Header */}
            <div className="text-center">
              <h3 className="font-display text-xl font-bold text-gray-900">
                Share your creation!
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Show friends & family what you made with AI
              </p>
            </div>

            {/* Share options */}
            <div className="mt-5 flex flex-col gap-3">
              {/* WhatsApp — primary */}
              <button
                onClick={handleWhatsAppShare}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-2xl py-4 text-lg font-bold text-white',
                  'bg-[#25D366] transition-all hover:bg-[#20BD5A] active:scale-[0.98]'
                )}
              >
                <WhatsAppIcon />
                Share on WhatsApp
              </button>

              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-2xl border-2 py-3.5 font-bold transition-all active:scale-[0.98]',
                  copied
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {copied ? (
                  <>
                    <CheckIcon />
                    Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon />
                    Copy Link
                  </>
                )}
              </button>

              {/* Native share (if available) */}
              {supportsNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className={cn(
                    'flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 py-3.5 font-bold text-gray-700',
                    'transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]'
                  )}
                >
                  <ShareIcon />
                  More Options
                </button>
              )}
            </div>

            {/* Success animation */}
            <AnimatePresence>
              {shared && (
                <motion.div
                  className="mt-4 flex items-center justify-center gap-2 text-green-600"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CheckIcon />
                  <span className="font-bold">Shared!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Inline SVG icons (avoids extra dependency) ──────────────

function WhatsAppIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
