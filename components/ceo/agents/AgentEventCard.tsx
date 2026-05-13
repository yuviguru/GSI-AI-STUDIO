'use client';

import { useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { useCeoAgents } from '@/hooks/useCeoAgents';
import { BrandBriefingForm, type BrandBriefValue } from './BrandBriefingForm';
import { BrandCandidateReview } from './BrandCandidateReview';
import { CampaignBriefingForm, type CampaignBriefValue } from './CampaignBriefingForm';
import { CampaignCandidateReview } from './CampaignCandidateReview';
import { SimpleBriefingForm } from './SimpleBriefingForm';
import { TextArtifactReview } from './TextArtifactReview';
import {
  baseWorkflowCostInr,
  runMultiplier,
  type CeoAgentTool,
} from '@/lib/ceo/agents/pricing';
import type { CeoArtifact, CeoBusiness, CeoEvent, CeoWorkflowId } from '@gsi/types';

interface AgentEventCardProps {
  event: CeoEvent;
  business: CeoBusiness;
  /** Called when the milestone is fully resolved via agent flow so the
   *  parent can refresh state (business cash + pending pointers). */
  onResolved: () => void;
}

/**
 * Renders an agent-driven milestone event. Current support: BRAND
 * (`workflowId: 'brand.package'`). When the kid doesn't have the
 * matching agent hired, we auto-hire on submit — the salary check is
 * already enforced server-side.
 *
 * Three states in the card body:
 *   - briefing (initial) — shows the workflow-specific BriefingForm
 *   - running (during submit) — handled by the form's own aria-busy
 *   - review (post-run) — shows the candidates + accept/reject buttons
 */
export function AgentEventCard({ event, business, onResolved }: AgentEventCardProps) {
  const { catalog, hires, hireAgent, runWorkflow, acceptArtifact } = useCeoAgents({
    businessId: business.id,
  });

  const [artifact, setArtifact] = useState<CeoArtifact | null>(null);
  const [costInr, setCostInr] = useState<number>(0);
  const [runIndex, setRunIndex] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const workflowId = (event.agentWorkflowId ?? '') as CeoWorkflowId;
  const agent = catalog?.find((a) => a.workflows.includes(workflowId));
  const existingHire = hires.find((h) => h.agentId === agent?.id);

  if (!workflowId) {
    return (
      <AgentError
        message="This milestone is set up for an agent workflow but no workflow id is attached. Please refresh."
      />
    );
  }
  if (!agent) {
    // Catalog still loading.
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-hidden />;
  }

  // Predict first-run cost for the briefing submit button using the
  // workflow's statically-declared steps. Pricing matches what the
  // server will charge (same baseWorkflowCostInr helper).
  const predictedFirstCost = predictWorkflowCost(workflowId, 1);
  const predictedRerollCost = predictWorkflowCost(workflowId, runIndex + 1);

  async function handleSubmit(brief: BrandBriefValue | CampaignBriefValue) {
    setError(null);
    try {
      let hire = existingHire;
      if (!hire) {
        const res = await hireAgent({
          businessId: business.id,
          agentId: agent!.id,
          config: {
            focus: agent!.focusOptions[0]?.id ?? 'brand',
            aggressiveness: 'medium',
          },
        });
        hire = res.hire;
      }
      const run = await runWorkflow({
        hireId: hire.id,
        workflowId,
        brief: brief as unknown as Record<string, unknown>,
        eventId: event.id,
      });
      setArtifact(run.artifact);
      setCostInr(run.costInr);
      setRunIndex(run.runIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the workflow.');
    }
  }

  async function handleReroll() {
    if (!artifact) return;
    setError(null);
    try {
      let hire = existingHire;
      if (!hire) {
        // Shouldn't happen — first run hires — but guard anyway.
        return;
      }
      const prevBrief = artifact.trace[0]?.inputSummary;
      const brief =
        workflowId === 'brand.package'
          ? tryExtractBrandBrief(prevBrief) ?? {
              mood: 'playful',
              audience: 'kids_my_age',
              oneWord: business.businessName.slice(0, 20),
            }
          : tryExtractCampaignBrief(prevBrief) ?? {
              offer: 'discount',
              vibe: 'energetic',
              hook: business.businessName.slice(0, 25),
            };
      const run = await runWorkflow({
        hireId: hire.id,
        workflowId,
        brief: brief as unknown as Record<string, unknown>,
        eventId: event.id,
      });
      setArtifact(run.artifact);
      setCostInr(run.costInr);
      setRunIndex(run.runIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not re-roll.');
    }
  }

  async function handleBrandAccept(selections: { logo: number; motto: number }) {
    if (!artifact) return;
    setError(null);
    try {
      await acceptArtifact({
        artifactId: artifact.id,
        selections: { logo: selections.logo, motto: selections.motto },
        attachTo: { kind: 'business_field', field: 'brandAssets' },
      });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this artifact.');
    }
  }

  async function handleCampaignAccept(selections: { poster: number; post: number }) {
    if (!artifact) return;
    setError(null);
    try {
      await acceptArtifact({
        artifactId: artifact.id,
        selections: { poster: selections.poster, post: selections.post },
        attachTo: { kind: 'marketing_feed' },
      });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this campaign.');
    }
  }

  async function handleTextPackageAccept() {
    if (!artifact) return;
    setError(null);
    try {
      // Ops / Finance artifacts attach to the deciding event — their
      // assets live on the artifact (viewable via /creations-like flow
      // later) and the milestone resolves as soon as the kid accepts.
      await acceptArtifact({
        artifactId: artifact.id,
        selections: {},
        attachTo: { kind: 'event', eventId: event.id },
      });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this package.');
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <header className="mb-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          {agent.emoji}
        </span>
        <div>
          <h3 className="font-display text-base font-bold text-slate-800">
            {event.namedTitle ?? event.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Your <strong>{agent.name}</strong> will handle this one.
            {existingHire ? null : (
              <span className="ml-1 text-slate-500">
                Hiring (₹{agent.salaryPerDay}/day) on run.
              </span>
            )}
          </p>
        </div>
        {existingHire && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Users className="h-3 w-3" aria-hidden="true" /> Hired
          </span>
        )}
      </header>

      <p className="mb-3 text-sm text-slate-700">{event.description}</p>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      )}

      {!artifact && workflowId === 'brand.package' && (
        <BrandBriefingForm
          onSubmit={handleSubmit}
          predictedCostInr={predictedFirstCost}
          helperText={`Business cash: ₹${business.currentCash.toLocaleString('en-IN')}`}
        />
      )}
      {!artifact && workflowId === 'marketing.firstCampaign' && (
        <CampaignBriefingForm
          onSubmit={handleSubmit}
          predictedCostInr={predictedFirstCost}
          helperText={`Business cash: ₹${business.currentCash.toLocaleString('en-IN')}`}
        />
      )}
      {!artifact && workflowId === 'ops.setupPackage' && (
        <SimpleBriefingForm
          title="Brief your Ops Agent"
          description="Tell them when you're open, how much help you've got, and anything else they should know."
          accent="amber"
          predictedCostInr={predictedFirstCost}
          helperText={`Business cash: ₹${business.currentCash.toLocaleString('en-IN')}`}
          fields={[
            {
              id: 'daysOpen',
              label: 'When are you open?',
              options: [
                { id: 'weekends_only', label: 'Weekends only' },
                { id: 'weekdays_after_school', label: 'Weekdays after school' },
                { id: 'both', label: 'Every day' },
              ],
            },
            {
              id: 'shiftsNeeded',
              label: 'Team',
              options: [
                { id: 'just_me', label: 'Just me' },
                { id: 'with_helper', label: 'With a helper' },
              ],
            },
            {
              id: 'notes',
              label: 'Anything else',
              description: 'One line — what your agent should plan around.',
              maxChars: 60,
              placeholder: 'e.g. bike delivery on Saturdays',
              optional: true,
            },
          ]}
          onSubmit={(values) =>
            handleSubmit(values as unknown as BrandBriefValue)
          }
        />
      )}
      {!artifact && workflowId === 'finance.pricingPackage' && (
        <SimpleBriefingForm
          title="Brief your Finance Agent"
          description="Pick a pricing strategy and a target margin. They'll come back with three real numbers + break-even math."
          accent="sky"
          predictedCostInr={predictedFirstCost}
          helperText={`Business cash: ₹${business.currentCash.toLocaleString('en-IN')}`}
          fields={[
            {
              id: 'strategy',
              label: 'Pricing strategy',
              options: [
                { id: 'volume', label: 'Volume' },
                { id: 'premium', label: 'Premium' },
                { id: 'mixed', label: 'Mixed' },
              ],
            },
            {
              id: 'targetMargin',
              label: 'Target margin',
              options: [
                { id: 'tight', label: 'Tight (cheaper, more sales)' },
                { id: 'fair', label: 'Fair' },
                { id: 'fat', label: 'Fat (fewer sales, bigger margin)' },
              ],
            },
            {
              id: 'notes',
              label: 'Anything else',
              description: 'Context your agent should weigh — ingredients, competitors, etc.',
              maxChars: 40,
              placeholder: 'e.g. mango season',
              optional: true,
            },
          ]}
          onSubmit={(values) =>
            handleSubmit(values as unknown as BrandBriefValue)
          }
        />
      )}

      {artifact && workflowId === 'brand.package' && (
        <BrandCandidateReview
          artifact={artifact}
          costInr={costInr}
          rerollCostInr={predictedRerollCost}
          onAccept={handleBrandAccept}
          onReroll={handleReroll}
        />
      )}
      {artifact && workflowId === 'marketing.firstCampaign' && (
        <CampaignCandidateReview
          artifact={artifact}
          costInr={costInr}
          rerollCostInr={predictedRerollCost}
          onAccept={handleCampaignAccept}
          onReroll={handleReroll}
        />
      )}
      {artifact && workflowId === 'ops.setupPackage' && (
        <TextArtifactReview
          artifact={artifact}
          costInr={costInr}
          rerollCostInr={predictedRerollCost}
          title="Your ops plan"
          acceptLabel="Lock this in"
          accent="amber"
          onAccept={handleTextPackageAccept}
          onReroll={handleReroll}
        />
      )}
      {artifact && workflowId === 'finance.pricingPackage' && (
        <TextArtifactReview
          artifact={artifact}
          costInr={costInr}
          rerollCostInr={predictedRerollCost}
          title="Three pricing candidates"
          acceptLabel="Use this pricing"
          accent="sky"
          onAccept={handleTextPackageAccept}
          onReroll={handleReroll}
        />
      )}
    </div>
  );
}

function AgentError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
      {message}
    </div>
  );
}

