import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SkillArenaClient } from './SkillArenaClient';

export const metadata: Metadata = {
  title: 'MindX Skill Arena — GSI AI Studio',
  description:
    'Test your Speaking, Listening, Thinking, and Reading skills with AI-powered assessments. Get personalized feedback and band scores!',
};

export default function SkillArenaPage() {
  return (
    <Suspense>
      <SkillArenaClient />
    </Suspense>
  );
}
