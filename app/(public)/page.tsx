import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-purple/5 to-white px-4">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          GSI AI Studio
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Create with AI. Learn how it works.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Build stories, music, quizzes & games — powered by AI ✨
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <StudioCard
            href="/create/story"
            emoji="📖"
            title="Story Studio"
            description="Write & illustrate AI stories"
          />
          <StudioCard
            href="/create/music"
            emoji="🎵"
            title="Music Lab"
            description="Create songs & beats with AI"
          />
          <StudioCard
            href="/create/quiz"
            emoji="🎮"
            title="Quiz Maker"
            description="Build quizzes & games"
          />
        </div>
      </div>
    </main>
  );
}

function StudioCard({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-brand-purple/30"
    >
      <span className="text-4xl">{emoji}</span>
      <h2 className="mt-3 font-display text-lg font-bold text-gray-900 group-hover:text-brand-purple">
        {title}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
