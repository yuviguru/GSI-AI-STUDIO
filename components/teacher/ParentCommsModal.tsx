'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { PtmNoteDraft } from '@gsi/ai/ptmNoteGenerator';
import type { Tone } from '@gsi/ai/adhocMessageDrafter';

interface Props {
  kidId: string;
  kidName: string;
  grade?: string;
  onClose: () => void;
}

type Tab = 'ptm' | 'adhoc';

function defaultTerm(): string {
  const now = new Date();
  const year = now.getFullYear();
  const term = now.getMonth() >= 9 || now.getMonth() <= 2 ? 'T2' : 'T1';
  return `${year}-${term}`;
}
function defaultTermStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const t2 = now.getMonth() >= 9 || now.getMonth() <= 2;
  const start = t2 ? new Date(year, 9, 1) : new Date(year, 3, 1);
  return start.toISOString().slice(0, 10);
}

export function ParentCommsModal({ kidId, kidName, grade, onClose }: Props) {
  const { getIdToken } = useAuth();
  const [tab, setTab] = useState<Tab>('ptm');
  const [locale, setLocale] = useState<'en' | 'hi'>('en');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              Parent comms · {kidName}
              {grade ? ` · Grade ${grade}` : ''}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Draft PTM talking points or a one-shot parent message. Always
              edit before sending.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="flex border-b border-slate-200">
          {(['ptm', 'adhoc'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition',
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {t === 'ptm' ? 'PTM notes' : 'Send message'}
            </button>
          ))}
          <div className="ml-auto flex items-center px-3 text-xs">
            <label className="flex items-center gap-1 text-slate-600">
              <span>Lang:</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
              >
                <option value="en">EN</option>
                <option value="hi">हिं</option>
              </select>
            </label>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'ptm' ? (
            <PtmTab kidId={kidId} locale={locale} getIdToken={getIdToken} />
          ) : (
            <AdhocTab
              kidId={kidId}
              locale={locale}
              kidName={kidName}
              getIdToken={getIdToken}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PtmTab({
  kidId,
  locale,
  getIdToken,
}: {
  kidId: string;
  locale: 'en' | 'hi';
  getIdToken: () => Promise<string | null>;
}) {
  const [term, setTerm] = useState(defaultTerm());
  const [termStart, setTermStart] = useState(defaultTermStart());
  const [draft, setDraft] = useState<PtmNoteDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/comms/ptm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kidId, term, termStart, locale }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.code === 'FORBIDDEN_CONSENT') {
          throw new Error(
            'Parent has not granted AI-generation consent for this student. Ask the parent to enable it in Data & privacy.',
          );
        }
        throw new Error(json?.error?.message ?? 'Could not draft PTM notes.');
      }
      setDraft(json.data.draft as PtmNoteDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft PTM notes.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {!draft && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Term</span>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value.slice(0, 40))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Term start</span>
            <input
              type="date"
              value={termStart}
              onChange={(e) => setTermStart(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {draft && (
        <div className="space-y-3 text-sm">
          <Section label="Highlights" body={draft.highlights} />
          <Section label="To discuss" body={draft.toDiscuss} />
          <Section label="At-home practice" body={draft.homePractice} />
          {draft.questionsForParent.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Questions for the parent
              </h4>
              <ul className="list-inside list-disc text-sm text-slate-800">
                {draft.questionsForParent.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {generating
            ? 'Drafting…'
            : draft
              ? 'Regenerate'
              : 'Draft PTM notes'}
        </button>
      </div>
    </div>
  );
}

function AdhocTab({
  kidId,
  kidName,
  locale,
  getIdToken,
}: {
  kidId: string;
  kidName: string;
  locale: 'en' | 'hi';
  getIdToken: () => Promise<string | null>;
}) {
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState<Tone>('informative');
  const [draftText, setDraftText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function draft() {
    setDrafting(true);
    setError(null);
    setInfo(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/comms/adhoc/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kidId, teacherIntent: intent, tone, locale }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.code === 'FORBIDDEN_CONSENT') {
          throw new Error(
            'Parent has not granted AI-generation consent for this student.',
          );
        }
        throw new Error(json?.error?.message ?? 'Could not draft message.');
      }
      setDraftText((json.data?.draft?.text as string) ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft message.');
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/comms/adhoc/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kidId, text: draftText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Send failed.');
      }
      const status = json.data?.delivery?.status as string | undefined;
      if (status === 'sent') {
        setInfo(`Sent via ${json.data?.delivery?.channel ?? 'unknown'}.`);
      } else {
        setError(
          `Delivery status: ${status ?? 'unknown'} — ${
            json.data?.delivery?.error ?? 'parent may not have a channel configured.'
          }`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Your intent (1-2 sentences)
        </span>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value.slice(0, 400))}
          rows={2}
          placeholder={`e.g. ${kidName.split(' ')[0]} has been late submitting homework lately.`}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Tone</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="informative">Informative</option>
            <option value="concerned">Concerned</option>
            <option value="congratulatory">Congratulatory</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={draft}
            disabled={!intent.trim() || drafting}
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {drafting ? 'Drafting…' : 'Draft message'}
          </button>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Message to send</span>
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value.slice(0, 600))}
          rows={4}
          placeholder="Edit the draft, or write your own message here."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm leading-relaxed"
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {draftText.length} / 600
        </p>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={send}
          disabled={!draftText.trim() || sending}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {label}
      </h4>
      <p className="text-sm leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}
