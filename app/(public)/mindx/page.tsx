import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MindXClient } from './MindXClient';

export const metadata: Metadata = {
  title: 'MindX — AI Skill Assessment | GSI AI Studio',
  description:
    'Test your Speaking, Listening, Thinking, and Reading skills with AI-powered assessments. Get personalized feedback from Koko, your AI mentor.',
};

export default function MindXPage() {
  return (
    <Suspense>
      <MindXClient />
    </Suspense>
  );
}
