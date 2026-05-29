'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Heart, Loader2 } from 'lucide-react';
import { useRoyaltySplit } from '@/hooks/useRoyaltySplit';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { Book } from '@gsi/types';

interface SalesConfigFormProps {
  book: Book;
  /** Called after a successful save so the parent can refresh book state. */
  onSaved?: (updatedBook: Book) => void;
}

/**
 * BOOK-004 Phase 1 — sales config slot in PublishModal.
 *
 * Lets the author toggle sales on/off and set a price. The split preview
 * updates live based on `config/royaltySplit` so the kid sees exactly
 * what creator/KIT/platform amounts will be. Buying flow goes live in
 * Phase 2; this form is the setup surface kids use now.
 */
export function SalesConfigForm({ book, onSaved }: SalesConfigFormProps) {
  const split = useRoyaltySplit();
  const [enabled, setEnabled] = useState<boolean>(book.sales?.enabled ?? false);
  const [priceInr, setPriceInr] = useState<number>(book.sales?.priceInr ?? 49);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep state in sync if the book changes between renders (e.g. after publish).
  useEffect(() => {
    setEnabled(book.sales?.enabled ?? false);
    if (book.sales?.priceInr) setPriceInr(book.sales.priceInr);
  }, [book.sales?.enabled, book.sales?.priceInr]);

  const splitInr = useMemo(() => {
    const creator = Math.floor((priceInr * split.splits.creator) / 100);
    const kit = Math.floor((priceInr * split.splits.kit) / 100);
    const platform = priceInr - creator - kit;
    return { creator, kit, platform };
  }, [priceInr, split.splits]);

  const canEnable = book.status === 'published';
  const showSplit = enabled && priceInr >= 10;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithSession(`/api/books/${book.id}/sales-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, priceInr: enabled ? priceInr : null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not save');
      onSaved?.(json.data.book as Book);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
          <Coins className="h-4 w-4 text-amber-700" />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-gray-900">
            Sell this book?
          </h3>
          <p className="text-[11px] text-gray-600">
            Earn AI Royalties from every sale. Part goes to KIT.
          </p>
        </div>
      </div>

      {!canEnable && (
        <p className="rounded-lg bg-amber-100/60 px-2.5 py-2 text-[11px] text-amber-800">
          Publish the book first to enable sales.
        </p>
      )}

      {canEnable && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="font-medium text-gray-900">List on the GSI Bookshop</span>
          </label>

          {enabled && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                  Price (₹)
                </label>
                <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-white px-2 py-1 ring-1 ring-amber-200">
                  <span className="text-sm text-gray-500">₹</span>
                  <input
                    type="number"
                    min={10}
                    max={999}
                    step={1}
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number.parseInt(e.target.value, 10) || 0)}
                    className="w-20 border-0 bg-transparent p-0 text-base font-mono font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-gray-500">₹10 minimum · ₹999 maximum</p>
              </div>

              {showSplit && (
                <div className="rounded-xl bg-white/80 p-3 ring-1 ring-amber-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Every sale splits like this
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li className="flex items-center justify-between">
                      <span className="text-gray-700">You (royalties)</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{splitInr.creator}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gray-700">
                        <Heart className="h-3 w-3 text-rose-500" />
                        KIT (kids without books)
                      </span>
                      <span className="font-mono font-bold text-rose-700">
                        ₹{splitInr.kit}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-700">Platform (keeps GSI free)</span>
                      <span className="font-mono font-bold text-gray-600">
                        ₹{splitInr.platform}
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              <p className="rounded-lg bg-amber-100/60 px-2.5 py-2 text-[11px] text-amber-800">
                ⚠️ Selling opens soon — you&apos;re setting the price for when it goes
                live.
              </p>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (enabled && priceInr < 10)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-button hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save sales setup'}
          </button>
        </div>
      )}
    </div>
  );
}
