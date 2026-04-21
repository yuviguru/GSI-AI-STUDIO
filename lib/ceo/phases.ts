/** Kid CEO phase configuration — source of truth for the business arc.
 *
 *  Port of SimPrenuer/phases.js. Milestone names (BRAND, LOCATION, etc.) are
 *  kept identical so all SimPrenuer logic (event generation, fallback category
 *  mapping, scoring prompts) works unchanged. The milestone descriptions are
 *  kid-adapted (age 10+) — smaller stakes, school/neighbourhood scenarios,
 *  concrete pocket-money examples instead of abstract business concepts.
 *
 *  Each phase is a DAG of milestones. A milestone is "available" when all
 *  its deps are resolved. The LLM is told exactly which milestone to steer
 *  the next event toward, which keeps phase progression reliable even with
 *  weaker models. */

import type { CeoMilestoneStatus, CeoPhaseKey } from '@/types';
import { PHASE_LABELS } from './constants';

export const PHASES: readonly CeoPhaseKey[] = [
  'pre_launch',
  'launch',
  'early_growth',
  'scale',
  'mature',
] as const;

interface MilestoneDef {
  deps: string[];
  description: string;
}

interface PhaseDef {
  label: string;
  description: string;
  milestones: Record<string, MilestoneDef>;
}

export const PHASE_CONFIG: Record<CeoPhaseKey, PhaseDef> = {
  pre_launch: {
    label: PHASE_LABELS.pre_launch,
    description: 'Before you open — pick your name, your spot, your team, your price, your money plan.',
    milestones: {
      BRAND: {
        deps: [],
        description:
          'The name of your business and what makes it special. What do your friends say when they tell someone else about it?',
      },
      LOCATION: {
        deps: [],
        description:
          'Where will you run your business from? Your school canteen, a corner of your building, outside the park, online?',
      },
      INITIAL_TEAM: {
        deps: [],
        description:
          'Do you do this alone or with a friend? Splitting the work is easier but you split the money too. Who is in?',
      },
      PRICING: {
        deps: ['BRAND', 'LOCATION'],
        description:
          'How much do you charge? Cheap to get lots of customers or premium for fewer but higher-paying ones? Depends on who goes past your spot.',
      },
      FUNDING_STANCE: {
        deps: ['PRICING', 'INITIAL_TEAM'],
        description:
          'Where does the money to start come from — your piggy bank, a loan from a parent, pre-orders from friends? Only makes sense once you know what it costs.',
      },
    },
  },

  launch: {
    label: PHASE_LABELS.launch,
    description: 'You are open! Real customers. Real feedback.',
    milestones: {
      OPENING_STRATEGY: {
        deps: [],
        description:
          'Soft opening (tell a few friends first and fix things) or a big grand opening (posters, announcements, a crowd)?',
      },
      OPERATIONS_SETUP: {
        deps: [],
        description:
          'Your hours, how you keep things clean and good, who does what. Boring but it matters.',
      },
      FIRST_CUSTOMERS: {
        deps: ['OPENING_STRATEGY'],
        description:
          'How do your first real customers find out? Flyers, word of mouth, a post in the class chat, asking cousins? Only works once the launch style is set.',
      },
      EARLY_FEEDBACK: {
        deps: ['FIRST_CUSTOMERS'],
        description:
          'Someone says your lemonade is too sour. Someone says your comic is boring. How do you take it?',
      },
    },
  },

  early_growth: {
    label: PHASE_LABELS.early_growth,
    description: 'You are getting customers. Now the problems change.',
    milestones: {
      RETENTION: {
        deps: [],
        description:
          'Why do customers come back? Do you remember their names, run a loyalty card, just make the product better?',
      },
      FIRST_HIRE: {
        deps: [],
        description:
          'You need help. A cousin, a classmate, a younger sibling — who do you bring in, and how do you pay them?',
      },
      SUPPLIER_RELATIONSHIP: {
        deps: [],
        description:
          'Where do your ingredients or supplies come from? Cheapest place every time or build trust with one friendly shop?',
      },
      WORD_OF_MOUTH: {
        deps: ['RETENTION'],
        description:
          'People are talking! Do you push it — posters, shoutouts, contests — or let it grow on its own?',
      },
    },
  },

  scale: {
    label: PHASE_LABELS.scale,
    description: 'Bigger. New kinds of problems.',
    milestones: {
      EXPANSION: {
        deps: [],
        description:
          'Second stand at another school? A new flavour, new product, new season? Your first "let us do more" decision.',
      },
      COMPETITION: {
        deps: [],
        description:
          'Someone else opens the same kind of business next door. Ignore them, do it better, do it differently, or tell everyone why you came first?',
      },
      TEAM_GROWTH: {
        deps: [],
        description:
          'More people helping means more people to organise. How do you keep it fun and fair for everyone, including yourself?',
      },
      CAPITAL_STRATEGY: {
        deps: ['EXPANSION'],
        description:
          'You have saved some money. Put it back into the business, save it, or share it with the team?',
      },
    },
  },

  mature: {
    label: PHASE_LABELS.mature,
    description: 'Your business works. What next?',
    milestones: {
      STRATEGIC_PIVOT: {
        deps: [],
        description:
          'Keep doing what works or try something brand new before you get bored? Your call.',
      },
      LEGACY: {
        deps: [],
        description:
          'What happens next year when you are busier with school? Do you run it on weekends, pass it to a younger friend, or keep it as-is?',
      },
      EXIT_STRATEGY: {
        deps: ['STRATEGIC_PIVOT'],
        description:
          'Sell the whole thing to a friend? Give it to a sibling? Close it and move on? Only makes sense once you know the direction.',
      },
    },
  },
};

