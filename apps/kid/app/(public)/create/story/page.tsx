import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StoryStudioClient } from './StoryStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Story Studio — GSI AI Studio',
  description:
    'Write and illustrate AI-powered stories. Choose a theme, and AI creates a beautiful storybook for you!',
};

export default function StoryStudioPage() {
  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="story" />
        </div>
      </div>
      <Suspense>
        <StoryStudioClient />
      </Suspense>
    </>
  );
}
