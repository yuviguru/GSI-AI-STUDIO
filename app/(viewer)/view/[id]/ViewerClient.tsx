'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StoryViewer } from '@/components/studios/story/StoryViewer';
import { MusicPlayer } from '@/components/studios/music/MusicPlayer';
import { QuizPlayer } from '@/components/studios/quiz/QuizPlayer';
import { GamePlayer } from '@/components/studios/game/GamePlayer';
import { ComicViewer } from '@/components/studios/comic/ComicViewer';
import { ShareButton } from '@/components/shared/ShareButton';
import { RemixButton } from '@/components/shared/RemixButton';
import type { Creation, StoryContent, MusicContent, QuizContent, GameContent, ComicContent, CreationType } from '@/types/creation.types';

/** Serialized creation (dates as ISO strings from server component) */
interface SerializedCreation extends Omit<Creation, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface ViewerClientProps {
  creation: SerializedCreation;
}

const STUDIO_LINKS: Record<string, string> = {
  story: '/create/story',
  music: '/create/music',
  quiz: '/create/quiz',
  game: '/create/game',
  comic: '/create/comic',
};

const CTA_LABELS: Record<string, string> = {
  story: 'Create Your Own Story',
  music: 'Create Your Own Song',
  quiz: 'Create Your Own Quiz',
  game: 'Create Your Own Game',
  comic: 'Create Your Own Comic',
};

export function ViewerClient({ creation }: ViewerClientProps) {
  const studioLink = STUDIO_LINKS[creation.type] ?? '/';
  const ctaLabel = CTA_LABELS[creation.type] ?? 'Create Your Own';

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Type-specific viewer */}
      {creation.type === 'story' && (
        <StoryViewer
          story={creation.content as StoryContent & { title: string; moral: string }}
          aiXray={creation.aiMetadata}
          onCreateAnother={() => {}}
          creationId={creation.id}
          readOnly
        />
      )}

      {creation.type === 'music' && (
        <MusicPlayer
          music={{
            ...(creation.content as MusicContent),
            title: creation.title,
            waveformData: Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2),
          }}
          aiXray={creation.aiMetadata}
          onCreateAnother={() => {}}
          creationId={creation.id}
          readOnly
        />
      )}

      {creation.type === 'quiz' && (
        <QuizPlayer
          quiz={{
            ...(creation.content as QuizContent),
            title: creation.title,
          }}
          aiXray={creation.aiMetadata}
          onCreateAnother={() => {}}
          creationId={creation.id}
          readOnly
        />
      )}

      {creation.type === 'game' && (
        <GamePlayer
          game={{
            ...(creation.content as GameContent),
            title: creation.title,
          }}
          aiXray={creation.aiMetadata}
          onCreateAnother={() => {}}
          creationId={creation.id}
          readOnly
        />
      )}

      {creation.type === 'comic' && (
        <ComicViewer
          comic={{
            ...(creation.content as ComicContent),
            title: creation.title,
          }}
          aiXray={creation.aiMetadata}
          onCreateAnother={() => {}}
          creationId={creation.id}
          readOnly
        />
      )}

      {/* Unsupported type fallback */}
      {!['story', 'music', 'quiz', 'game', 'comic'].includes(creation.type) && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-5xl">{'\u2728'}</span>
          <h2 className="font-display text-xl font-bold text-gray-900">
            {creation.title}
          </h2>
          <p className="text-gray-500">
            This creation type is not yet supported in the viewer.
          </p>
        </div>
      )}

      {/* Remix + CTA */}
      <motion.div
        className="mt-8 flex flex-col gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <RemixButton creation={creation} variant="full" />

        <Link
          href={studioLink}
          className={cn(
            'block rounded-full bg-gradient-to-r from-brand-purple to-brand-orange py-4 text-center font-display text-lg font-bold text-white',
            'shadow-lg transition-all hover:shadow-xl active:scale-[0.98]'
          )}
        >
          {ctaLabel} with AI!
        </Link>
      </motion.div>
    </main>
  );
}
