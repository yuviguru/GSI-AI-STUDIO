import { cn } from '@/lib/utils';

interface Props {
  /** "default" sits on a white surface; "onColor" sits on a colored surface. */
  variant?: 'default' | 'onColor';
}

/**
 * Small corner ribbon shown on widgets backed by placeholder data, so the
 * gap is visible in the product (not just in the backlog).
 */
export function PlaceholderRibbon({ variant = 'default' }: Props) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute right-2 top-2 z-10 select-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        variant === 'default'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-white/85 text-amber-700',
      )}
      title="Placeholder data — wire up the real data source in lib/dashboard/placeholders.ts"
    >
      Demo
    </span>
  );
}
