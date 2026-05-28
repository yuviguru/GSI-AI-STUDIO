import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GameStudioClient } from './GameStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Game Studio — GSI AI Studio',
  description:
    'Create text adventure games with AI. Describe a scenario and AI generates a branching story with choices and multiple endings!',
};

export default function GameStudioPage() {
  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="game" />
        </div>
      </div>
      <Suspense>
        <GameStudioClient />
      </Suspense>
    </>
  );
}
