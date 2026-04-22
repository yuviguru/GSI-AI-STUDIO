'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, IndianRupee, Timer } from 'lucide-react';
import type { CeoWorkflowStepTrace } from '@/types';

interface WorkflowTraceProps {
  trace: CeoWorkflowStepTrace[];
  totalCostInr: number;
  /** Optional heading above the list. Defaults to "How this was made". */
  heading?: string;
}

/**
 * X-ray panel — collapsed by default (decision A4), tap to expand. Shows
 * every tool call with its model, tokens, cost, and input/output
 * summaries so kids can see exactly how the agent assembled the result.
 */
export function WorkflowTrace({ trace, totalCostInr, heading }: WorkflowTraceProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
      aria-labelledby="workflow-trace-heading"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {heading ?? 'How this was made'}
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
            <IndianRupee className="h-2.5 w-2.5" aria-hidden="true" />
            {totalCostInr}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <ol id="workflow-trace-heading" className="mt-3 space-y-2">
          {trace.map((step, idx) => (
            <TraceStepRow key={`${step.stepId}-${idx}`} step={step} index={idx + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TraceStepRow({ step, index }: { step: CeoWorkflowStepTrace; index: number }) {
  const [detail, setDetail] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
      <button
        type="button"
        onClick={() => setDetail((v) => !v)}
        aria-expanded={detail}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-slate-400">#{index}</span>
            <span className="truncate font-semibold text-slate-700">{step.stepId}</span>
            {step.failed ? (
              <span className="rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-700">
                failed
              </span>
            ) : step.attemptCount && step.attemptCount > 1 ? (
              <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                retried
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-slate-500">
            {step.tool}
            {step.model ? ` · ${step.model}` : ''}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-700">
            <IndianRupee className="h-2.5 w-2.5" aria-hidden="true" />
            {step.costInr}
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-slate-400">
            <Timer className="h-2.5 w-2.5" aria-hidden="true" />
            {Math.round(step.latencyMs / 10) / 100}s
          </div>
        </div>
      </button>
      {detail && (
        <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
          <div>
            <dt className="font-semibold text-slate-500">Input</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-600">
              {step.inputSummary || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Output</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-600">
              {step.outputSummary || '—'}
            </dd>
          </div>
          {(step.promptTokens > 0 || step.completionTokens > 0) && (
            <div className="text-slate-400">
              Tokens — in: {step.promptTokens}, out: {step.completionTokens}
            </div>
          )}
        </dl>
      )}
    </li>
  );
}
