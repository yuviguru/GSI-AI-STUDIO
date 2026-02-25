import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz Maker — GSI AI Studio',
  description: 'Build fun quizzes and games with AI. Pick a topic and AI creates an interactive quiz you can share!',
};

export default function QuizMakerPage() {
  return (
    <div className="bg-gradient-to-b from-brand-cyan/5 to-white px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-5xl">🎮</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
          Quiz Maker
        </h1>
        <p className="mt-2 text-gray-600">
          Build quizzes and games with AI
        </p>
        {/* TODO: Implement STUDIO-003 — QuizPromptForm + QuizPlayer */}
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-sm text-gray-400">
          Quiz creation form coming soon — see stories/STUDIO-003-quiz-creation-flow.md
        </div>
      </div>
    </div>
  );
}
