import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ComicStudioClient } from './ComicStudioClient';

export const metadata: Metadata = {
  title: 'Comic Studio — GSI AI Studio',
  description:
    'Create multi-panel illustrated comics with AI. Choose characters, a style, and AI generates your comic strip!',
};

export default function ComicStudioPage() {
  return (
    <Suspense>
      <ComicStudioClient />
    </Suspense>
  );
}
