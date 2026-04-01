'use client';

import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';
import { fontFamilies, typeScale } from './tokens';

export function TypographySection() {
  return (
    <section id="typography" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Typography</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Modern, readable, and slightly playful, avoiding overly common UI fonts.
      </p>

      {/* Font Families */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Font Families</h3>
      <div className="space-y-4 mb-10">
        {fontFamilies.map((font) => (
          <div key={font.name} className="rounded-lg border border-brand-border bg-white p-5 transition-all hover:shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display text-sm font-semibold text-brand-text">{font.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-caption font-mono text-brand-text-muted">{font.tailwind}</code>
                  <CopyButton text={font.tailwind} />
                </div>
              </div>
              <p className="text-caption text-brand-text-muted">{font.usage}</p>
            </div>
            <p className={cn('text-2xl text-brand-text', font.tailwind)}>
              {font.sampleText}
            </p>
            <div className="mt-3 flex gap-4">
              {[400, 500, 600, 700].map((w) => (
                <span
                  key={w}
                  className={cn('text-sm text-brand-text-secondary', font.tailwind)}
                  style={{ fontWeight: w }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Type Scale */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Type Scale</h3>
      <div className="space-y-3">
        {typeScale.map((level) => (
          <div
            key={level.token}
            className="rounded-lg border border-brand-border bg-white p-4 transition-all hover:shadow-soft"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-6">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  level.tailwind,
                  level.font === 'Satoshi' ? 'font-display' : level.font === 'JetBrains Mono' ? 'font-mono' : 'font-body',
                  'text-brand-text truncate'
                )}>
                  {level.font === 'JetBrains Mono' ? '1234567890 +200 XP' : 'The quick brown fox'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <code className="text-caption font-mono text-brand-primary bg-brand-soft rounded px-2 py-0.5">
                  {level.tailwind}
                </code>
                <CopyButton text={level.tailwind} />
                <span className="text-caption text-brand-text-muted whitespace-nowrap">
                  {level.size}
                </span>
              </div>
            </div>
            <p className="text-caption text-brand-text-muted mt-1">{level.usage}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
