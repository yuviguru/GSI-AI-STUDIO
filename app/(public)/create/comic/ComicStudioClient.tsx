'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Palette } from 'lucide-react';
import { useAiGeneration } from '@/hooks/useAiGeneration';
import { useSession } from '@/hooks/useSession';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { ComicPromptForm } from '@/components/studios/comic/ComicPromptForm';
import { ComicProgress } from '@/components/studios/comic/ComicProgress';
import { ComicViewer } from '@/components/studios/comic/ComicViewer';
import type { ComicContent } from '@/types';
import type { ComicInput } from '@/lib/validators';

type ComicData = ComicContent;
type StudioStep = 'inspire' | 'create' | 'share';

export function ComicStudioClient() {
  const searchParams = useSearchParams();
  const remixFromId = searchParams.get('remix') ?? undefined;
  const defaultPrompt = searchParams.get('prompt') ?? undefined;

  const [step, setStep] = useState<StudioStep>('inspire');
  const { data, aiXray, creationId, loading, error, progressMessage, generate, reset } =
    useAiGeneration<ComicData>('comic');
  const { canCreate, cooldownSeconds, creationsRemaining, trackCreation } = useSession();
  const { trackCreation: trackPointsCreation } = useAiPoints();

  const handleSubmit = async (input: ComicInput) => {
    setStep('create');
    const result = await generate(input as unknown as Record<string, unknown>);
    if (result) {
      setStep('share');
      await trackCreation();
      trackPointsCreation('comic');
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        {step === 'share' ? (
          <div className="mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-purple"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-center gap-3">
            <Palette className="h-8 w-8 text-amber-500" />
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Comic Studio</h1>
              <p className="text-sm text-gray-500">Create illustrated comics with AI</p>
            </div>
          </div>
        )}

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
              <ComicPromptForm
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
              <ComicProgress progressMessage={progressMessage} onCancel={handleCancel} />
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
              <ComicViewer
                comic={data}
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
