import { Suspense } from 'react';
import type { Metadata } from 'next';
import { QuizStudioClient } from './QuizStudioClient';

export const metadata: Metadata = {
  title: 'Quiz Maker — GSI AI Studio',
  description: 'Build fun quizzes and games with AI. Pick a topic and AI creates an interactive quiz you can share!',
};

export default function QuizMakerPage() {
  return (
    <Suspense>
      <QuizStudioClient />
    </Suspense>
  );
}
