import type { Metadata } from 'next';
import { ExploreClient } from './ExploreClient';

export const metadata: Metadata = {
  title: 'Explore | GSI AI Studio',
  description: 'Discover amazing AI creations from the community — stories, music, quizzes and more!',
};

export default function ExplorePage() {
  return <ExploreClient />;
}
