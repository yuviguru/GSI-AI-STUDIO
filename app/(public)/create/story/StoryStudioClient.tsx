'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiGeneration } from '@/hooks/useAiGeneration';
import { useSession } from '@/hooks/useSession';
import { StoryPromptForm } from '@/components/studios/story/StoryPromptForm';
import { StoryProgress } from '@/components/studios/story/StoryProgress';
import { StoryViewer } from '@/components/studios/story/StoryViewer';
import type { StoryContent, AiXrayData } from '@/types';
import type { StoryInput } from '@/lib/validators';

type StoryData = StoryContent & { title: string; moral: string };
type StudioStep = 'inspire' | 'create' | 'share';

export function StoryStudioClient() {
  const [step, setStep] = useState<StudioStep>('inspire');
  const { data, aiXray, creationId, loading, error, progressMessage, generate, reset } =
    useAiGeneration<StoryData>('story');
  const { canCreate, cooldownSeconds, creationsRemaining, trackCreation } = useSession();

  const handleSubmit = async (input: StoryInput) => {
    setStep('create');
    const result = await generate(input as unknown as Record<string, unknown>);
    if (result) {
      setStep('share');
      await trackCreation();
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
    <div className="bg-gradient-to-b from-brand-purple/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-5xl">📖</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-gray-900">Story Studio</h1>
          <p className="mt-1 text-gray-500">Write and illustrate amazing stories with AI</p>
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
              <StoryPromptForm
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
              <StoryProgress progressMessage={progressMessage} onCancel={handleCancel} />
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
              <StoryViewer
                story={data}
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
