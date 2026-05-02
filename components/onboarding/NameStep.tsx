'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { getMascot } from '@/lib/mascots/roster';

interface NameStepProps {
  mascotId: string | null;
  initialName: string;
  initialAge: number | null;
  onNext: (name: string, age: number | null) => void;
  onBack: () => void;
}

const AGE_RANGE = Array.from({ length: 10 }, (_, i) => i + 8); // 8..17

export function NameStep({
  mascotId,
  initialName,
  initialAge,
  onNext,
  onBack,
}: NameStepProps) {
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<number | null>(initialAge);
  const [error, setError] = useState<string | null>(null);

  const mascot = getMascot(mascotId);

  function handleContinue() {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError('Please tell us what to call you');
      return;
    }
    if (trimmed.length > 30) {
      setError('Keep it short — under 30 letters');
      return;
    }
    setError(null);
    onNext(trimmed, age);
  }

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
          Step 2 of 4
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
          What should {mascot.name} call you?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Pick a fun name — it doesn&rsquo;t need to be your real one.
        </p>
      </div>

      {/* Mascot speech */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 flex items-center gap-3"
      >
        <MascotAvatar id={mascotId} size="md" tile animate />
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-sm text-gray-700">
            Hi! What&rsquo;s your superhero name?
          </p>
        </div>
      </motion.div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Aarav, RocketKid, Zoom"
            maxLength={30}
            autoFocus
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            How old are you? <span className="text-gray-400">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGE.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAge(age === a ? null : a)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition',
                  age === a
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
