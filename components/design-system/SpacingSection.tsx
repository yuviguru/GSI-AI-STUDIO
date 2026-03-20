'use client';

import { CopyButton } from './CopyButton';
import { spacingScale } from './tokens';

export function SpacingSection() {
  const maxPx = spacingScale[spacingScale.length - 1]?.px ?? 64;

  return (
    <section id="spacing" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Spacing</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        All spacing follows an 8-point grid system.
      </p>

      <div className="space-y-3">
        {spacingScale.map((s) => (
          <div key={s.token} className="flex items-center gap-4 rounded-lg border border-brand-border bg-white p-3 transition-all hover:shadow-soft">
            {/* Visual bar */}
            <div
              className="h-8 rounded-md gradient-primary flex-shrink-0 transition-all duration-300"
              style={{ width: `${Math.max((s.px / maxPx) * 200, 8)}px` }}
            />

            {/* Labels */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-display text-sm font-semibold text-brand-text w-10">{s.token}</span>
              <span className="font-mono text-caption text-brand-text-secondary w-12">{s.px}px</span>
              <span className="font-mono text-caption text-brand-text-muted w-16">{s.rem}</span>
              <code className="text-caption font-mono text-brand-text-muted">{s.tailwind}</code>
              <CopyButton text={s.tailwind} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
