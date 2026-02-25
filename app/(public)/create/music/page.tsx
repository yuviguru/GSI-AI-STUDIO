import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Lab — GSI AI Studio',
  description: 'Create songs, beats, and lyrics with AI. Pick a mood and genre, and AI composes music for you!',
};

export default function MusicLabPage() {
  return (
    <div className="bg-gradient-to-b from-brand-orange/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-5xl">🎵</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
          Music Lab
        </h1>
        <p className="mt-2 text-gray-600">
          Create songs and beats with AI
        </p>
        {/* TODO: Implement STUDIO-002 — MusicPromptForm + MusicPlayer */}
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-sm text-gray-400">
          Music creation form coming soon — see stories/STUDIO-002-music-creation-flow.md
        </div>
      </div>
    </div>
  );
}
