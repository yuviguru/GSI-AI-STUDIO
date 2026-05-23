'use client';

interface PlayerAvatarProps {
  /** Emoji fallback (used when avatarUrl is not provided). */
  emoji?: string;
  /** Persisted AI-generated avatar image. Takes precedence over the emoji. */
  avatarUrl?: string | null;
  /** Accessible name (used for the avatar image alt text). */
  name?: string;
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Percentage 0-100; fills the ring proportionally */
  progressPct?: number;
}

/**
 * Avatar with a conic-gradient progress ring and a level badge below.
 * Renders the kid's AI-generated avatar image when `avatarUrl` is provided;
 * falls back to the mascot emoji otherwise. Level badge uses
 * whitespace-nowrap so "LVL 28" never wraps to two lines.
 */
const SIZES = {
  sm: { wrap: 40, inner: 34, emoji: 'text-lg',  badgeText: 'text-[9px]',  badgePy: 'px-1.5 py-0' },
  md: { wrap: 68, inner: 62, emoji: 'text-3xl', badgeText: 'text-[9px]',  badgePy: 'px-2 py-0.5' },
  lg: { wrap: 100, inner: 92, emoji: 'text-5xl', badgeText: 'text-[10px]', badgePy: 'px-2.5 py-0.5' },
  xl: { wrap: 120, inner: 110, emoji: 'text-6xl', badgeText: 'text-[11px]', badgePy: 'px-3 py-0.5' },
};

export function PlayerAvatar({
  emoji,
  avatarUrl,
  name,
  level,
  size = 'md',
  progressPct = 78,
}: PlayerAvatarProps) {
  const dim = SIZES[size];
  // Conic gradient: filled portion = brand colors, rest = soft white
  const filledDeg = Math.max(0, Math.min(360, (progressPct / 100) * 360));
  const ringStyle: React.CSSProperties = {
    width: dim.wrap,
    height: dim.wrap,
    background: `conic-gradient(from -90deg, #5B5FFF 0deg, #8A5CFF ${filledDeg}deg, rgba(255,255,255,0.4) ${filledDeg}deg, rgba(255,255,255,0.4) 360deg)`,
    padding: '3px',
    borderRadius: '9999px',
  };

  return (
    <div className="relative inline-block">
      <div style={ringStyle}>
        {avatarUrl ? (
          /* AI-generated avatar image from onboarding (the face the kid built) */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl}
            alt={name ?? 'Player avatar'}
            className="rounded-full object-cover"
            style={{ width: dim.inner, height: dim.inner }}
          />
        ) : (
          <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 ${dim.emoji}`}
            style={{ width: dim.inner, height: dim.inner }}
          >
            {emoji}
          </div>
        )}
      </div>

      {/* Level badge — anchored below, never wraps */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 -bottom-1 ${dim.badgePy} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md ring-2 ring-white whitespace-nowrap`}
      >
        <span className={`font-mono font-bold text-white ${dim.badgeText}`}>
          LVL {level}
        </span>
      </div>
    </div>
  );
}
