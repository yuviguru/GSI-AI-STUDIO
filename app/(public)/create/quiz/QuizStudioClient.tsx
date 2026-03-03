'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiGeneration } from '@/hooks/useAiGeneration';
import { useSession } from '@/hooks/useSession';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { QuizPromptForm } from '@/components/studios/quiz/QuizPromptForm';
import { QuizProgress } from '@/components/studios/quiz/QuizProgress';
import { QuizPlayer } from '@/components/studios/quiz/QuizPlayer';
import type { QuizContent, AiXrayData } from '@/types';
import type { QuizInput } from '@/lib/validators';

type QuizData = QuizContent & { title: string };
type StudioStep = 'inspire' | 'create' | 'play';

export function QuizStudioClient() {
  const [step, setStep] = useState<StudioStep>('inspire');
  const { data, aiXray, creationId, loading, error, progressMessage, generate, reset } =
    useAiGeneration<QuizData>('quiz');
  const { canCreate, cooldownSeconds, creationsRemaining, trackCreation } = useSession();
  const { trackCreation: trackPointsCreation } = useAiPoints();

  const handleSubmit = async (input: QuizInput) => {
    setStep('create');
    const result = await generate(input as unknown as Record<string, unknown>);
    if (result) {
      setStep('play');
      await trackCreation();
      trackPointsCreation('quiz');
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
    <div className="bg-gradient-to-b from-brand-cyan/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-5xl">🎮</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-gray-900">Quiz Maker</h1>
          <p className="mt-1 text-gray-500">Build fun quizzes and games with AI</p>
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
              <QuizPromptForm
                onSubmit={handleSubmit}
                isLoading={loading}
                canCreate={canCreate}
                cooldownSeconds={cooldownSeconds}
                creationsRemaining={creationsRemaining}
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
              <QuizProgress progressMessage={progressMessage} onCancel={handleCancel} />
            </motion.div>
          )}

          {step === 'play' && data && aiXray && (
            <motion.div
              key="play"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <QuizPlayer
                quiz={data}
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
