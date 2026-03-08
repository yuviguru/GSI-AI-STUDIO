'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiGeneration } from '@/hooks/useAiGeneration';
import { useSession } from '@/hooks/useSession';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { MusicPromptForm } from '@/components/studios/music/MusicPromptForm';
import { MusicProgress } from '@/components/studios/music/MusicProgress';
import { MusicPlayer } from '@/components/studios/music/MusicPlayer';
import type { MusicContent } from '@/types';
import type { MusicInput } from '@/lib/validators';

type MusicData = MusicContent & { title: string; waveformData: number[] };
type StudioStep = 'inspire' | 'create' | 'share';

export function MusicStudioClient() {
  const searchParams = useSearchParams();
  const remixFromId = searchParams.get('remix') ?? undefined;
  const defaultPrompt = searchParams.get('prompt') ?? undefined;

  const [step, setStep] = useState<StudioStep>('inspire');
  const { data, aiXray, creationId, loading, error, progressMessage, generate, reset } =
    useAiGeneration<MusicData>('music');
  const { canCreate, cooldownSeconds, creationsRemaining, trackCreation } = useSession();
  const { trackCreation: trackPointsCreation } = useAiPoints();

  const handleSubmit = async (input: MusicInput) => {
    setStep('create');
    const result = await generate(input as unknown as Record<string, unknown>);
    if (result) {
      setStep('share');
      await trackCreation();
      trackPointsCreation('music');
    } else {
      setStep('inspire');
    }
  };

  const handleCancel = () => {
    reset();
    setStep('inspire');
  };

  const handleCreateAnother = () => {
    reset();
    setStep('inspire');
  };

  return (
    <div className="bg-gradient-to-b from-brand-orange/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-5xl">🎵</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-gray-900">Music Lab</h1>
          <p className="mt-1 text-gray-500">Create songs and beats with AI</p>
        </div>

        {/* Error banner */}
        {error && step === 'inspire' && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step transitions */}
        <AnimatePresence mode="wait">
          {step === 'inspire' && (
            <motion.div
              key="inspire"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <MusicPromptForm
                onSubmit={handleSubmit}
                isLoading={loading}
                canCreate={canCreate}
                cooldownSeconds={cooldownSeconds}
                creationsRemaining={creationsRemaining}
                defaultPrompt={defaultPrompt}
                remixFromId={remixFromId}
              />
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <MusicProgress progressMessage={progressMessage} onCancel={handleCancel} />
            </motion.div>
          )}

          {step === 'share' && data && aiXray && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <MusicPlayer
                music={data}
                aiXray={aiXray}
                onCreateAnother={handleCreateAnother}
                creationId={creationId ?? undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
