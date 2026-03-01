import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Creations — GSI AI Studio',
  description: 'View all your AI-powered creations — stories, music, quizzes and more.',
};

export default function MyCreationsPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-5xl">✨</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
          My Creations
        </h1>
        <p className="mt-2 text-gray-600">
          Everything you&apos;ve made with AI lives here
        </p>
        <div className="mt-8 flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-sm text-gray-400">
          <span className="text-4xl">🚀</span>
          <p className="mt-3 font-display text-base font-bold text-gray-700">
            No creations yet!
          </p>
          <p className="mt-1 text-gray-400">
            Your AI masterpieces will show up here.
          </p>
          <Link
            href="/create/story"
            className="mt-5 inline-flex rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-transform hover:scale-105 active:scale-95"
          >
            Create Your First Story ✨
          </Link>
        </div>
      </div>
    </div>
  );
}
