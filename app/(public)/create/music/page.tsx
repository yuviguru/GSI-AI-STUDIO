import type { Metadata } from 'next';
import { MusicStudioClient } from './MusicStudioClient';

export const metadata: Metadata = {
  title: 'Music Lab — GSI AI Studio',
  description: 'Create songs, beats, and lyrics with AI. Pick a mood and genre, and AI composes music for you!',
};

export default function MusicLabPage() {
  return <MusicStudioClient />;
}
