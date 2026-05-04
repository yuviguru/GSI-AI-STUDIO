'use client';

import { Check, X } from 'lucide-react';
import type { GrammarSuggestion } from '@/types/book.types';

interface GrammarSuggestionListProps {
  suggestions: GrammarSuggestion[];
  loading: boolean;
  error: string | null;
  hasRun: boolean;
  onAccept: (suggestion: GrammarSuggestion) => void;
  onKeep: (suggestion: GrammarSuggestion) => void;
}

const TYPE_BADGES: Record<GrammarSuggestion['type'], { label: string; className: string }> = {
  grammar: { label: 'Grammar', className: 'bg-blue-100 text-blue-800' },
  spelling: { label: 'Spelling', className: 'bg-purple-100 text-purple-800' },
  punctuation: { label: 'Punctuation', className: 'bg-amber-100 text-amber-800' },
};

/**
 * Inline-list rendering of grammar suggestions. Shows under the editor.
 * Each suggestion has the original (struck through), the suggested replacement,
 * a kid-friendly explanation, and accept/keep buttons. The kid retains full
 * agency — nothing is silently rewritten.
 */
export function GrammarSuggestionList({
  suggestions,
  loading,
  error,
  hasRun,
  onAccept,
  onKeep,
}: GrammarSuggestionListProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        ✨ Checking your writing...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (hasRun && suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
        ✅ Looks great! No mistakes spotted.
      </div>
    );
  }

  if (!hasRun || suggestions.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} — your voice stays
      </div>
      {suggestions.map((s) => {
        const badge = TYPE_BADGES[s.type];
        return (
          <div
            key={s.id}
            className="rounded-xl border border-gray-100 bg-gray-50 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-red-600 line-through decoration-2">{s.original}</span>{' '}
              <span className="text-emerald-700 font-semibold">{s.suggested}</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">{s.explanation}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onAccept(s)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => onKeep(s)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                Keep mine
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
