/** Phase 4 (COMPLIANCE-002): DPDP Act 2023 types shared across services. */

export type ConsentScope =
  | 'ai_generation'
  | 'data_storage'
  | 'parent_messaging'
  | 'peer_sharing'
  | 'analytics';

export type ConsentMethod = 'otp_affirmation' | 'digilocker' | 'revocation';

export interface ConsentRecord {
  id: string;
  parentUid: string;
  kidId: string;
  scope: ConsentScope;
  granted: boolean;
  method: ConsentMethod;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export type ErasureStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

export interface ErasureRequest {
  id: string;
  parentUid: string;
  kidId: string;
  reason?: string;
  status: ErasureStatus;
  cascadeSummary?: Record<string, number>;
  receiptUrl?: string;
  lastError?: string;
  createdAt: Date;
  completedAt?: Date;
}

/** Current per-scope consent state for a kid (latest record per scope). */
export type ConsentState = Partial<Record<ConsentScope, boolean>>;

export const ALL_CONSENT_SCOPES: ConsentScope[] = [
  'ai_generation',
  'data_storage',
  'parent_messaging',
  'peer_sharing',
  'analytics',
];

export const CONSENT_SCOPE_LABELS: Record<ConsentScope, { title: string; body: string }> = {
  ai_generation: {
    title: 'AI-generated support for your child',
    body: 'Run Claude / Gemini models on your child\'s creations, submissions, and teacher notes to draft progress reports, question papers, and personalized feedback.',
  },
  data_storage: {
    title: 'Store your child\'s work on GSI',
    body: 'Keep creations, submissions, badges, and learning concepts in your child\'s account so progress persists across sessions.',
  },
  parent_messaging: {
    title: 'Send you updates via Telegram / WhatsApp',
    body: 'Deliver the weekly digest, parent-teacher meeting notes, and ad-hoc teacher messages to your preferred channel. You can switch off messaging anytime.',
  },
  peer_sharing: {
    title: 'Share approved work with classmates',
    body: 'Show your child\'s teacher-approved creations in the class feed so peers can react with positive emojis. No comments in v1.',
  },
  analytics: {
    title: 'Include my child in anonymized school analytics',
    body: 'Count your child in school-level dashboards and curriculum-coverage reports. Your child is never identified individually in analytics.',
  },
};
