import type { Metadata } from 'next';
import { MyCreationsClient } from './MyCreationsClient';

export const metadata: Metadata = {
  title: 'My Creations — GSI AI Studio',
  description: 'View all your AI-powered creations — stories, music, quizzes and more.',
};

export default function MyCreationsPage() {
  return <MyCreationsClient />;
}
