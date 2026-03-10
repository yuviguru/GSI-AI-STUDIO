import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BeatTheAiClient } from './BeatTheAiClient';

export const metadata: Metadata = {
  title: 'Beat the AI — GSI AI Studio',
  description:
    'Challenge AI in creative writing! Write stories, poems, captions, and quizzes, then see if you can beat the AI.',
};

export default function BeatTheAiPage() {
  return (
    <Suspense>
      <BeatTheAiClient />
    </Suspense>
  );
}
