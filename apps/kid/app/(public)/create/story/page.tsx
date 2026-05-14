import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StoryStudioClient } from './StoryStudioClient';

export const metadata: Metadata = {
  title: 'Story Studio — GSI AI Studio',
  description:
    'Write and illustrate AI-powered stories. Choose a theme, and AI creates a beautiful storybook for you!',
};

export default function StoryStudioPage() {
  return (
    <Suspense>
      <StoryStudioClient />
    </Suspense>
  );
}