/** Client-side cost prediction. Matches the server's
 *  `baseWorkflowCostInr × runMultiplier` math, but declared here because
 *  the client doesn't import the workflow registry (SSR-only). Keep in
 *  sync when adding a new workflow — tests in the registry guard the
 *  shape. */
function predictWorkflowCost(workflowId: CeoWorkflowId, runIndex: number): number {
  const STEPS: Record<CeoWorkflowId, Array<{ tool: CeoAgentTool; unitCount?: number }>> = {
    'brand.package': [
      { tool: 'claude_haiku' },
      { tool: 'flux_schnell' },
      { tool: 'flux_schnell' },
      { tool: 'flux_schnell' },
      { tool: 'claude_haiku' },
    ],
    'marketing.firstCampaign': [
      { tool: 'claude_haiku' },
      { tool: 'flux_schnell' },
      { tool: 'flux_schnell' },
      { tool: 'flux_schnell' },
      { tool: 'claude_haiku' },
    ],
    'marketing.dailyPush': [],
    'ops.setupPackage': [{ tool: 'claude_haiku' }],
    'ops.scheduleCheck': [{ tool: 'claude_haiku' }],
    'finance.pricingPackage': [
      { tool: 'claude_haiku' },
      { tool: 'deterministic' },
    ],
    'finance.cashCheck': [{ tool: 'claude_haiku' }],
  };
  const steps = STEPS[workflowId] ?? [];
  if (steps.length === 0) return 0;
  const base = baseWorkflowCostInr(steps);
  return Math.round(base * runMultiplier(runIndex));
}

/** Best-effort reconstruction of the BRAND brief from the trace's first
 *  step input summary. Returns null when the summary can't be parsed.  */
function tryExtractBrandBrief(summary: string | undefined): BrandBriefValue | null {
  if (!summary) return null;
  const mood = summary.match(/Mood:\s*(\w+)/i)?.[1];
  const audience = summary
    .match(/Audience:\s*([a-z_ ]+)/i)?.[1]
    ?.trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  const oneWord = summary.match(/One word[^:]*:\s*"?([^"\n]+)"?/i)?.[1]?.trim();
  if (!mood || !audience || !oneWord) return null;
  return {
    mood: mood as BrandBriefValue['mood'],
    audience: audience as BrandBriefValue['audience'],
    oneWord: oneWord.slice(0, 20),
  };
}

/** Same shape for the CAMPAIGN brief. */
function tryExtractCampaignBrief(summary: string | undefined): CampaignBriefValue | null {
  if (!summary) return null;
  const hookMatch = summary.match(/hook:\s*"?([^"\n]+)"?/i)?.[1]?.trim();
  if (!hookMatch) return null;
  return {
    offer: 'discount',
    vibe: 'energetic',
    hook: hookMatch.slice(0, 25),
  };
}
