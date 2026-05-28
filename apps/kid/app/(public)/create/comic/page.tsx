import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ComicStudioClient } from './ComicStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Comic Studio — GSI AI Studio',
  description:
    'Create illustrated comics with AI. Pick a story idea and AI draws your comic strip with dialogue bubbles!',
};

export default function ComicStudioPage() {
  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="comic" />
        </div>
      </div>
      <Suspense>
        <ComicStudioClient />
      </Suspense>
    </>
  );
}
