import type { Metadata } from 'next';
import { HomeClient } from './HomeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GSI AI Studio — Create with AI, Learn How It Works',
  description:
    'AI creation platform for Indian kids. Build stories, music, quizzes and games with AI while learning how artificial intelligence works.',
};

export default function HomePage() {
  return <HomeClient />;
}
