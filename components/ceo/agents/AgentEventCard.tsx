'use client';

import { useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { useCeoAgents } from '@/hooks/useCeoAgents';
import { BrandBriefingForm, type BrandBriefValue } from './BrandBriefingForm';
import { BrandCandidateReview } from './BrandCandidateReview';
import {
  baseWorkflowCostInr,
  runMultiplier,
  type CeoAgentTool,
} from '@/lib/ceo/agents/pricing';
import type { CeoArtifact, CeoBusiness, CeoEvent, CeoWorkflowId } from '@/types';

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

  async function handleBrandSubmit(brief: BrandBriefValue) {
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
      const brief = tryExtractBrief(prevBrief) ?? {
        mood: 'playful',
        audience: 'kids_my_age',
        oneWord: business.businessName.slice(0, 20),
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

  async function handleAccept(selections: { logo: number; motto: number }) {
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
          onSubmit={handleBrandSubmit}
          predictedCostInr={predictedFirstCost}
          helperText={`Business cash: ₹${business.currentCash.toLocaleString('en-IN')}`}
        />
      )}

      {artifact && workflowId === 'brand.package' && (
        <BrandCandidateReview
          artifact={artifact}
          costInr={costInr}
          rerollCostInr={predictedRerollCost}
          onAccept={handleAccept}
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
    'marketing.firstCampaign': [],
    'marketing.dailyPush': [],
    'ops.setupPackage': [],
    'ops.scheduleCheck': [],
    'finance.pricingPackage': [],
    'finance.cashCheck': [],
  };
  const steps = STEPS[workflowId] ?? [];
  if (steps.length === 0) return 0;
  const base = baseWorkflowCostInr(steps);
  return Math.round(base * runMultiplier(runIndex));
}

/** Best-effort reconstruction of the brief from the trace's first step
 *  input summary, so a re-roll reuses the same inputs. Returns null when
 *  the summary can't be parsed. */
function tryExtractBrief(summary: string | undefined): BrandBriefValue | null {
  if (!summary) return null;
  // The summary format is "Business: X\nLocation: Y\nMood: m\nAudience: a\nOne word: ...".
  const mood = summary.match(/Mood:\s*(\w+)/i)?.[1];
  const audience = summary.match(/Audience:\s*([a-z_ ]+)/i)?.[1]?.trim().replace(/\s+/g, '_').toLowerCase();
  const oneWord = summary.match(/One word[^:]*:\s*"?([^"\n]+)"?/i)?.[1]?.trim();
  if (!mood || !audience || !oneWord) return null;
  return {
    mood: mood as BrandBriefValue['mood'],
    audience: audience as BrandBriefValue['audience'],
    oneWord: oneWord.slice(0, 20),
  };
}
