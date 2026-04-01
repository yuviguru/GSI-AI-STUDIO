import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SkillArenaClient } from './SkillArenaClient';

export const metadata: Metadata = {
  title: 'MindX Skill Arena | GSI AI Studio',
  description:
    'Build the skills you need to command AI: speaking, listening, thinking, and reading. Get personalized feedback and band scores!',
};

export default function SkillArenaPage() {
  return (
    <Suspense>
      <SkillArenaClient />
    </Suspense>
  );
}
