import type { Metadata } from 'next';
import { StoryStudioClient } from './StoryStudioClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Story Studio — GSI AI Studio',
  description:
    'Write and illustrate AI-powered stories. Choose a theme, and AI creates a beautiful storybook for you!',
};

export default function StoryStudioPage() {
  return <StoryStudioClient />;
}
