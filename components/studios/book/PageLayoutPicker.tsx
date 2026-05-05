'use client';

import { BUCKET_LAYOUTS } from '@/lib/templates/bookTemplates';
import type { BookBucket, PageLayout } from '@/types/book.types';

interface PageLayoutPickerProps {
  bucket: BookBucket;
  current: PageLayout;
  onChange: (layout: PageLayout) => void;
  disabled?: boolean;
}

interface LayoutMeta {
  label: string;
  description: string;
}

const LAYOUT_META: Record<PageLayout, LayoutMeta> = {
  image_full_bleed: { label: 'Picture only', description: 'Big picture fills the page, words on top' },
  text_top_image_bottom: { label: 'Words + Picture', description: 'Words on top, picture on bottom' },
  image_top_text_bottom: { label: 'Picture + Words', description: 'Picture on top, words on bottom' },
  text_only: { label: 'Words only', description: 'Just your writing' },
  recipe_split: { label: 'Side by side', description: 'Picture on the side, words next to it' },
  entry_centered: { label: 'Centered', description: 'Words in the middle, like a poem' },
  concept_letter: { label: 'Big letter', description: 'A letter or number takes the page' },
  gallery: { label: 'Picture grid', description: 'Multiple pictures on one page' },
};

/**
 * Per-page layout picker. Lives at the top of the page editor so kids can
 * change how each individual page looks — picture-only for the dramatic
 * scenes, text-on-top-picture-on-bottom for the explanatory ones, words-
 * only for a quiet text moment. Allowed layouts are gated by the book's
 * bucket (BUCKET_LAYOUTS).
 *
 * Shows mini-icon previews of each layout so the kid can SEE what they're
 * picking, not just read a label.
 */
export function PageLayoutPicker({
  bucket,
  current,
  onChange,
  disabled = false,
}: PageLayoutPickerProps) {
  const allowedLayouts = BUCKET_LAYOUTS[bucket];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-gray-700">
        <span className="text-base">📐</span>
        How does this page look?
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5">
        {allowedLayouts.map((layout) => {
          const selected = current === layout;
          const meta = LAYOUT_META[layout];
          return (
            <button
              key={layout}
              type="button"
              disabled={disabled || selected}
              onClick={() => onChange(layout)}
              title={meta.description}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all ${
                selected
                  ? 'border-brand-purple bg-brand-purple/5 shadow-sm cursor-default'
                  : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
              } disabled:opacity-100`}
              aria-pressed={selected}
              aria-label={`${meta.label}: ${meta.description}`}
            >
              <LayoutIcon layout={layout} selected={selected} />
              <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-gray-900">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface LayoutIconProps {
  layout: PageLayout;
  selected: boolean;
}

function LayoutIcon({ layout, selected }: LayoutIconProps) {
  const frame = `h-9 w-7 rounded-md border ${
    selected ? 'border-brand-purple/30' : 'border-gray-300'
  } bg-white p-0.5 flex shrink-0`;

  const imgFill = selected
    ? 'bg-gradient-to-br from-purple-400 to-pink-400'
    : 'bg-gradient-to-br from-purple-200 to-pink-200';
  const textLine = selected ? 'bg-purple-300' : 'bg-gray-300';

  switch (layout) {
    case 'image_full_bleed':
      return (
        <div className={frame}>
          <div className={`flex-1 rounded-sm ${imgFill}`} />
        </div>
      );

    case 'text_top_image_bottom':
      return (
        <div className={`${frame} flex-col gap-0.5`}>
          <div className="flex flex-1 flex-col justify-center gap-0.5 px-0.5">
            <div className={`h-0.5 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-3/4 rounded-full ${textLine}`} />
          </div>
          <div className={`flex-1 rounded-sm ${imgFill}`} />
        </div>
      );

    case 'image_top_text_bottom':
      return (
        <div className={`${frame} flex-col gap-0.5`}>
          <div className={`flex-1 rounded-sm ${imgFill}`} />
          <div className="flex flex-1 flex-col justify-center gap-0.5 px-0.5">
            <div className={`h-0.5 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-3/4 rounded-full ${textLine}`} />
          </div>
        </div>
      );

    case 'text_only':
      return (
        <div className={`${frame} flex-col gap-0.5`}>
          <div className="flex flex-1 flex-col justify-center gap-0.5 px-0.5">
            <div className={`h-0.5 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-2/3 rounded-full ${textLine}`} />
            <div className={`h-0.5 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-3/4 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-1/2 rounded-full ${textLine}`} />
          </div>
        </div>
      );

    case 'recipe_split':
      return (
        <div className={`${frame} gap-0.5`}>
          <div className={`flex-1 rounded-sm ${imgFill}`} />
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            <div className={`h-0.5 rounded-full ${textLine}`} />
            <div className={`h-0.5 w-3/4 rounded-full ${textLine}`} />
            <div className={`h-0.5 rounded-full ${textLine}`} />
          </div>
        </div>
      );

    case 'entry_centered':
      return (
        <div className={`${frame} items-center justify-center`}>
          <div className="flex w-3/4 flex-col items-center gap-0.5">
            <div className={`h-0.5 w-full rounded-full ${textLine}`} />
            <div className={`h-0.5 w-2/3 rounded-full ${textLine}`} />
            <div className={`mt-0.5 h-0.5 w-3/4 rounded-full ${textLine}`} />
          </div>
        </div>
      );

    case 'concept_letter':
      return (
        <div className={`${frame} flex-col items-center gap-0.5`}>
          <div
            className={`flex flex-1 items-center justify-center text-base font-bold ${
              selected ? 'text-brand-purple' : 'text-gray-400'
            }`}
          >
            A
          </div>
          <div className={`h-0.5 w-2/3 rounded-full ${textLine}`} />
        </div>
      );

    case 'gallery':
      return (
        <div className={frame}>
          <div className="grid flex-1 grid-cols-2 gap-0.5">
            <div className={`rounded-sm ${imgFill}`} />
            <div
              className={`rounded-sm ${
                selected
                  ? 'bg-gradient-to-br from-blue-400 to-purple-400'
                  : 'bg-gradient-to-br from-blue-200 to-purple-200'
              }`}
            />
            <div
              className={`rounded-sm ${
                selected
                  ? 'bg-gradient-to-br from-pink-400 to-orange-400'
                  : 'bg-gradient-to-br from-pink-200 to-orange-200'
              }`}
            />
            <div className={`rounded-sm ${imgFill}`} />
          </div>
        </div>
      );

    default:
      return <div className={frame} />;
  }
}
