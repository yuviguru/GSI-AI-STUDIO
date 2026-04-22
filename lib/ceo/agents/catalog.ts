/**
 * Kid CEO agent catalog — the six agents kids can hire.
 *
 * Phase 3 decisions (from stories/phase-3/KIDCEO-PHASE-3-DECISIONS.md):
 *   - C1 / E1 / E2: unlock phases locked (design: pre_launch; marketing:
 *     launch; ops: launch; finance: early_growth).
 *   - Salary tiers: design ₹50, marketing ₹50, ops ₹40, finance ₹60,
 *     customer_success ₹45 (launch-unlock, matches marketing tier),
 *     product ₹70 (scale-unlock, heaviest).
 *
 * This is STATIC config — lives in code, not Firestore. The
 * `GET /api/ceo/agents/catalog` route returns this unchanged.
 */

import type { CeoAgentDescriptor, CeoAgentId } from '@/types';

export const AGENT_CATALOG: readonly CeoAgentDescriptor[] = [
  {
    id: 'design',
    name: 'Design Agent',
    emoji: '🎨',
    tagline: 'Logos, mottos, brand voice — what makes your business feel like YOU.',
    unlockPhase: 'pre_launch',
    salaryPerDay: 50,
    focusOptions: [
      { id: 'brand', name: 'Brand-first', description: 'Memorable identity over trends' },
      { id: 'community', name: 'Community-first', description: 'Warm and local' },
      { id: 'growth', name: 'Growth-first', description: 'Eye-catching and shareable' },
    ],
    workflows: ['brand.package'],
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    emoji: '📣',
    tagline: 'Posters, posts, word-of-mouth — gets people talking about you.',
    unlockPhase: 'launch',
    salaryPerDay: 50,
    focusOptions: [
      { id: 'growth', name: 'Growth', description: 'Reach more new customers' },
      { id: 'brand', name: 'Brand', description: 'Build a reputation that lasts' },
      { id: 'community', name: 'Community', description: 'Retain the fans you have' },
    ],
    workflows: ['marketing.firstCampaign', 'marketing.dailyPush'],
  },
  {
    id: 'ops',
    name: 'Ops Agent',
    emoji: '🛠',
    tagline: 'Hours, checklists, who does what — keeps the engine humming.',
    unlockPhase: 'launch',
    salaryPerDay: 40,
    focusOptions: [
      { id: 'reliability', name: 'Reliability', description: 'Steady hands, few surprises' },
      { id: 'speed', name: 'Speed', description: 'Move fast, fix things on the fly' },
      { id: 'quality', name: 'Quality', description: 'Best-in-class output every time' },
    ],
    workflows: ['ops.setupPackage', 'ops.scheduleCheck'],
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    emoji: '📊',
    tagline: 'Pricing, cash, break-even — tells you what the numbers really say.',
    unlockPhase: 'early_growth',
    salaryPerDay: 60,
    focusOptions: [
      { id: 'conservative', name: 'Conservative', description: 'Protect the cash cushion' },
      { id: 'balanced', name: 'Balanced', description: 'Trade-offs in moderation' },
      { id: 'aggressive', name: 'Aggressive', description: 'Spend to win market share' },
    ],
    workflows: ['finance.pricingPackage', 'finance.cashCheck'],
  },
  {
    id: 'customer_success',
    name: 'Customer Success Agent',
    emoji: '💬',
    tagline: 'Listens to feedback, fixes complaints — makes customers come back.',
    unlockPhase: 'launch',
    salaryPerDay: 45,
    focusOptions: [
      { id: 'responsive', name: 'Responsive', description: 'Every message answered fast' },
      { id: 'proactive', name: 'Proactive', description: 'Reach out before they complain' },
      { id: 'loyalty', name: 'Loyalty', description: 'Reward regulars, build a fan club' },
    ],
    // Specific workflows land in future stories; reserved here so the type
    // check lines up for the GET catalog response.
    workflows: [],
  },
  {
    id: 'product',
    name: 'Product Agent',
    emoji: '🧪',
    tagline: 'New features, experiments, R&D — figures out what to build next.',
    unlockPhase: 'scale',
    salaryPerDay: 70,
    focusOptions: [
      { id: 'iterate', name: 'Iterate', description: 'Polish what already works' },
      { id: 'experiment', name: 'Experiment', description: 'Try bold new angles' },
      { id: 'expand', name: 'Expand', description: 'New products for new customers' },
    ],
    workflows: [],
  },
];

const AGENT_BY_ID: Record<CeoAgentId, CeoAgentDescriptor> = Object.fromEntries(
  AGENT_CATALOG.map((a) => [a.id, a]),
) as Record<CeoAgentId, CeoAgentDescriptor>;

/** Resolve an agent descriptor by id. Throws if the id isn't in the
 *  catalog — should never happen in typed code but guards against
 *  stale Firestore data referencing a removed agent. */
export function getAgentDescriptor(id: CeoAgentId): CeoAgentDescriptor {
  const agent = AGENT_BY_ID[id];
  if (!agent) {
    throw new Error(`getAgentDescriptor: unknown agent id ${id}`);
  }
  return agent;
}

/** True if an agent has reached its unlock phase given the current
 *  business phase. Used by the hire route + the Team tab. */
const PHASE_ORDER: readonly string[] = ['pre_launch', 'launch', 'early_growth', 'scale', 'mature'];

export function isAgentUnlocked(
  agent: CeoAgentDescriptor,
  businessPhase: CeoAgentDescriptor['unlockPhase'],
): boolean {
  const agentIdx = PHASE_ORDER.indexOf(agent.unlockPhase);
  const businessIdx = PHASE_ORDER.indexOf(businessPhase);
  return businessIdx >= agentIdx;
}
