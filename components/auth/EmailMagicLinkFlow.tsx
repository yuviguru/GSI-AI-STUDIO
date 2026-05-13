'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@gsi/firebase/client';

/**
 * Email magic-link sign-in for the school portal (apps/school).
 *
 * Flow:
 *   1. User enters email → we call sendSignInLinkToEmail(); Firebase delivers
 *      a one-time link to that address.
 *   2. User clicks the link → returns to /teacher/login (this same page),
 *      with the URL containing the sign-in payload.
 *   3. isSignInWithEmailLink() detects the return → signInWithEmailLink()
 *      consumes the link and signs the user in.
 *
 * The localStorage `emailForSignIn` key remembers the email between the
 * initial send and the return click (the link itself doesn't expose it).
 *
 * Falls back to a sibling phone-OTP flow rendered above this one via the
 * shared TeacherSignupFlow toggle — teachers can switch on the fly.
 */
const STORAGE_KEY = 'emailForSignIn';

export function EmailMagicLinkFlow({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the magic-link return: check the URL, sign in, then notify.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (typeof window === 'undefined') return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let storedEmail = window.localStorage.getItem(STORAGE_KEY);
    if (!storedEmail) {
      storedEmail = window.prompt(
        'Confirm your email to finish signing in:',
      );
    }
    if (!storedEmail) return;

    setVerifying(true);
    signInWithEmailLink(auth, storedEmail, window.location.href)
      .then(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        // Strip the magic-link query from the URL.
        window.history.replaceState({}, document.title, window.location.pathname);
        onComplete?.();
        router.refresh();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [router, onComplete]);

  async function sendLink() {
    if (!isFirebaseConfigured) {
      setError('Firebase auth is not configured.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const url =
        typeof window !== 'undefined' ? window.location.origin + '/teacher/login' : '';
      await sendSignInLinkToEmail(auth, email, {
        url,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(STORAGE_KEY, email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link.');
    } finally {
      setSending(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <p className="text-sm text-brand-text-secondary">Signing you in…</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="font-display text-lg font-bold text-brand-text">
          Check your inbox
        </h3>
        <p className="max-w-xs text-sm text-brand-text-secondary">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this
          device to finish signing in.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-text-secondary hover:text-brand-text"
        >
          <ArrowLeft className="h-3 w-3" />
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
          Work email
        </span>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu.in"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}

      <button
        type="button"
        disabled={sending || !email.includes('@')}
        onClick={sendLink}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {sending ? 'Sending link…' : 'Send sign-in link'}
      </button>

      <p className="text-[11px] text-brand-text-muted">
        We&apos;ll email a one-time link. No password, no OTP.
      </p>
    </div>
  );
}
