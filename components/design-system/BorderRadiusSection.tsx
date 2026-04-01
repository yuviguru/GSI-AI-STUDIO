'use client';

import { CopyButton } from './CopyButton';
import { radiusScale } from './tokens';

export function BorderRadiusSection() {
  return (
    <section id="border-radius" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Border Radius</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Soft and approachable, no sharp corners anywhere.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {radiusScale.map((r) => (
          <div key={r.token} className="flex flex-col items-center gap-3 rounded-lg border border-brand-border bg-white p-4 transition-all hover:shadow-soft">
            {/* Visual box */}
            <div
              className="h-20 w-20 border-2 border-brand-primary bg-brand-soft"
              style={{ borderRadius: r.px }}
            />

            {/* Labels */}
            <div className="text-center">
              <p className="font-display text-sm font-semibold text-brand-text">{r.token}</p>
              <p className="font-mono text-caption text-brand-text-secondary">{r.px}</p>
              <div className="flex items-center gap-1 mt-1 justify-center">
                <code className="text-caption font-mono text-brand-text-muted">{r.tailwind}</code>
                <CopyButton text={r.tailwind} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
