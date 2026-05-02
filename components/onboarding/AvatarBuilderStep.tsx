'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const HAIR_OPTIONS = [
  { value: 'short black', emoji: '👦🏽' },
  { value: 'long black', emoji: '👧🏽' },
  { value: 'curly', emoji: '🧑🏽‍🦱' },
  { value: 'spiky', emoji: '🧑🏽‍🦰' },
  { value: 'braided', emoji: '👧🏽' },
  { value: 'colorful', emoji: '🧑🏽‍🎤' },
] as const;

const VIBE_OPTIONS = [
  { value: 'cheerful', label: 'Cheerful', emoji: '😄' },
  { value: 'cool', label: 'Cool', emoji: '😎' },
  { value: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { value: 'sporty', label: 'Sporty', emoji: '⚽' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'adventurous', label: 'Adventurous', emoji: '🧭' },
] as const;

const OUTFIT_OPTIONS = [
  { value: 't-shirt and jeans', label: 'Tee + Jeans' },
  { value: 'school uniform', label: 'Uniform' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'sporty jacket', label: 'Sporty' },
  { value: 'space suit', label: 'Space Suit' },
  { value: 'wizard robes', label: 'Wizard' },
  { value: 'kurta', label: 'Kurta' },
  { value: 'lab coat', label: 'Lab Coat' },
] as const;

const ACCESSORY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'glasses', label: 'Glasses' },
  { value: 'cap', label: 'Cap' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'beanie', label: 'Beanie' },
  { value: 'crown', label: 'Crown' },
] as const;

export interface GeneratedAvatar {
  imageUrl: string;
  prompt: string;
  providerName: string;
  traits: AvatarTraits;
  /** True when imageUrl is a stable Storage/HTTPS URL safe to persist long-term.
   *  False means it's a transient data URI we should not save to localStorage. */
  persisted: boolean;
}

export interface AvatarTraits {
  hair: string;
  vibe: string;
  outfit: string;
  accessory: string;
}

interface AvatarBuilderStepProps {
  initial: GeneratedAvatar | null;
  onNext: (avatar: GeneratedAvatar) => void;
  onBack: () => void;
}

export function AvatarBuilderStep({
  initial,
  onNext,
  onBack,
}: AvatarBuilderStepProps) {
  const [traits, setTraits] = useState<AvatarTraits>(
    initial?.traits ?? {
      hair: HAIR_OPTIONS[0].value,
      vibe: VIBE_OPTIONS[0].value,
      outfit: OUTFIT_OPTIONS[0].value,
      accessory: ACCESSORY_OPTIONS[0].value,
    },
  );
  const [generated, setGenerated] = useState<GeneratedAvatar | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      // Send the session id so the server can rate-limit per anonymous session
      // in addition to per-IP. Read from localStorage (set by useSession on mount).
      const sessionId =
        typeof window !== 'undefined' ? localStorage.getItem('gsi-session-id') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionId) headers['X-Session-Id'] = sessionId;

      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(traits),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ?? 'Could not generate avatar — try again',
        );
      }

      setGenerated({
        imageUrl: json.data.imageUrl,
        prompt: json.data.prompt,
        providerName: json.data.providerName,
        traits,
        persisted: json.data.persisted === true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
          Step 3 of 4
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
          Make your avatar
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Pick your style. Our AI will draw it for you.
        </p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pb-2">
        {/* Avatar preview */}
        <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 to-pink-100 shadow-inner">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <Sparkles className="h-8 w-8 animate-pulse text-purple-500" />
                <p className="text-xs font-medium text-purple-600">
                  AI is drawing&hellip;
                </p>
              </motion.div>
            ) : generated ? (
              <motion.img
                key={generated.imageUrl}
                src={generated.imageUrl}
                alt="Your avatar"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full object-cover"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <span className="text-5xl">🎨</span>
                <p className="mt-2 text-xs text-gray-500">
                  Tap &ldquo;Draw it&rdquo; below
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trait pickers */}
        <TraitGroup
          label="Hair"
          value={traits.hair}
          onChange={(v) => setTraits({ ...traits, hair: v })}
          options={HAIR_OPTIONS.map((o) => ({ value: o.value, label: o.value, emoji: o.emoji }))}
        />
        <TraitGroup
          label="Vibe"
          value={traits.vibe}
          onChange={(v) => setTraits({ ...traits, vibe: v })}
          options={VIBE_OPTIONS.map((o) => ({ value: o.value, label: o.label, emoji: o.emoji }))}
        />
        <TraitGroup
          label="Outfit"
          value={traits.outfit}
          onChange={(v) => setTraits({ ...traits, outfit: v })}
          options={OUTFIT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <TraitGroup
          label="Accessory"
          value={traits.accessory}
          onChange={(v) => setTraits({ ...traits, accessory: v })}
          options={ACCESSORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition',
            loading
              ? 'cursor-not-allowed opacity-60'
              : 'hover:border-purple-400 hover:bg-purple-100',
          )}
        >
          {loading ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              Drawing your avatar&hellip;
            </>
          ) : generated ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Try a different combo
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Draw it with AI ✨
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => generated && onNext(generated)}
          disabled={!generated || loading}
          className={cn(
            'flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
            generated && !loading
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'cursor-not-allowed bg-gray-300',
          )}
        >
          {generated ? 'Looks great →' : 'Draw your avatar first'}
        </button>
      </div>
    </div>
  );
}

interface TraitOption {
  value: string;
  label: string;
  emoji?: string;
}

interface TraitGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: TraitOption[];
}

function TraitGroup({ label, value, onChange, options }: TraitGroupProps) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                selected
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {opt.emoji && <span className="text-sm">{opt.emoji}</span>}
              <span className="capitalize">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
