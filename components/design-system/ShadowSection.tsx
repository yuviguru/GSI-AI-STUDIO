'use client';

import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';
import { shadowScale } from './tokens';

export function ShadowSection() {
  return (
    <section id="shadows" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Shadows</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Soft, floating shadows, never harsh or dark. Hover interactive cards to see transitions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {shadowScale.map((s) => (
          <div
            key={s.token}
            className={cn(
              'rounded-xl bg-white p-6 transition-all duration-300',
              s.tailwind,
              s.interactive && s.hoverTailwind,
              s.interactive && 'cursor-pointer hover:-translate-y-1'
            )}
          >
            <p className="font-display text-sm font-semibold text-brand-text mb-1">{s.token}</p>
            <div className="flex items-center gap-1 mb-2">
              <code className="text-caption font-mono text-brand-primary bg-brand-soft rounded px-2 py-0.5">
                {s.tailwind}
              </code>
              <CopyButton text={s.tailwind} />
            </div>
            <p className="text-caption text-brand-text-muted mb-2">{s.usage}</p>
            <code className="text-caption font-mono text-brand-text-muted break-all">{s.value}</code>
            {s.interactive && (
              <p className="text-caption text-brand-primary mt-2 font-medium">↕ Hover me</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
