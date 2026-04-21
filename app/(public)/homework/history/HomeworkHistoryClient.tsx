'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { TelegramConnectButton } from '@/components/ceo/TelegramConnectButton';

interface HomeworkSummary {
  id: string;
  subject: string;
  language: 'en' | 'hi';
  gradeEstimate: number;
  totalQuestions: number;
  score: number;
  revealedCount: number;
  mode: 'quiz' | 'recite' | 'explain' | 'practice';
  startedAt: string;
  completedAt: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: { sessions: HomeworkSummary[] };
  error?: { code: string; message: string };
}

export function HomeworkHistoryClient() {
  const [sessions, setSessions] = useState<HomeworkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchWithSession('/api/homework/history?limit=30');
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (!res.ok || !json.success || !json.data) {
          setError(json.error?.message ?? 'Could not load homework history.');
          setLoading(false);
          return;
        }
        setSessions(json.data.sessions);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError('Could not reach the server — please try again in a moment.');
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="text-5xl">📚</span>
          <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
            Homework History
          </h1>
          <p className="mt-2 text-gray-600">
            Every homework session the bot has walked you through. Tap one to
            see exactly what was asked and what was answered.
          </p>
        </div>

        {loading && (
          <div className="mt-8 space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-xl bg-gray-50 p-6 text-center text-gray-600">
            <div>
              <p>No homework sessions yet.</p>
              <p className="mt-2 text-sm">
                Tap the button below to open{' '}
                <code className="rounded bg-white px-1 py-0.5">
                  @GSIPersonalAssistantBot
                </code>{' '}
                on Telegram. Forward any school-group homework message to
                start a quiz.
              </p>
            </div>
            <TelegramConnectButton
              botHandle="GSIPersonalAssistantBot"
              label="Open Homework Bot on Telegram"
            />
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-end">
              <TelegramConnectButton
                botHandle="GSIPersonalAssistantBot"
                label="Open bot on Telegram"
                className="w-auto"
              />
            </div>
            <ul className="mt-4 space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/homework/history/${s.id}`}
                  className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {s.subject}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          Class {s.gradeEstimate}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {labelForMode(s.mode)} · {s.totalQuestions} question
                        {s.totalQuestions === 1 ? '' : 's'}
                        {s.revealedCount > 0
                          ? ` · ${s.revealedCount} revealed`
                          : ''}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatRelative(s.completedAt ?? s.startedAt)}
                        {!s.completedAt ? ' · in progress' : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {s.score}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.language === 'hi' ? 'हिंदी' : 'English'}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function labelForMode(mode: HomeworkSummary['mode']): string {
  switch (mode) {
    case 'quiz':
      return '📝 Quiz';
    case 'recite':
      return '🗣 Recitation';
    case 'explain':
      return '💡 Explanation';
    case 'practice':
      return '🔄 Practice';
  }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
