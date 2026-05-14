'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Plus, Trash2, Zap } from 'lucide-react';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useCeoAgents } from '@/hooks/useCeoAgents';
import type {
  CeoAgentId,
  CeoBusiness,
  CeoCustomTrigger,
  CeoCustomWorkflow,
  CeoWorkflowId,
} from '@gsi/types';

interface WorkflowBuilderTabProps {
  business: CeoBusiness;
}

const TRIGGERS: Array<{ id: CeoCustomTrigger; label: string; needsThreshold: boolean }> = [
  { id: 'negative_customer_feedback', label: 'A customer complains', needsThreshold: false },
  { id: 'positive_customer_feedback', label: 'A customer raves', needsThreshold: false },
  { id: 'cash_below_threshold', label: 'Cash drops below ₹X', needsThreshold: true },
  { id: 'cash_above_threshold', label: 'Cash climbs above ₹X', needsThreshold: true },
  { id: 'reputation_below_threshold', label: 'Reputation dips under X', needsThreshold: true },
  { id: 'new_phase_reached', label: 'You hit a new phase', needsThreshold: false },
  { id: 'milestone_missed', label: 'A Big Choice expires', needsThreshold: false },
  { id: 'end_of_day', label: 'End of day (9 PM IST)', needsThreshold: false },
];

/**
 * Scale-phase Workflow Builder — kid-authored IF-trigger THEN-agent
 * recipes. Shipping the persistence + author-and-list UI; the
 * background runner that actually fires these when triggers hit lands
 * in a follow-up (see the "coming soon" banner).
 *
 * The React Flow drag-drop canvas the story originally locked (W2) is
 * deferred — this form-based MVP covers the same shape in ≤ 30 seconds
 * per recipe and fits the kid-attention budget better.
 */
export function WorkflowBuilderTab({ business }: WorkflowBuilderTabProps) {
  const { getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const kidId = activeKid?.id ?? null;
  const { catalog } = useCeoAgents({ businessId: business.id });

  const [recipes, setRecipes] = useState<CeoCustomWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!kidId) return;
    setLoading(true);
    try {
      const res = await fetchWithKidAuth(
        `/api/ceo/custom-workflows?businessId=${encodeURIComponent(business.id)}`,
        { getIdToken, kidId },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to load recipes');
      setRecipes(json.data.workflows ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [business.id, getIdToken, kidId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      aria-labelledby="wfb-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700"
          aria-hidden="true"
        >
          <Zap className="h-4 w-4" />
        </span>
        <h2
          id="wfb-heading"
          className="font-display text-xs font-bold uppercase tracking-wider text-amber-700"
        >
          Automation recipes
        </h2>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Preview — firing lands next release
        </span>
      </header>

      <RecipeCreator business={business} onCreated={refresh} agents={catalog ?? []} />

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
        ) : recipes.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            No recipes yet. Try: <em>If a customer complains, have Customer Success write an
            apology.</em>
          </p>
        ) : (
          recipes.map((r) => <RecipeRow key={r.id} recipe={r} onChanged={refresh} />)
        )}
      </div>
    </section>
  );
}

function RecipeCreator({
  business,
  agents,
  onCreated,
}: {
  business: CeoBusiness;
  agents: ReadonlyArray<{ id: CeoAgentId; name: string; workflows: ReadonlyArray<CeoWorkflowId> }>;
  onCreated: () => Promise<void> | void;
}) {
  const { getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const kidId = activeKid?.id ?? null;
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<CeoCustomTrigger>('negative_customer_feedback');
  const [threshold, setThreshold] = useState<number>(500);
  const [agentId, setAgentId] = useState<CeoAgentId>('customer_success');
  const [workflowId, setWorkflowId] = useState<CeoWorkflowId | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const needsThreshold = useMemo(
    () => TRIGGERS.find((t) => t.id === trigger)?.needsThreshold ?? false,
    [trigger],
  );

  const availableWorkflows = useMemo(() => {
    return agents.find((a) => a.id === agentId)?.workflows ?? [];
  }, [agents, agentId]);

  useEffect(() => {
    // Reset workflow choice when agent changes so we don't persist a
    // mismatched pair.
    if (availableWorkflows.length === 0) {
      setWorkflowId('');
    } else if (!availableWorkflows.includes(workflowId as CeoWorkflowId)) {
      setWorkflowId(availableWorkflows[0]!);
    }
  }, [availableWorkflows, workflowId]);

  const canSubmit = name.trim().length > 0 && workflowId && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !kidId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetchWithKidAuth('/api/ceo/custom-workflows', {
        getIdToken,
        kidId,
      }, {
        method: 'POST',
        body: JSON.stringify({
          businessId: business.id,
          name: name.trim(),
          trigger,
          triggerThreshold: needsThreshold ? threshold : undefined,
          agentId,
          workflowId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Could not save recipe');
      setName('');
      await onCreated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save recipe');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Create a recipe
      </p>
      <div className="grid gap-2">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Apologise when a customer complains"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              When this happens
            </span>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as CeoCustomTrigger)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {TRIGGERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {needsThreshold && (
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Threshold
              </span>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                min={0}
                max={100000}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Have this agent
            </span>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value as CeoAgentId)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Run this workflow
            </span>
            <select
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value as CeoWorkflowId)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={availableWorkflows.length === 0}
            >
              {availableWorkflows.length === 0 ? (
                <option value="">(this agent has no workflows yet)</option>
              ) : (
                availableWorkflows.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>
      {submitError && (
        <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700" role="alert">
          {submitError}
        </p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting}
        className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {submitting ? 'Saving…' : 'Save recipe'}
      </button>
    </form>
  );
}

function RecipeRow({
  recipe,
  onChanged,
}: {
  recipe: CeoCustomWorkflow;
  onChanged: () => Promise<void> | void;
}) {
  const { getIdToken } = useAuth();
  const { activeKid } = useKidProfile();
  const kidId = activeKid?.id ?? null;
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!kidId) return;
    setBusy(true);
    try {
      await fetchWithKidAuth(`/api/ceo/custom-workflows/${recipe.id}`, {
        getIdToken,
        kidId,
      }, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !recipe.enabled }),
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!kidId) return;
    setBusy(true);
    try {
      await fetchWithKidAuth(`/api/ceo/custom-workflows/${recipe.id}`, {
        getIdToken,
        kidId,
      }, {
        method: 'DELETE',
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{recipe.name}</p>
        <p className="text-xs text-slate-500">
          <strong>If</strong> {triggerLabel(recipe.trigger)}
          {recipe.triggerThreshold !== undefined ? ` (${recipe.triggerThreshold})` : ''}
          <strong> then </strong>
          {recipe.agentId} runs {recipe.workflowId}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Fired {recipe.firedCount}× · {recipe.enabled ? 'Enabled' : 'Paused'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={recipe.enabled ? 'Pause recipe' : 'Enable recipe'}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        >
          {recipe.enabled ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label="Delete recipe"
          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function triggerLabel(t: CeoCustomTrigger): string {
  return TRIGGERS.find((x) => x.id === t)?.label.toLowerCase() ?? t;
}
