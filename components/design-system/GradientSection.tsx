'use client';

import { CopyButton } from './CopyButton';
import { primaryGradients, studioGradients } from './tokens';
import type { GradientToken } from './tokens';

function GradientBar({ gradient }: { gradient: GradientToken }) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-3 transition-all hover:shadow-soft">
      <div
        className={`h-16 w-full rounded-lg ${gradient.cssClass}`}
      />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-brand-text">{gradient.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <code className="text-caption font-mono text-brand-text-secondary">
              {gradient.from} → {gradient.to}
            </code>
          </div>
          <p className="text-caption text-brand-text-muted mt-0.5">{gradient.usage}</p>
        </div>
        <div className="flex items-center gap-1">
          <code className="text-caption font-mono text-brand-text-muted">.{gradient.cssClass}</code>
          <CopyButton text={gradient.cssClass} />
        </div>
      </div>
    </div>
  );
}

export function GradientSection() {
  return (
    <section id="gradients" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Gradients</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Gradients create the playful atmosphere. Use sparingly — not on every element.
      </p>

      {/* Primary Gradients */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Primary Gradients</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {primaryGradients.map((g) => <GradientBar key={g.name} gradient={g} />)}
      </div>

      {/* Studio Gradients */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Studio Gradients</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {studioGradients.map((g) => <GradientBar key={g.name} gradient={g} />)}
      </div>
    </section>
  );
}
