import { ImageResponse } from '@vercel/og';
import { getCreation } from '@/lib/firebase/creationService';

export const runtime = 'nodejs';

const TYPE_ICONS: Record<string, string> = {
  story: '\uD83D\uDCD6',
  music: '\uD83C\uDFB5',
  quiz: '\uD83E\uDDE0',
  game: '\uD83C\uDFAE',
  comic: '\uD83C\uDFA8',
};

const TYPE_LABELS: Record<string, string> = {
  story: 'AI Story',
  music: 'AI Song',
  quiz: 'AI Quiz',
  game: 'AI Game',
  comic: 'AI Comic',
};

function OgImage({ title, type }: { title: string; type: string }) {
  const icon = TYPE_ICONS[type] ?? '\u2728';
  const label = TYPE_LABELS[type] ?? 'AI Creation';
  const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 50%, #F97316 100%)',
        padding: '60px 80px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 32,
          padding: '48px 64px',
          width: '100%',
          maxWidth: 1040,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Type badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#F3F4F6',
            borderRadius: 100,
            padding: '8px 24px',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 28 }}>{icon}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#7C3AED' }}>
            {label}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {displayTitle}
        </div>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 32,
            color: '#6B7280',
            fontSize: 20,
          }}
        >
          <span style={{ fontSize: 24 }}>{'\u2728'}</span>
          <span>Made with GSI AI Studio</span>
        </div>
      </div>
    </div>
  );
}

function FallbackImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 64 }}>{'\u2728'}</span>
      <div style={{ fontSize: 48, fontWeight: 700, color: 'white' }}>
        GSI AI Studio
      </div>
      <div style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.8)' }}>
        Create with AI, Learn how it works
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const creation = await getCreation(params.id);

    return new ImageResponse(
      <OgImage title={creation.title} type={creation.type} />,
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      }
    );
  } catch {
    // Fallback to generic branded image
    return new ImageResponse(
      <FallbackImage />,
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  }
}
