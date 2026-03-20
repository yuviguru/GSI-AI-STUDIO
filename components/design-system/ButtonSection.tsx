'use client';

import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';
import { buttonVariants, buttonSizes } from './tokens';

export function ButtonSection() {
  return (
    <section id="buttons" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Buttons</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        All buttons have 44px minimum touch targets. Hover and click to see interactions.
      </p>

      {/* Variant × Size Matrix */}
      <div className="space-y-8">
        {buttonVariants.map((variant) => (
          <div key={variant.name} className="rounded-xl border border-brand-border bg-white p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-h4 text-brand-text">{variant.name}</h3>
              <div className="flex items-center gap-1">
                <code className="text-caption font-mono text-brand-primary bg-brand-soft rounded px-2 py-0.5">
                  .{variant.cssClass}
                </code>
                <CopyButton text={variant.cssClass} />
              </div>
            </div>
            <p className="text-caption text-brand-text-muted mb-5">{variant.description}</p>

            {/* Size row */}
            <div className="flex flex-wrap items-end gap-4">
              {buttonSizes.map((size) => (
                <div key={size.name} className="flex flex-col items-center gap-2">
                  <button className={cn(variant.cssClass, size.cssClass)}>
                    {variant.name === 'Reward' ? '🏆 Claim Reward' : `${variant.name} Button`}
                  </button>
                  <span className="text-caption text-brand-text-muted">
                    {size.name} ({size.height})
                  </span>
                </div>
              ))}

              {/* Disabled */}
              <div className="flex flex-col items-center gap-2">
                <button className={cn(variant.cssClass, 'btn-md')} disabled>
                  Disabled
                </button>
                <span className="text-caption text-brand-text-muted">Disabled</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
