'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASCOTS, type Mascot, isMascotSelectable } from '@/lib/mascots/roster';

// Lottie is heavy + DOM-only; lazy + client-only.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/** In-memory cache so we only fetch each Lottie JSON once per session. */
const lottieCache = new Map<string, unknown>();

interface MascotPickerStepProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

/**
 * Supercell-style horizontal carousel picker.
 *
 * - Big colorful cards with each mascot's hero art prominent.
 * - Scroll-snap horizontal scroll on mobile; desktop gets prev/next buttons.
 * - The selected card pops with a white ring + slight scale.
 * - Locked mascots (`comingSoon`) still show in the lineup but render
 *   desaturated + non-interactive with a "SOON" badge.
 *
 * Hero art comes from `mascot.heroImage` (drop PNG/WEBP into
 * /public/mascots/<id>.png — see public/mascots/CONTEXT.md). Until the
 * generated art lands, the card falls back to the emoji `mascot.art`.
 */
export function MascotPickerStep({
  selectedId,
  onSelect,
  onNext,
  onBack,
}: MascotPickerStepProps) {
  const selected = MASCOTS.find((m) => m.id === selectedId) ?? null;

  // Unlocked mascots first so kids see the playable one immediately.
  const orderedMascots = [
    ...MASCOTS.filter((m) => !m.comingSoon),
    ...MASCOTS.filter((m) => m.comingSoon),
  ];

  const trackRef = useRef<HTMLDivElement | null>(null);
  // Only show the chevrons when the track actually has horizontal overflow.
  // On a wide viewport all 8 cards fit, no arrows needed at all. When they
  // are shown, they're never disabled — the user can scroll regardless of
  // which mascots are locked.
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateOverflow, { passive: true });
    window.addEventListener('resize', updateOverflow);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      window.removeEventListener('resize', updateOverflow);
    };
  }, [updateOverflow]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-mascot-card]');
    const step = card ? card.offsetWidth + 12 : 180;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex h-full flex-col py-6">
      {/* Heading — kept narrow + centered for readability. */}
      <div className="mx-auto max-w-md px-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
          Step 1 of 4
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
          Pick your AI buddy
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          They&rsquo;ll cheer you on through every creation. More buddies are on the way!
        </p>
      </div>

      {/* Carousel — uses the full viewport width since the parent step
          opts out of `max-w-md` for the mascot step. Capped at 1400px on
          ultrawides so 8 cards don't drift to the corners. */}
      <div className="relative mt-6 shrink-0">
        <div className="relative mx-auto max-w-[1400px]">
          <div
            ref={trackRef}
            role="radiogroup"
            aria-label="Choose your mascot"
            className={cn(
              'flex items-center gap-4 overflow-x-auto py-2 pb-6',
              // Centre the row when all cards fit so they don't hug the left.
              hasOverflow ? 'justify-start' : 'sm:justify-center',
              'snap-x snap-mandatory scroll-smooth',
              '[-ms-overflow-style:none] [scrollbar-width:none]',
              '[&::-webkit-scrollbar]:hidden',
              'px-5 sm:px-8',
            )}
          >
            {orderedMascots.map((m: Mascot) => (
              <MascotCard
                key={m.id}
                mascot={m}
                isSelected={selectedId === m.id}
                onSelect={() => isMascotSelectable(m) && onSelect(m.id)}
              />
            ))}
          </div>

          {/* Prev / Next chevrons — visible whenever there's horizontal
              overflow, and never disabled. The user can scroll past locked
              characters — being unlocked has nothing to do with scrolling
              past them. The track stops naturally at its scroll boundary
              so clicking past the edge is a no-op. */}
          {hasOverflow && (
            <>
              <button
                type="button"
                aria-label="Previous mascot"
                onClick={() => scrollByCard(-1)}
                className={cn(
                  'absolute left-2 top-1/2 -translate-y-1/2',
                  'hidden h-11 w-11 items-center justify-center rounded-full',
                  'bg-white text-gray-700 shadow-lg ring-1 ring-black/10 transition',
                  'hover:bg-gray-50 hover:shadow-xl active:scale-95',
                  'sm:flex',
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next mascot"
                onClick={() => scrollByCard(1)}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  'hidden h-11 w-11 items-center justify-center rounded-full',
                  'bg-white text-gray-700 shadow-lg ring-1 ring-black/10 transition',
                  'hover:bg-gray-50 hover:shadow-xl active:scale-95',
                  'sm:flex',
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Speech bubble + action row — re-narrowed to max-w-md so they sit
          aligned with the heading on wide viewports. */}
      <div className="mx-auto w-full max-w-md px-5">
        <div className="mt-3 min-h-[56px]">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-purple-50 p-3 text-center"
              >
                <p className="text-sm italic text-purple-900">
                  &ldquo;{selected.greeting}&rdquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!selected}
            className={cn(
              'flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
              selected
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'cursor-not-allowed bg-gray-300',
            )}
          >
            {selected ? `Stick with ${selected.name} →` : 'Pick a buddy first'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MascotCardProps {
  mascot: Mascot;
  isSelected: boolean;
  onSelect: () => void;
}

function MascotCard({ mascot, isSelected, onSelect }: MascotCardProps) {
  const [imageOk, setImageOk] = useState(Boolean(mascot.heroImage));
  const selectable = isMascotSelectable(mascot);
  const ariaLabel = selectable
    ? `${mascot.name}, ${mascot.tagline}`
    : `${mascot.name}, ${mascot.tagline} (coming soon — locked)`;

  // Lottie has highest priority — fetched lazily, cached, falls back silently
  // to the next layer (heroImage → emoji) if the JSON 404s or fails to parse.
  const [lottieData, setLottieData] = useState<unknown>(() =>
    mascot.lottie ? lottieCache.get(mascot.lottie) ?? null : null,
  );

  useEffect(() => {
    if (!mascot.lottie) {
      setLottieData(null);
      return;
    }
    const cached = lottieCache.get(mascot.lottie);
    if (cached) {
      setLottieData(cached);
      return;
    }
    let cancelled = false;
    fetch(mascot.lottie)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Lottie ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        lottieCache.set(mascot.lottie!, data);
        setLottieData(data);
      })
      .catch(() => {
        // silent fallback to heroImage / emoji
      });
    return () => {
      cancelled = true;
    };
  }, [mascot.lottie]);

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={ariaLabel}
      aria-disabled={!selectable}
      disabled={!selectable}
      onClick={onSelect}
      data-mascot-card
      whileTap={selectable ? { scale: 0.97 } : undefined}
      animate={
        selectable && isSelected
          ? { scale: 1.04 }
          : { scale: selectable ? 1 : 0.96 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'group relative shrink-0 snap-center overflow-hidden text-left',
        'rounded-[28px]',
        // Supercell proportions — wider, less elongated. ~4:5 portrait.
        'w-[230px] h-[300px] sm:w-[260px] sm:h-[340px]',
        'bg-gradient-to-b shadow-card',
        mascot.cardGradient ?? mascot.gradient,
        selectable && isSelected
          ? 'shadow-elevated ring-4 ring-white/90'
          : 'ring-1 ring-black/10',
        !selectable && 'cursor-not-allowed opacity-70 grayscale',
      )}
    >
      {/* Soft halo behind the character */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-16 mx-auto h-40 w-40 rounded-full bg-white/25 blur-3xl"
        aria-hidden
      />

      {/* Hero character — Lottie > heroImage > emoji.
          Sits in the bottom 70% of the card so the character feels grounded,
          like a Supercell game hero. */}
      <div className="absolute inset-x-0 top-6 bottom-14 flex items-end justify-center">
        {mascot.lottie && lottieData ? (
          <div
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
            aria-hidden
          >
            <Lottie
              animationData={lottieData}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : mascot.heroImage && imageOk ? (
          <div className="relative h-full w-full">
            <Image
              src={mascot.heroImage}
              alt=""
              fill
              sizes="260px"
              className="object-contain object-bottom drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageOk(false)}
            />
          </div>
        ) : (
          <span
            className="block leading-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
            style={{ fontSize: 128 }}
            aria-hidden
          >
            {mascot.art}
          </span>
        )}
      </div>

      {/* SOON badge */}
      {!selectable && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-700 shadow-sm">
          <Lock className="h-2.5 w-2.5" aria-hidden />
          <span>Soon</span>
        </div>
      )}

      {/* Footer — name + tagline on a dark gradient like Supercell */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-10">
        <p className="font-display text-xl font-extrabold leading-tight text-white drop-shadow-md sm:text-2xl">
          {mascot.name}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90 sm:text-xs">
          {mascot.tagline}
        </p>
      </div>
    </motion.button>
  );
}
