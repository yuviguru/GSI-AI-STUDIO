/**
 * Fedena reference adapter — placeholder.
 *
 * Full implementation lands with the Sprint 7-8 INTEGRATION-001 work once
 * we have a partner school using Fedena. The presence of this module
 * reserves the adapter identity and keeps the interface wiring stable so
 * callers can register it without code churn when we're ready.
 */

import {
  registerSchoolDataProvider,
  type AttendanceRecord,
  type DateRange,
  type ProviderHealth,
  type RosterEntry,
  type SchoolDataProvider,
  type TimetableRecord,
} from '../schoolDataProvider';
import { AppException } from '@/lib/api-utils';

export class FedenaProvider implements SchoolDataProvider {
  readonly id = 'fedena' as const;

  async fetchRoster(_schoolId: string): Promise<RosterEntry[]> {
    throw notImplemented('fetchRoster');
  }

  async fetchAttendance(
    _schoolId: string,
    _range: DateRange,
  ): Promise<AttendanceRecord[]> {
    throw notImplemented('fetchAttendance');
  }

  async fetchTimetable(_schoolId: string): Promise<TimetableRecord[]> {
    throw notImplemented('fetchTimetable');
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      id: this.id,
      ok: false,
      message: 'FedenaProvider is registered but not yet implemented.',
      checkedAt: new Date(),
    };
  }
}

function notImplemented(method: string): AppException {
  return new AppException(
    'INTEGRATION_NOT_READY',
    `FedenaProvider.${method} is not implemented yet — schedule with INTEGRATION-001 Sprint 7-8.`,
    501,
  );
}

registerSchoolDataProvider('fedena', async () => new FedenaProvider());
