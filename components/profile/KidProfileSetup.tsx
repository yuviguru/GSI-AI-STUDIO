'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AvatarPicker, getAvatarEmoji } from './AvatarPicker';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';

type Step = 'name' | 'details' | 'avatar' | 'review' | 'done';

interface KidProfileSetupProps {
  onComplete?: () => void;
  onClose?: () => void;
}

const GRADES = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const BOARDS = [
  { value: 'cbse', label: 'CBSE' },
  { value: 'icse', label: 'ICSE' },
  { value: 'state', label: 'State Board' },
];

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function KidProfileSetup({ onComplete, onClose }: KidProfileSetupProps) {
  const { getIdToken } = useAuth();
  const { refreshKids } = useKidProfile();

  const [step, setStep] = useState<Step>('name');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | undefined>();
  const [grade, setGrade] = useState('');
  const [board, setBoard] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();

  async function handleCreate() {
    setError(null);
    setLoading(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/users/kids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          avatar,
          age,
          grade: grade || undefined,
          board: board || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to create profile');
      }

      await refreshKids();
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleAddAnother() {
    setName('');
    setAge(undefined);
    setGrade('');
    setBoard('');
    setAvatar(undefined);
    setStep('name');
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <AnimatePresence mode="wait">
        {/* ─── Step 1: Name ─── */}
        {step === 'name' && (
          <motion.div
            key="name"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">👶</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                What&apos;s your kid&apos;s name?
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                This can be a nickname or fun name — no real name needed!
              </p>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aarav, Priya, RocketKid"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              autoFocus
              maxLength={30}
            />

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={() => {
                if (!name.trim()) {
                  setError('Please enter a name');
                  return;
                }
                setError(null);
                setStep('details');
              }}
              disabled={!name.trim()}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                name.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              Next →
            </button>

            {onClose && (
              <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                Skip for now
              </button>
            )}
          </motion.div>
        )}

        {/* ─── Step 2: Age, Grade, Board ─── */}
        {step === 'details' && (
          <motion.div
            key="details"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">📚</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Tell us about {name}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                This helps us personalize the experience
              </p>
            </div>

            <div className="space-y-3">
              {/* Age */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Age</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 8).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAge(a)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm font-medium transition',
                        age === a
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Class {g}</option>
                  ))}
                </select>
              </div>

              {/* Board */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Board</label>
                <div className="flex gap-2">
                  {BOARDS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setBoard(b.value)}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition',
                        board === b.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('avatar')}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98]"
            >
              Next →
            </button>

            <button
              onClick={() => setStep('name')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* ─── Step 3: Avatar ─── */}
        {step === 'avatar' && (
          <motion.div
            key="avatar"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-4xl">🎭</span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Pick an avatar for {name}
              </h2>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl">
              <AvatarPicker selected={avatar} onSelect={setAvatar} />
            </div>

            <button
              onClick={() => setStep('review')}
              disabled={!avatar}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                avatar ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              Next →
            </button>

            <button
              onClick={() => setStep('details')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* ─── Step 4: Review ─── */}
        {step === 'review' && (
          <motion.div
            key="review"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="text-center">
              <span className="text-6xl">{getAvatarEmoji(avatar)}</span>
              <h2 className="mt-3 text-xl font-bold text-gray-900">{name}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {age ? `Age ${age}` : ''}
                {age && grade ? ' · ' : ''}
                {grade ? `Class ${grade}` : ''}
                {(age || grade) && board ? ' · ' : ''}
                {board?.toUpperCase() || ''}
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              {loading ? 'Creating...' : 'Create Profile ✨'}
            </button>

            <button
              onClick={() => setStep('avatar')}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* ─── Step 5: Done ─── */}
        {step === 'done' && (
          <motion.div
            key="done"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="space-y-5 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-6xl">{getAvatarEmoji(avatar)}</span>
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900">
              {name}&apos;s profile is ready! 🎉
            </h2>

            <div className="flex gap-2">
              <button
                onClick={handleAddAnother}
                className="flex-1 rounded-xl border border-purple-200 px-3 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
              >
                Add Another Kid
              </button>
              <button
                onClick={() => onComplete?.()}
                className="flex-1 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 active:scale-[0.98]"
              >
                Start Creating!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
