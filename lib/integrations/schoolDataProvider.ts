/**
 * Phase 4 (INTEGRATION-001): provider-agnostic school-data interface.
 *
 * GSI's own Firestore is the default backing store (LocalProvider). Third-
 * party ERPs plug in behind this interface — first reference adapter is
 * Fedena in Sprint 7-8, then MasterSoft / Schoollog / Neverskip on
 * demand. Consumers (A1 HPC, B3 sub finder, B4 compliance) never
 * hard-code ERP calls.
 */

import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';

export type SchoolDataProviderId =
  | 'local'
  | 'fedena'
  | 'mastersoft'
  | 'schoollog'
  | 'neverskip';

export interface RosterEntry {
  kidId: string;
  classId: string;
  name: string;
  grade?: string;
  section?: string;
  joinedAt: Date;
}

export interface AttendanceRecord {
  kidId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface TimetableRecord {
  teacherUid: string;
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  periodIdx: number;
  subject: string;
  classId: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ProviderHealth {
  id: SchoolDataProviderId;
  ok: boolean;
  message?: string;
  checkedAt: Date;
}

export interface SchoolDataProvider {
  readonly id: SchoolDataProviderId;
  fetchRoster(schoolId: string): Promise<RosterEntry[]>;
  fetchAttendance(schoolId: string, range: DateRange): Promise<AttendanceRecord[]>;
  fetchTimetable(schoolId: string): Promise<TimetableRecord[]>;
  healthCheck(): Promise<ProviderHealth>;
}

// ─── Integration config ───────────────────────────────────────────────────

export interface ErpIntegrationConfig {
  schoolId: string;
  provider: SchoolDataProviderId;
  /** Opaque reference to the encrypted credentials bundle in secure storage. */
  credentialsRef?: string;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failure';
  lastError?: string;
  enabled: boolean;
}

const INTEGRATIONS_COLLECTION = 'erpIntegrations';

export async function getErpIntegrationConfig(
  schoolId: string,
): Promise<ErpIntegrationConfig | null> {
  const doc = await adminDb.collection(INTEGRATIONS_COLLECTION).doc(schoolId).get();
  if (!doc.exists) return null;
  const data = doc.data() as Record<string, unknown>;
  return {
    schoolId,
    provider: data.provider as SchoolDataProviderId,
    credentialsRef: data.credentialsRef as string | undefined,
    lastSyncAt: (data.lastSyncAt as { toDate?: () => Date } | undefined)?.toDate?.(),
    lastSyncStatus: data.lastSyncStatus as 'success' | 'failure' | undefined,
    lastError: data.lastError as string | undefined,
    enabled: (data.enabled as boolean | undefined) ?? true,
  };
}

// ─── resolveProvider: the public entry point ──────────────────────────────

const adapterRegistry = new Map<
  SchoolDataProviderId,
  () => Promise<SchoolDataProvider>
>();

/** Register an adapter factory. Called once per provider at module load. */
export function registerSchoolDataProvider(
  id: SchoolDataProviderId,
  factory: () => Promise<SchoolDataProvider>,
): void {
  adapterRegistry.set(id, factory);
}

/**
 * Resolve the provider to use for a given school. Reads
 * `erpIntegrations/{schoolId}`; falls back to LocalProvider when no config
 * is present or when the integration is disabled.
 */
export async function resolveProvider(schoolId: string): Promise<SchoolDataProvider> {
  const config = await getErpIntegrationConfig(schoolId);
  const id: SchoolDataProviderId = config?.enabled ? config.provider : 'local';

  const factory = adapterRegistry.get(id);
  if (!factory) {
    if (id === 'local') {
      throw new AppException(
        'INTEGRATION_NOT_REGISTERED',
        'Local provider is not registered. Import lib/integrations/adapters/localProvider to register it.',
        500,
      );
    }
    // Fall back to local if a configured adapter is not available.
    const localFactory = adapterRegistry.get('local');
    if (!localFactory) {
      throw new AppException(
        'INTEGRATION_NOT_REGISTERED',
        'No adapters are registered.',
        500,
      );
    }
    return localFactory();
  }

  return factory();
}
