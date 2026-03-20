'use client';

import { CopyButton } from './CopyButton';
import { brandColors, neutralColors, stateColors } from './tokens';
import type { ColorToken } from './tokens';

function ColorSwatch({ color }: { color: ColorToken }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-brand-border bg-white p-3 transition-all hover:shadow-soft">
      <div
        className="h-14 w-14 flex-shrink-0 rounded-lg shadow-soft"
        style={{ backgroundColor: color.hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display text-sm font-semibold text-brand-text">{color.name}</p>
          <CopyButton text={color.hex} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-caption font-mono text-brand-text-secondary">{color.hex}</code>
          <span className="text-brand-text-muted">·</span>
          <code className="text-caption font-mono text-brand-text-muted">{color.tailwind}</code>
          <CopyButton text={color.tailwind} />
        </div>
        <p className="text-caption text-brand-text-muted mt-0.5 truncate">{color.usage}</p>
      </div>
    </div>
  );
}

export function ColorSection() {
  return (
    <section id="colors" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Colors</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Vibrant yet balanced — engaging without cognitive overload.
      </p>

      {/* Brand Colors */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Brand Colors</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {brandColors.map((c) => <ColorSwatch key={c.token} color={c} />)}
      </div>

      {/* Neutral Palette */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Neutral Palette</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {neutralColors.map((c) => <ColorSwatch key={c.token} color={c} />)}
      </div>

      {/* State Colors */}
      <h3 className="text-h4 font-display text-brand-text mb-4">State Colors</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stateColors.map((c) => <ColorSwatch key={c.token} color={c} />)}
      </div>
    </section>
  );
}
