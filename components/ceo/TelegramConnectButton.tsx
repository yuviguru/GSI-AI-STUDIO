'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Lock, Send } from 'lucide-react';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
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
  const { isAuthenticated, getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const [link, setLink] = useState<MintLinkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const resolvedLabel =
    label ?? (businessId ? 'Continue on Telegram' : 'Connect Telegram');

  const ready = isAuthenticated && !!activeKid;

  // Gate: if the caller isn't signed in or hasn't picked a kid, render a
  // disabled button rather than letting them mint a token the server would
  // reject anyway. Defense-in-depth for the server-side auth check.
  if (!ready) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
          title={
            !isAuthenticated
              ? 'Sign in first to connect Telegram'
              : 'Pick a kid profile first'
          }
        >
          <Lock className="h-4 w-4" />
          {resolvedLabel}
        </button>
      </div>
    );
  }

  const handleMint = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithKidAuth(
        '/api/bot/link/create',
        { getIdToken, kidId: activeKid.id },
        {
          method: 'POST',
          body: JSON.stringify({
            botHandle: 'GSIKidCeoAssistantBot',
            ...(businessId ? { businessId } : {}),
          }),
        },
      );

      // Read body as text first so a non-JSON server response (HTML error
      // page from Netlify's shell, empty 502 from cold-start, etc.) shows
      // a useful message instead of "Unexpected end of JSON input".
      const bodyText = await res.text();
      let payload: { success?: boolean; data?: MintLinkResponse; error?: { message?: string } } = {};
      try {
        payload = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        // Non-JSON response — surface the HTTP status + a snippet of the
        // body (truncated) so we can debug server-side crashes visibly.
        const preview = bodyText.slice(0, 160).replace(/\s+/g, ' ').trim();
        throw new Error(
          `Server returned ${res.status} ${res.statusText}${preview ? ` — ${preview}` : ''}`,
        );
      }

      if (!res.ok || !payload.success) {
        throw new Error(
          payload.error?.message ?? `Server returned ${res.status} ${res.statusText}`,
        );
      }

      const data = payload.data as MintLinkResponse;
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
