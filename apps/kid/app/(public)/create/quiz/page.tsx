import { Suspense } from 'react';
import type { Metadata } from 'next';
import { QuizStudioClient } from './QuizStudioClient';
import { CommunityStatsBanner } from '@/components/community/CommunityStatsBanner';

export const metadata: Metadata = {
  title: 'Quiz Maker — GSI AI Studio',
  description: 'Build fun quizzes and games with AI. Pick a topic and AI creates an interactive quiz you can share!',
};

export default function QuizMakerPage() {
  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-3 z-30 -translate-x-1/2">
        <div className="pointer-events-auto">
          <CommunityStatsBanner scope="quiz" />
        </div>
      </div>
      <Suspense>
        <QuizStudioClient />
      </Suspense>
    </>
  );
}
