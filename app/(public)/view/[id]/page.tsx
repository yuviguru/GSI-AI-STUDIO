import type { Metadata } from 'next';

interface ViewPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  // TODO: Fetch creation from Firestore for dynamic OG tags
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gsi-ai-studio.netlify.app';

  return {
    title: 'Check out what I made with AI! — GSI AI Studio',
    description: 'An AI creation made by a young creator on GSI AI Studio',
    openGraph: {
      title: 'Check out what I made with AI! ✨',
      description: 'Made with GSI AI Studio — Create with AI, Learn how it works',
      images: [`${baseUrl}/api/og/${params.id}`],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default function ViewCreationPage({ params }: ViewPageProps) {
  return (
    <main className="min-h-screen bg-white">
      {/* TODO: Implement in SHARE-001 */}
      {/* Full-screen immersive viewer for shared creations */}
      {/* Story → page flipper, Music → player, Quiz → interactive play */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl">✨</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">
          Creation Viewer
        </h1>
        <p className="mt-2 text-gray-500">
          Viewing creation: {params.id}
        </p>
        <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-sm text-gray-400">
          Immersive viewer coming soon — see stories/SHARE-001-whatsapp-sharing.md
        </div>
      </div>
    </main>
  );
}