/** Milestone dict is FLAT across phases — one big map keyed by milestone name.
 *  Milestone names are globally unique across phases (BRAND is only in
 *  pre_launch, EXPANSION is only in scale, etc.), so a flat map works cleanly
 *  and matches the schema in docs/data-model.md. PHASE_CONFIG is the source of
 *  truth for which milestones belong to which phase. */
export type PhaseMilestones = Record<string, CeoMilestoneStatus>;

/** Initial flat milestone dict for a new business — every milestone from
 *  every phase set to 'pending'. */
export function initialMilestones(): PhaseMilestones {
  const out: PhaseMilestones = {};
  for (const phase of PHASES) {
    for (const name of Object.keys(PHASE_CONFIG[phase].milestones)) {
      out[name] = 'pending';
    }
  }
  return out;
}

/** Given a business's current phase + flat milestone dict, return milestone
 *  names (within this phase) that are unresolved AND have all their deps
 *  resolved. Deps are always within the same phase. */
export function availableMilestones(phase: CeoPhaseKey, milestones: PhaseMilestones): string[] {
  const config = PHASE_CONFIG[phase]?.milestones ?? {};

  return Object.entries(config)
    .filter(([name]) => milestones[name] !== 'resolved')
    .filter(([, def]) => def.deps.every((d) => milestones[d] === 'resolved'))
    .map(([name]) => name);
}

/** Pick the next milestone to target. Random among available so the arc feels
 *  organic (same business type played twice won't hit milestones in the same
 *  order). Returns null if the phase has no more available milestones. */
export function pickNextMilestone(phase: CeoPhaseKey, milestones: PhaseMilestones): string | null {
  const available = availableMilestones(phase, milestones);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/** True if every milestone in the phase is resolved. */
export function isPhaseComplete(phase: CeoPhaseKey, milestones: PhaseMilestones): boolean {
  const config = PHASE_CONFIG[phase]?.milestones ?? {};
  return Object.keys(config).every((name) => milestones[name] === 'resolved');
}

/** Phase after this one, or null at end of arc. */
export function nextPhase(phase: CeoPhaseKey): CeoPhaseKey | null {
  const i = PHASES.indexOf(phase);
  if (i < 0 || i >= PHASES.length - 1) return null;
  return PHASES[i + 1] ?? null;
}

/** Short description of a milestone — used in LLM prompt context. */
export function milestoneDescription(phase: CeoPhaseKey, milestone: string): string {
  return PHASE_CONFIG[phase]?.milestones?.[milestone]?.description ?? '';
}

/** Human-readable summary of what's been resolved in this phase — for prompt
 *  context. Format: "BRAND ✓, LOCATION ✓, PRICING (pending)". */
export function milestoneSummary(phase: CeoPhaseKey, milestones: PhaseMilestones): string {
  const config = PHASE_CONFIG[phase]?.milestones ?? {};
  return Object.keys(config)
    .map((name) => `${name} ${milestones[name] === 'resolved' ? '✓' : '(pending)'}`)
    .join(', ');
}
