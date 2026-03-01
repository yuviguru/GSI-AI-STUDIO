import type { Metadata } from 'next';
import Link from 'next/link';
import { getCreation, incrementView } from '@/lib/firebase/creationService';
import { ViewerClient } from './ViewerClient';

interface ViewPageProps {
  params: { id: string };
}

const TYPE_LABELS: Record<string, string> = {
  story: 'story',
  music: 'song',
  quiz: 'quiz',
  game: 'game',
  comic: 'comic',
};

export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gsi-ai-studio.netlify.app';

  try {
    const creation = await getCreation(params.id);
    const typeLabel = TYPE_LABELS[creation.type] ?? 'creation';

    return {
      title: `${creation.title} \u2014 GSI AI Studio`,
      description: `An AI ${typeLabel} by a young creator on GSI AI Studio`,
      openGraph: {
        title: `${creation.title} \u2728`,
        description: `Check out this AI ${typeLabel} made on GSI AI Studio!`,
        images: [{ url: `${baseUrl}/api/og/${params.id}`, width: 1200, height: 630 }],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
      },
    };
  } catch {
    return {
      title: 'Creation Not Found \u2014 GSI AI Studio',
      description: 'This creation may have been removed.',
    };
  }
}

export default async function ViewCreationPage({ params }: ViewPageProps) {
  try {
    const creation = await getCreation(params.id);

    // Increment view count (fire-and-forget)
    incrementView(params.id).catch(() => {});

    // Serialize dates for client component
    const serialized = {
      ...creation,
      createdAt: creation.createdAt instanceof Date
        ? creation.createdAt.toISOString()
        : String(creation.createdAt),
      updatedAt: creation.updatedAt instanceof Date
        ? creation.updatedAt.toISOString()
        : String(creation.updatedAt),
    };

    return <ViewerClient creation={serialized} />;
  } catch {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl">{'\uD83D\uDD0D'}</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">
          Creation Not Found
        </h1>
        <p className="mt-2 max-w-sm text-gray-500">
          We couldn&apos;t find this creation. It might have been removed or the link may be incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-brand-purple px-8 py-3 font-bold text-white transition-all hover:shadow-lg active:scale-95"
        >
          Create Something Amazing!
        </Link>
      </main>
    );
  }
}
