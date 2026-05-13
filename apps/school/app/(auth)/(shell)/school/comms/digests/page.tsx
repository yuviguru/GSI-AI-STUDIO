'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Eye, Mail, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface KidLite {
  id: string;
  name: string;
  classId?: string;
  className?: string;
  parentLinked: boolean;
}

interface HistoryRow {
  id: string;
  kidId: string;
  channel: string;
  status: string;
  error: string | null;
  sentAt: string;
}

interface DigestPreview {
  text: string;
  highlights?: string[];
}

export default function ParentDigestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, getIdToken } = useAuth();

  const [kids, setKids] = useState<KidLite[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewKidId, setPreviewKidId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DigestPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [teacherNote, setTeacherNote] = useState('');
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'schoolAdmin' && user.role !== 'teacher') {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const [kidsRes, historyRes] = await Promise.all([
      fetch('/api/schools/kids', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('/api/comms/parent-digest/history', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (kidsRes.ok) {
      const j = await kidsRes.json();
      setKids((j.data?.kids ?? []) as KidLite[]);
    }
    if (historyRes.ok) {
      const j = await historyRes.json();
      setHistory((j.data?.history ?? []) as HistoryRow[]);
    }
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (isAuthenticated && user) void load();
  }, [isAuthenticated, user, load]);

  async function openPreview(kidId: string) {
    setPreviewKidId(kidId);
    setPreview(null);
    setPreviewLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/comms/parent-digest/preview', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, teacherNote, locale }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? 'Preview failed.');
      setPreview(j.data?.digest as DigestPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function send(kidId: string) {
    setSending(kidId);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/comms/parent-digest/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, teacherNote, locale }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? 'Send failed.');
      // Refresh history.
      await load();
      setPreviewKidId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(null);
    }
  }

  const kidById = useMemo(() => new Map(kids.map((k) => [k.id, k])), [kids]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
            Parent Digests
          </h1>
          <p className="text-sm text-brand-text-secondary">
            Preview and send weekly progress digests to parents via their preferred channel.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-gray-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </header>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <textarea
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Optional teacher note appended to every digest (200 chars max)…"
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
          />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
            className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-text"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl bg-white shadow-card">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="font-display text-sm font-bold text-brand-text">Students</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-brand-text-secondary">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : kids.length === 0 ? (
            <p className="p-6 text-sm text-brand-text-secondary">
              No students found in this school.
            </p>
          ) : (
            <ul>
              {kids.map((k, idx) => (
                <li
                  key={k.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 px-5 py-3',
                    idx > 0 && 'border-t border-gray-100',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-text">{k.name}</p>
                    <p className="text-[11px] text-brand-text-secondary">
                      {k.className ?? 'Unassigned class'} ·{' '}
                      {k.parentLinked ? 'Parent linked' : 'No parent linked'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview(k.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-brand-text transition hover:bg-gray-200"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => send(k.id)}
                      disabled={sending === k.id || !k.parentLinked}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
                    >
                      {sending === k.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent history */}
        <aside className="self-start rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-display text-sm font-bold text-brand-text">Recent sends</h2>
          {history.length === 0 ? (
            <p className="text-xs text-brand-text-secondary">
              Nothing sent yet. Preview a student to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((h) => {
                const kid = kidById.get(h.kidId);
                return (
                  <li
                    key={h.id}
                    className="rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <p className="truncate text-xs font-semibold text-brand-text">
                      {kid?.name ?? h.kidId}
                    </p>
                    <p className="text-[11px] text-brand-text-secondary">
                      <span className="capitalize">{h.channel}</span> ·{' '}
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          h.status === 'delivered' && 'bg-emerald-100 text-emerald-700',
                          h.status === 'pending' && 'bg-amber-100 text-amber-700',
                          h.status === 'failed' && 'bg-rose-100 text-rose-700',
                        )}
                      >
                        {h.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-brand-text-muted">
                      {new Date(h.sentAt).toLocaleString()}
                    </p>
                    {h.error && (
                      <p className="mt-1 text-[10px] text-rose-600">{h.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {/* Preview modal */}
      {previewKidId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-elevated sm:rounded-3xl">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-text">
                  Digest preview · {kidById.get(previewKidId)?.name}
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  {locale === 'hi' ? 'Hindi' : 'English'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKidId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-text-secondary hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {previewLoading ? (
              <div className="flex items-center justify-center py-10 text-brand-text-secondary">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating…
              </div>
            ) : preview ? (
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-brand-text">
                {preview.text}
              </div>
            ) : null}

            <footer className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewKidId(null)}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-brand-text-secondary hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => previewKidId && send(previewKidId)}
                disabled={sending === previewKidId}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-50"
              >
                {sending === previewKidId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send to parent
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
