'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithSession } from '@/lib/fetchWithSession';

interface Question {
  id: number;
  text: string;
  type:
    | 'multiple_choice'
    | 'short_answer'
    | 'recitation'
    | 'explanation'
    | 'calculation';
  options: string[] | null;
  correctAnswer: string | null;
  hint: string;
  recitationText: string | null;
  similarPractice: string | null;
}

interface Answer {
  questionId: number;
  answer: string;
  correct: boolean;
  score: number;
  attempts: number;
  revealed: boolean;
}

interface Transcript {
  id: string;
  subject: string;
  language: 'en' | 'hi';
  gradeEstimate: number;
  totalQuestions: number;
  score: number;
  revealedQuestionIds: number[];
  mode: 'quiz' | 'recite' | 'explain' | 'practice';
  startedAt: string;
  completedAt: string | null;
  questions: Question[];
  answers: Answer[];
}

interface ApiResponse {
  success: boolean;
  data?: Transcript;
  error?: { code: string; message: string };
}

export function HomeworkTranscriptClient({ id }: { id: string }) {
  const [data, setData] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchWithSession(`/api/homework/sessions/${id}`);
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (!res.ok || !json.success || !json.data) {
          setError(json.error?.message ?? 'Could not load this transcript.');
          setLoading(false);
          return;
        }
        setData(json.data);
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
  }, [id]);

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/homework/history"
          className="text-sm text-purple-600 hover:underline"
        >
          ← Back to homework history
        </Link>

        {loading && (
          <div className="mt-6 space-y-3" aria-busy="true">
            <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="mt-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h1 className="font-display text-2xl font-bold text-gray-900">
                {data.subject}
                <span className="ml-3 text-base font-normal text-gray-500">
                  Class {data.gradeEstimate} · {data.language === 'hi' ? 'हिंदी' : 'English'}
                </span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>
                  Mode: <strong>{data.mode}</strong>
                </span>
                <span>
                  Score: <strong className="text-purple-600">{data.score}%</strong>
                </span>
                <span>Questions: {data.totalQuestions}</span>
                {data.revealedQuestionIds.length > 0 && (
                  <span>
                    Revealed: {data.revealedQuestionIds.length}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Started {new Date(data.startedAt).toLocaleString()}
                {data.completedAt
                  ? ` · Finished ${new Date(data.completedAt).toLocaleString()}`
                  : ' · In progress'}
              </p>
            </div>

            <ol className="mt-6 space-y-4">
              {data.questions.map((q, index) => {
                const answer = data.answers.find((a) => a.questionId === q.id);
                const revealed = data.revealedQuestionIds.includes(q.id);
                return (
                  <li
                    key={q.id}
                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900">
                        Q{index + 1}. {q.text}
                      </p>
                      {answer && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            revealed
                              ? 'bg-amber-50 text-amber-700'
                              : answer.correct
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {revealed
                            ? 'revealed'
                            : answer.correct
                              ? 'correct'
                              : 'not yet'}
                        </span>
                      )}
                    </div>

                    {q.options && q.options.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                        {q.options.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    )}

                    {q.recitationText && (
                      <blockquote className="mt-2 border-l-2 border-gray-200 pl-3 text-sm italic text-gray-600">
                        {q.recitationText}
                      </blockquote>
                    )}

                    {answer ? (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                        <p className="text-gray-500">
                          Answered ({answer.attempts}{' '}
                          {answer.attempts === 1 ? 'attempt' : 'attempts'}):
                        </p>
                        <p className="mt-1 text-gray-900">{answer.answer}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm italic text-gray-400">
                        Not reached yet.
                      </p>
                    )}

                    {q.correctAnswer && (
                      <p className="mt-2 text-xs text-gray-500">
                        Expected answer: {q.correctAnswer}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
