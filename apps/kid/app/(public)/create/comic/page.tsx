import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ComicStudioClient } from './ComicStudioClient';

export const metadata: Metadata = {
  title: 'Comic Studio — GSI AI Studio',
  description:
    'Create illustrated comics with AI. Pick a story idea and AI draws your comic strip with dialogue bubbles!',
};

export default function ComicStudioPage() {
  return (
    <Suspense>
      <ComicStudioClient />
    </Suspense>
  );
}
