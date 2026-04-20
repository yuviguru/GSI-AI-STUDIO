'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Send } from 'lucide-react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { cn } from '@/lib/utils';

interface MintLinkResponse {
  token: string;
  deepLink: string;
  code: string;
  expiresAt: string;
}

interface TelegramConnectButtonProps {
  /** If set, the bot resumes THAT business immediately after redeeming the
   *  link. Leave undefined for a plain "connect the chat" flow from the
   *  landing page. */
  businessId?: string;
  /** Label override — defaults to "Continue on Telegram" when bound to a
   *  business, "Connect Telegram" otherwise. */
  label?: string;
  className?: string;
}

/** Mints a single-use `botLinkCodes` token via `/api/bot/link/create`,
 *  then opens the Telegram deep link. Shows the 6-digit fallback code
 *  inline for kids on devices where the deep link won't open a chat. */
export function TelegramConnectButton({
  businessId,
  label,
  className,
}: TelegramConnectButtonProps) {
  const [link, setLink] = useState<MintLinkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const resolvedLabel =
    label ?? (businessId ? 'Continue on Telegram' : 'Connect Telegram');

  const handleMint = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/bot/link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botHandle: 'GSIKidCeoAssistantBot',
          ...(businessId ? { businessId } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Could not generate a link');
      }
      const data = json.data as MintLinkResponse;
      setLink(data);
      // Open the deep link — mobile Telegram intercepts https://t.me/...;
      // desktop Telegram usually does too; fallback is the code below.
      if (typeof window !== 'undefined') {
        window.open(data.deepLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!link?.code) return;
    try {
      await navigator.clipboard.writeText(link.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      /* ignore — clipboard API unavailable in some embedded webviews */
    }
  };

  if (link) {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4',
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
          <Send className="h-4 w-4" />
          Opening @GSIKidCeoAssistantBot…
        </div>
        <p className="text-xs text-sky-800/80">
          If the bot didn&apos;t open, tap this link:
          <br />
          <a
            href={link.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            {link.deepLink}
          </a>
        </p>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-sky-900">
          <span className="text-sky-800/70">Or type in the bot:</span>
          <code className="font-mono text-sm font-bold">/link {link.code}</code>
          <button
            type="button"
            onClick={handleCopyCode}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
          >
            {copiedCode ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={handleMint}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {resolvedLabel}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
