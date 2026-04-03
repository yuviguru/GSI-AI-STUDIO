'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { useAiGeneration } from '@/hooks/useAiGeneration';
import { useSession } from '@/hooks/useSession';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { GamePromptForm } from '@/components/studios/game/GamePromptForm';
import { GameProgress } from '@/components/studios/game/GameProgress';
import { GamePlayer } from '@/components/studios/game/GamePlayer';
import type { GameContent, AiXrayData } from '@/types';
import type { GameInput } from '@/lib/validators';

type GameData = GameContent & { title: string };
type StudioStep = 'inspire' | 'create' | 'share';

export function GameStudioClient() {
  const searchParams = useSearchParams();
  const remixFromId = searchParams.get('remix') ?? undefined;
  const defaultPrompt = searchParams.get('prompt') ?? undefined;

  const [step, setStep] = useState<StudioStep>('inspire');
  const { data, aiXray, creationId, loading, error, progressMessage, generate, reset } =
    useAiGeneration<GameData>('game');
  const { canCreate, cooldownSeconds, creationsRemaining, trackCreation } = useSession();
  const { trackCreation: trackPointsCreation } = useAiPoints();

  const handleSubmit = async (input: GameInput) => {
    setStep('create');
    const result = await generate(input as unknown as Record<string, unknown>);
    if (result) {
      setStep('share');
      await trackCreation();
      trackPointsCreation('game');
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
    <div className="bg-gradient-to-b from-emerald-500/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <Gamepad2 className="mx-auto h-12 w-12 text-cyan-500" />
          <h1 className="mt-3 font-display text-3xl font-bold text-gray-900">Game Studio</h1>
          <p className="mt-1 text-gray-500">Create text adventures with AI</p>
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
              <GamePromptForm
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
              <GameProgress progressMessage={progressMessage} onCancel={handleCancel} />
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
              <GamePlayer
                game={data}
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
