'use client';

import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';
import { animations } from './tokens';

function AnimationDemo({ animation }: { animation: typeof animations[0] }) {
  const [key, setKey] = useState(0);

  const replay = useCallback(() => {
    setKey((k) => k + 1);
  }, []);

  return (
    <div className="rounded-xl border border-brand-border bg-white p-5 transition-all hover:shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-display text-sm font-semibold text-brand-text">{animation.name}</p>
          <p className="text-caption text-brand-text-muted">{animation.duration}</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-caption font-mono text-brand-primary bg-brand-soft rounded px-2 py-0.5">
            {animation.tailwind}
          </code>
          <CopyButton text={animation.tailwind} />
        </div>
      </div>

      {/* Demo area */}
      <div className="flex items-center justify-center h-28 rounded-lg bg-brand-background mb-3">
        <div
          key={key}
          className={cn(
            'h-14 w-14 rounded-xl gradient-primary',
            animation.tailwind
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-caption text-brand-text-muted">{animation.description}</p>
        <button
          onClick={replay}
          className="flex items-center gap-1.5 text-caption font-medium text-brand-primary hover:text-brand-ai transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Replay
        </button>
      </div>
    </div>
  );
}

export function AnimationSection() {
  return (
    <section id="animations" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Animations</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Animations reinforce progress and rewards. Click Replay to re-trigger.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {animations.map((a) => <AnimationDemo key={a.name} animation={a} />)}
      </div>
    </section>
  );
}
