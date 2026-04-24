'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import {
  ALLOWED_REACTIONS,
  type ReactionEmoji,
} from '@/lib/firebase/classFeedService';

interface FeedItem {
  submissionId: string;
  creationId: string;
  classId: string;
  schoolId: string;
  kid: { id: string; name: string; avatar?: string };
  creation: {
    id: string;
    type: string;
    title: string;
    thumbnail?: string;
    aiConceptsTaught: string[];
    createdAt: string;
  };
  approvedAt: string;
  reactionCounts: Record<string, number>;
  myReaction?: ReactionEmoji;
}

export function ClassFeed({ classId, kidId }: { classId: string; kidId: string }) {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ctx = { getIdToken, kidId };

  const load = useCallback(
    async (cursorParam?: number) => {
      setError(null);
      try {
        const url = cursorParam
          ? `/api/classes/${classId}/feed?cursor=${cursorParam}`
          : `/api/classes/${classId}/feed`;
        const res = await fetchWithKidAuth(url, ctx);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? 'Could not load feed.');
        setItems((prev) => (cursorParam ? [...prev, ...json.data.items] : json.data.items));
        setCursor(json.data?.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load feed.');
      } finally {
        setLoading(false);
      }
    },
    [classId, ctx],
  );

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, kidId]);

  async function react(creationId: string, emoji: ReactionEmoji, current?: ReactionEmoji) {
    // Toggle behaviour: same emoji removes, different emoji replaces.
    const removing = current === emoji;
    setItems((prev) =>
      prev.map((it) => {
        if (it.creationId !== creationId) return it;
        const counts = { ...it.reactionCounts };
        if (current && counts[current]) counts[current] = Math.max(0, counts[current] - 1);
        if (!removing) counts[emoji] = (counts[emoji] ?? 0) + 1;
        return { ...it, reactionCounts: counts, myReaction: removing ? undefined : emoji };
      }),
    );
    try {
      if (removing) {
        await fetchWithKidAuth(`/api/creations/${creationId}/reactions`, ctx, {
          method: 'DELETE',
        });
      } else {
        await fetchWithKidAuth(`/api/creations/${creationId}/reactions`, ctx, {
          method: 'POST',
          body: JSON.stringify({ emoji }),
        });
      }
    } catch {
      // On error, optimistic state stands for now; reload would re-sync.
    }
  }

  if (loading && items.length === 0) {
    return <p className="text-sm text-slate-500">Loading feed…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No shared creations in this class yet — your teacher will surface peers&apos;
          best work here as it lands.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.submissionId}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-800">{it.kid.name}</strong> ·{' '}
                  {it.creation.type}
                </span>
                <span>{new Date(it.approvedAt).toLocaleDateString()}</span>
              </div>
              <div className="space-y-2 p-4">
                <Link
                  href={`/view/${it.creation.id}`}
                  target="_blank"
                  className="text-sm font-semibold text-indigo-700 hover:underline"
                >
                  {it.creation.title}
                </Link>
                {it.creation.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.creation.thumbnail}
                    alt=""
                    className="max-h-48 w-full rounded-lg object-contain"
                  />
                )}
                {it.creation.aiConceptsTaught.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Concepts: {it.creation.aiConceptsTaught.slice(0, 3).join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {ALLOWED_REACTIONS.map((emoji) => {
                    const count = it.reactionCounts[emoji] ?? 0;
                    const mine = it.myReaction === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(it.creationId, emoji, it.myReaction)}
                        aria-label={`React ${emoji}`}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                          mine
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && (
                          <span className="text-slate-600">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cursor !== null && (
        <button
          type="button"
          onClick={() => void load(cursor)}
          className="mx-auto block rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Load more
        </button>
      )}
    </div>
  );
}
