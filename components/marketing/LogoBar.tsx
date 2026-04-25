import { BadgeCheck, School, Globe2, Sparkles } from 'lucide-react';

const AUTHORITIES = [
  { icon: BadgeCheck, label: 'CBSE AI & CT Aligned', sub: '2026-27 curriculum' },
  { icon: School, label: 'GSI School Network', sub: '100+ partner schools' },
  { icon: Globe2, label: 'Made in Chennai', sub: 'Built for Indian kids' },
  { icon: Sparkles, label: 'DPDPA-ready', sub: 'Safe by design' },
];

const STATS = [
  { value: '10', unit: 'AI studios', sub: 'Stories, music, games, and more' },
  { value: '12', unit: 'badges', sub: 'Earned through creation + learning' },
  { value: '100%', unit: 'safe outputs', sub: 'Every creation passes our filter' },
  { value: '₹299', unit: '/month', sub: 'Free forever tier · no card needed' },
];

export function LogoBar() {
  return (
    <section className="border-y border-brand-border bg-brand-background py-14">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Authority row */}
        <p className="text-center text-caption font-semibold uppercase tracking-wide text-brand-text-muted">
          Built for the 26 crore kids entering India&apos;s new AI curriculum
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
          {AUTHORITIES.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.label}
                className="flex flex-col items-center gap-2 rounded-xl bg-white px-3 py-4 text-center shadow-soft ring-1 ring-brand-border/60 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-primary sm:h-10 sm:w-10">
                  <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[13px] font-bold leading-tight text-brand-text sm:truncate sm:text-sm">
                    {a.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-tight text-brand-text-muted sm:mt-0 sm:truncate">
                    {a.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats row — the Stripe number-stack move */}
        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-brand-border pt-10 sm:grid-cols-4 sm:gap-6">
          {STATS.map((s) => (
            <div key={s.unit} className="text-center sm:text-left">
              <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:justify-start sm:gap-1.5">
                <span className="numeric font-display text-3xl font-extrabold text-brand-text sm:text-4xl">
                  {s.value}
                </span>
                <span className="text-caption font-semibold text-brand-text-secondary sm:text-body">
                  {s.unit}
                </span>
              </div>
              <p className="mt-1 text-caption text-brand-text-muted">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
