import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Story Studio — GSI AI Studio',
  description: 'Write and illustrate AI-powered stories. Choose a theme, and AI creates a beautiful storybook for you!',
};

export default function StoryStudioPage() {
  return (
    <div className="bg-gradient-to-b from-brand-purple/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-5xl">📖</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
          Story Studio
        </h1>
        <p className="mt-2 text-gray-600">
          Write and illustrate amazing stories with AI
        </p>
        {/* TODO: Implement STUDIO-001 — StoryPromptForm + StoryViewer */}
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-sm text-gray-400">
          Story creation form coming soon — see stories/STUDIO-001-story-creation-flow.md
        </div>
      </div>
    </div>
  );
}
