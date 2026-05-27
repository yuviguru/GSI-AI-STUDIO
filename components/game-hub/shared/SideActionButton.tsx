'use client';

import { motion } from 'framer-motion';

/**
 * A single floating action button used in the mobile hub's side stacks
 * (Daily / Streak / Squad on the left, Quests / Badges / Explore on the
 * right). Compact enough to flank the hero stage without crowding the
 * mascot, while staying large enough to read as a comfortable tap target.
 *
 * The component is purely presentational — the parent decides what each
 * action does on click (route navigation, tab switch, open a modal, etc).
 */
export interface SideAction {
  /** Stable React key. */
  key: string;
  /** Single emoji used as the icon glyph. */
  emoji: string;
  /** Short uppercase label displayed under the icon. */
  label: string;
  /** Optional notification pip — a number ("3"), the "!" sentinel, etc. */
  pip?: number | '!';
  /** Tailwind class for the "from" colour stop of the icon's bg-gradient.
   *  e.g. `from-amber-200`. */
  g1: string;
  /** Tailwind class for the "to" colour stop of the icon's bg-gradient.
   *  e.g. `to-amber-500`. */
  g2: string;
  /** Optional href — the parent's click handler typically routes here. */
  href?: string;
  /** When true the button is a non-interactive status badge: no tap
   *  animation, no pointer cursor, no aria-button semantics. Used for
   *  passive indicators like the current streak count. */
  passive?: boolean;
}

interface SideActionButtonProps {
  action: SideAction;
  onClick: () => void;
}

export function SideActionButton({ action, onClick }: SideActionButtonProps) {
  const sharedClasses =
    'pointer-events-auto relative flex w-[52px] flex-col items-center gap-0.5 rounded-2xl bg-white/85 p-1.5 shadow-md ring-1 ring-white/70 backdrop-blur-md';

  // Passive indicators (e.g. the streak counter) render as a div so they
  // don't show a tap animation and don't appear in the keyboard tab order.
  if (action.passive) {
    return (
      <div className={`${sharedClasses} cursor-default`} aria-label={action.label} role="status">
        <PassiveContent action={action} />
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={sharedClasses}
      aria-label={action.label}
    >
      <PassiveContent action={action} />
    </motion.button>
  );
}

/** Visual content shared between the interactive and passive variants. */
function PassiveContent({ action }: { action: SideAction }) {
  return (
    <>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${action.g1} ${action.g2} text-base shadow-sm`}
      >
        <span aria-hidden>{action.emoji}</span>
      </div>
      <span className="text-[8px] font-bold uppercase tracking-wide text-slate-600">
        {action.label}
      </span>
      {action.pip && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[8px] font-extrabold text-white">
          {action.pip}
        </span>
      )}
    </>
  );
}
