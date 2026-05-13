/**
 * `ops.setupPackage` — Ops Agent workflow for the OPERATIONS_SETUP
 * milestone. Produces an hours plan (day-by-day), a cleanliness +
 * quality checklist, and a division-of-labour card.
 */

import type { CeoBusiness } from '@gsi/types';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { registerWorkflow, type AnyWorkflowSpec } from './registry';
import type { WorkflowSpec, WorkflowStep } from '../executor';
import type { ClaudeToolInput, ClaudeToolOutput } from '../tools/claude';

export const DAYS_OPEN_OPTIONS = [
  'weekends_only',
  'weekdays_after_school',
  'both',
] as const;
export type DaysOpenOption = (typeof DAYS_OPEN_OPTIONS)[number];

export const SHIFTS_NEEDED_OPTIONS = ['just_me', 'with_helper'] as const;
export type ShiftsNeededOption = (typeof SHIFTS_NEEDED_OPTIONS)[number];

const NOTES_MAX_CHARS = 60;

export interface OpsSetupBrief {
  daysOpen: DaysOpenOption;
  shiftsNeeded: ShiftsNeededOption;
  notes: string;
}

function validateBrief(brief: unknown): asserts brief is OpsSetupBrief {
  if (!brief || typeof brief !== 'object') {
    throw new Error('ops.setupPackage: brief must be an object');
  }
  const b = brief as Record<string, unknown>;
  if (!DAYS_OPEN_OPTIONS.includes(b.daysOpen as DaysOpenOption)) {
    throw new Error(`ops.setupPackage: daysOpen must be one of ${DAYS_OPEN_OPTIONS.join(', ')}`);
  }
  if (!SHIFTS_NEEDED_OPTIONS.includes(b.shiftsNeeded as ShiftsNeededOption)) {
    throw new Error(
      `ops.setupPackage: shiftsNeeded must be one of ${SHIFTS_NEEDED_OPTIONS.join(', ')}`,
    );
  }
  if (typeof b.notes !== 'string') {
    throw new Error('ops.setupPackage: notes is required (can be empty)');
  }
  if (b.notes.length > NOTES_MAX_CHARS) {
    throw new Error(`ops.setupPackage: notes must be ≤ ${NOTES_MAX_CHARS} characters`);
  }
  if (b.notes.trim().length > 0) filterInput(b.notes);
}

function daysOpenLabel(d: DaysOpenOption): string {
  switch (d) {
    case 'weekends_only':
      return 'weekends only';
    case 'weekdays_after_school':
      return 'weekdays after school';
    case 'both':
      return 'every day';
  }
}

interface OpsPackageOutput {
  schedule: Array<{ day: string; open: string; close: string; notes: string }>;
  checklist: string[];
  roles: string[];
}

const opsPackageStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'ops_setup_package',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const brief = ctx.brief as OpsSetupBrief;
    const brandBlock = business.brandAssets
      ? `Brand voice: ${business.brandAssets.voice}\n`
      : '';
    const systemPrompt =
      `You are an Indian-context ops planner for a kid's small business. ` +
      `Kid is 10-17, running "${business.businessName}" (${business.businessType}) ` +
      `in ${business.location}.\n` +
      `Schedule: ${daysOpenLabel(brief.daysOpen)}. ` +
      `Team: ${brief.shiftsNeeded === 'just_me' ? 'just the kid' : 'kid + helper'}.\n` +
      `${brandBlock}` +
      `Return valid JSON (no markdown) with this shape:\n` +
      `{\n` +
      `  "schedule": [{ "day": "Mon", "open": "15:00", "close": "18:00", "notes": string }, ...],\n` +
      `  "checklist": [string, string, string, string, string, string, string],  // 5-7 short items covering cleanliness + quality\n` +
      `  "roles": [string, string, ...]  // 2-4 one-line who-does-what cards\n` +
      `}\n` +
      `Hours must be realistic for an Indian kid-run operation (not past 20:00).`;
    const userMessage = brief.notes ? `Kid's notes: "${brief.notes}"` : 'No extra notes.';
    return { systemPrompt, userMessage, json: true, maxTokens: 700, temperature: 0.7 };
  },
  toAssets: (output) => {
    const pkg = ((output as ClaudeToolOutput).json as OpsPackageOutput | null) ?? null;
    if (!pkg) return [];
    const assets: Array<
      | { type: 'schedule'; days: ReadonlyArray<{ day: string; open: string; close: string; notes: string }> }
      | { type: 'text'; kind: 'checklist' | 'role_card'; content: string }
    > = [];
    if (Array.isArray(pkg.schedule) && pkg.schedule.length > 0) {
      assets.push({
        type: 'schedule',
        days: pkg.schedule.slice(0, 7).map((d) => ({
          day: filterOutput(String(d.day ?? '')).slice(0, 10),
          open: filterOutput(String(d.open ?? '')).slice(0, 5),
          close: filterOutput(String(d.close ?? '')).slice(0, 5),
          notes: filterOutput(String(d.notes ?? '')).slice(0, 80),
        })),
      });
    }
    if (Array.isArray(pkg.checklist)) {
      const content = pkg.checklist
        .slice(0, 7)
        .map((x) => `• ${filterOutput(String(x)).slice(0, 100)}`)
        .join('\n');
      if (content) assets.push({ type: 'text', kind: 'checklist', content });
    }
    if (Array.isArray(pkg.roles)) {
      for (const r of pkg.roles.slice(0, 4)) {
        const content = filterOutput(String(r)).slice(0, 120);
        if (content) assets.push({ type: 'text', kind: 'role_card', content });
      }
    }
    return assets;
  },
};

export const OPS_SETUP_PACKAGE_WORKFLOW: WorkflowSpec<OpsSetupBrief> = {
  id: 'ops.setupPackage',
  agentId: 'ops',
  validateBrief,
  steps: [opsPackageStep] as ReadonlyArray<WorkflowStep<unknown, unknown>>,
};

registerWorkflow(OPS_SETUP_PACKAGE_WORKFLOW as unknown as AnyWorkflowSpec);
