'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { CommsChannel, ParentChannelPref } from '@/lib/comms/types';

interface HealthEntry {
  channel: CommsChannel;
  ok: boolean;
  message?: string;
}

export function ChannelPreferences() {
  const { getIdToken } = useAuth();
  const [prefs, setPrefs] = useState<ParentChannelPref[]>([]);
  const [health, setHealth] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState('');
  const [channel, setChannel] = useState<CommsChannel>('telegram');
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/comms/prefs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      setPrefs(
        (json.data?.prefs ?? []).map(
          (p: ParentChannelPref & { consentedAt: string; revokedAt?: string }) => ({
            ...p,
            consentedAt: new Date(p.consentedAt),
            revokedAt: p.revokedAt ? new Date(p.revokedAt) : undefined,
          }),
        ),
      );
      setHealth(json.data?.health ?? []);
    }
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/comms/prefs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel, handle, locale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Save failed');
      setMessage('Channel saved. You\'ll receive the weekly digest here.');
      setHandle('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function revoke(ch: CommsChannel) {
    const token = await getIdToken();
    await fetch(`/api/comms/prefs?channel=${ch}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Choose how you&apos;d like to receive weekly updates about your child&apos;s work.
        Telegram is live. WhatsApp arrives once our Meta Business approval lands.
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Channel</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as CommsChannel)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="telegram">Telegram</option>
            <option value="whatsapp" disabled>
              WhatsApp (coming soon)
            </option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            {channel === 'telegram' ? 'Chat ID' : 'Handle'}
          </span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={channel === 'telegram' ? 'e.g. 123456789' : '+91…'}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Language</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!handle.trim() || saving}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save channel'}
        </button>
        {message && <span className="text-xs text-emerald-700">{message}</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : (
        <>
          {prefs.length > 0 && (
            <div className="rounded border border-slate-200">
              <h4 className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Active channels
              </h4>
              <ul className="divide-y divide-slate-100">
                {prefs.map((p) => (
                  <li key={p.channel} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium capitalize">{p.channel}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {p.handle} · {p.locale ?? 'en'} · {p.consentStatus}
                      </span>
                    </div>
                    {p.consentStatus === 'granted' && (
                      <button
                        onClick={() => revoke(p.channel)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {health.length > 0 && (
            <div className="rounded border border-slate-200 p-3 text-xs text-slate-600">
              <h4 className="mb-1 flex items-center gap-1 font-semibold text-slate-700">
                <MessageCircle className="h-3 w-3" /> Channel status
              </h4>
              <ul className="space-y-0.5">
                {health.map((h) => (
                  <li key={h.channel} className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        h.ok ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                    />
                    <span className="capitalize">{h.channel}</span>
                    <span className="text-slate-500">
                      {h.ok ? (
                        <Check className="inline h-3 w-3" />
                      ) : (
                        h.message ?? 'Not configured'
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
