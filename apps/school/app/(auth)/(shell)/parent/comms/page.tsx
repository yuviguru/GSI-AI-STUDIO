'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface InboxMessage {
  id: string;
  kidId: string;
  channel: string;
  templateId: string;
  status: string;
  error: string | null;
  sentAt: string;
}

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  telegram: Send,
  whatsapp: MessageCircle,
};

const TEMPLATE_LABELS: Record<string, string> = {
  parent_weekly_digest_v1: 'Weekly digest',
  ptm_invite_v1: 'PTM invitation',
  adhoc_v1: 'Message',
  consent_request_v1: 'Consent request',
};

export default function ParentCommsInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, getIdToken } = useAuth();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (user && user.role !== 'parent') {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || user?.role !== 'parent') return;

    (async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch('/api/comms/parent-inbox', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error?.message ?? 'Failed to load inbox.');
        if (!cancelled) setMessages((j.data?.messages ?? []) as InboxMessage[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role, getIdToken]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
          Messages & Digests
        </h1>
        <p className="text-sm text-brand-text-secondary">
          Everything teachers and the school have sent you, across channels.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white p-10 text-brand-text-secondary shadow-card">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center text-brand-text-secondary shadow-card">
          <Inbox className="h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium">No messages yet.</p>
          <p className="text-xs">When teachers send a digest or note, it will appear here.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-card">
          {messages.map((m, idx) => {
            const Icon = CHANNEL_ICON[m.channel] ?? Mail;
            return (
              <li
                key={m.id}
                className={cn(
                  'flex items-start gap-3 p-4',
                  idx > 0 && 'border-t border-gray-100',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm font-semibold text-brand-text">
                      {TEMPLATE_LABELS[m.templateId] ?? m.templateId}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                      {m.channel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-brand-text-secondary">
                    {new Date(m.sentAt).toLocaleString()}
                  </p>
                  {m.error && (
                    <p className="mt-1 text-xs text-rose-600">Delivery issue: {m.error}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    m.status === 'delivered' && 'bg-emerald-100 text-emerald-700',
                    m.status === 'pending' && 'bg-amber-100 text-amber-700',
                    m.status === 'failed' && 'bg-rose-100 text-rose-700',
                  )}
                >
                  {m.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
