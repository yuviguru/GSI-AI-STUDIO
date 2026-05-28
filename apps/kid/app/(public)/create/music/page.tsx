import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MusicStudioClient } from './MusicStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Music Lab — GSI AI Studio',
  description: 'Create songs, beats, and lyrics with AI. Pick a mood and genre, and AI composes music for you!',
};

export default function MusicLabPage() {
  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="music" />
        </div>
      </div>
      <Suspense>
        <MusicStudioClient />
      </Suspense>
    </>
  );
}
