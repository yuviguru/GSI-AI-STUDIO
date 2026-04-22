import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MILESTONE_HOUR_IST,
  DEFAULT_MILESTONE_MINUTE_IST,
  DELIVERY_TOLERANCE_MS,
  IST_OFFSET_MINUTES,
  istDayKey,
  isPastTodayButSameIstDay,
  isSameIstDay,
  isWithinDeliveryWindow,
  istToUtcMs,
  nextMilestoneAtIst,
  utcToIst,
} from './cadence';

// Helper — parse an IST wall-clock string "YYYY-MM-DDTHH:mm" into a real UTC Date.
// IST is UTC+5:30 so `2026-04-22T18:30` IST = `2026-04-22T13:00` UTC.
function istWall(s: string): Date {
  const [date, time] = s.split('T');
  const [y, mo, d] = date!.split('-').map(Number);
  const [h, mi] = time!.split(':').map(Number);
  const wall = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, 0, 0));
  return new Date(istToUtcMs(wall));
}

describe('cadence — constants', () => {
  it('IST_OFFSET_MINUTES is exactly 5h30', () => {
    expect(IST_OFFSET_MINUTES).toBe(330);
  });

  it('default delivery hour is 18:30 per decision D1', () => {
    expect(DEFAULT_MILESTONE_HOUR_IST).toBe(18);
    expect(DEFAULT_MILESTONE_MINUTE_IST).toBe(30);
  });

  it('default delivery tolerance is 2 hours', () => {
    expect(DELIVERY_TOLERANCE_MS).toBe(7_200_000);
  });
});

describe('cadence — utcToIst / istToUtcMs round-trip', () => {
  it('round-trips to the same millis', () => {
    const utc = new Date('2026-04-22T13:00:00.000Z');
    const ist = utcToIst(utc);
    expect(istToUtcMs(ist)).toBe(utc.getTime());
  });

  it('utcToIst shifts the wall-clock forward by 5h30', () => {
    const utc = new Date('2026-04-22T00:00:00.000Z');
    const ist = utcToIst(utc);
    expect(ist.getUTCHours()).toBe(5);
    expect(ist.getUTCMinutes()).toBe(30);
  });
});

describe('cadence — istDayKey', () => {
  it('maps an afternoon-UTC timestamp to the correct IST day', () => {
    // 2026-04-22 13:00 UTC = 2026-04-22 18:30 IST → IST day still Apr 22.
    expect(istDayKey(new Date('2026-04-22T13:00:00.000Z'))).toBe('2026-04-22');
  });

  it('rolls to the next IST day past 18:30 UTC (which is past midnight IST)', () => {
    // 2026-04-22 18:30 UTC = 2026-04-23 00:00 IST → IST day is Apr 23.
    expect(istDayKey(new Date('2026-04-22T18:30:00.000Z'))).toBe('2026-04-23');
  });

  it('handles year/month boundary crossings', () => {
    // 2025-12-31 20:00 UTC = 2026-01-01 01:30 IST.
    expect(istDayKey(new Date('2025-12-31T20:00:00.000Z'))).toBe('2026-01-01');
  });
});

describe('cadence — isSameIstDay', () => {
  it('same IST day returns true across a UTC-day boundary', () => {
    const a = new Date('2026-04-22T19:00:00.000Z'); // 00:30 IST Apr 23
    const b = new Date('2026-04-22T20:00:00.000Z'); // 01:30 IST Apr 23
    expect(isSameIstDay(a, b)).toBe(true);
  });

  it('different IST days returns false even if close in UTC millis', () => {
    const a = new Date('2026-04-22T18:25:00.000Z'); // 23:55 IST Apr 22
    const b = new Date('2026-04-22T18:35:00.000Z'); // 00:05 IST Apr 23
    expect(isSameIstDay(a, b)).toBe(false);
  });
});

describe('cadence — nextMilestoneAtIst', () => {
  it('returns today 18:30 IST when now is earlier the same day', () => {
    const now = istWall('2026-04-22T17:00');
    const next = nextMilestoneAtIst(now);
    expect(next.getTime()).toBe(istWall('2026-04-22T18:30').getTime());
  });

  it('rolls to tomorrow when now is already past today 18:30 IST', () => {
    const now = istWall('2026-04-22T19:00');
    const next = nextMilestoneAtIst(now);
    expect(next.getTime()).toBe(istWall('2026-04-23T18:30').getTime());
  });

  it('returns tomorrow exactly when now == today 18:30 (strict >)', () => {
    const now = istWall('2026-04-22T18:30');
    const next = nextMilestoneAtIst(now);
    expect(next.getTime()).toBe(istWall('2026-04-23T18:30').getTime());
  });

  it('respects a custom delivery hour', () => {
    const now = istWall('2026-04-22T06:00');
    const next = nextMilestoneAtIst(now, 7, 0); // 07:00 IST breakfast
    expect(next.getTime()).toBe(istWall('2026-04-22T07:00').getTime());
  });

  it('throws on an invalid hour', () => {
    expect(() => nextMilestoneAtIst(new Date(), 24)).toThrow(/invalid hourIst/);
    expect(() => nextMilestoneAtIst(new Date(), -1)).toThrow(/invalid hourIst/);
  });

  it('throws on an invalid minute', () => {
    expect(() => nextMilestoneAtIst(new Date(), 18, 60)).toThrow(/invalid minuteIst/);
  });
});

describe('cadence — isWithinDeliveryWindow', () => {
  it('matches scheduled exactly on the tick', () => {
    const t = new Date('2026-04-22T13:00:00.000Z');
    expect(isWithinDeliveryWindow(t, t)).toBe(true);
  });

  it('matches 1h after scheduled (inside 2h tolerance)', () => {
    const scheduled = new Date('2026-04-22T13:00:00.000Z');
    const now = new Date(scheduled.getTime() + 60 * 60 * 1000);
    expect(isWithinDeliveryWindow(now, scheduled)).toBe(true);
  });

  it('rejects 3h after scheduled (past tolerance)', () => {
    const scheduled = new Date('2026-04-22T13:00:00.000Z');
    const now = new Date(scheduled.getTime() + 3 * 60 * 60 * 1000);
    expect(isWithinDeliveryWindow(now, scheduled)).toBe(false);
  });

  it('rejects now before scheduled (future)', () => {
    const scheduled = new Date('2026-04-22T13:00:00.000Z');
    const now = new Date(scheduled.getTime() - 60 * 1000);
    expect(isWithinDeliveryWindow(now, scheduled)).toBe(false);
  });
});

describe('cadence — isPastTodayButSameIstDay', () => {
  it('returns true when scheduled was earlier today IST', () => {
    const scheduled = istWall('2026-04-22T18:30');
    const now = istWall('2026-04-22T23:00');
    expect(isPastTodayButSameIstDay(now, scheduled)).toBe(true);
  });

  it('returns false when scheduled was yesterday IST', () => {
    const scheduled = istWall('2026-04-21T18:30');
    const now = istWall('2026-04-22T10:00');
    expect(isPastTodayButSameIstDay(now, scheduled)).toBe(false);
  });

  it('returns false when scheduled is in the future', () => {
    const scheduled = istWall('2026-04-22T18:30');
    const now = istWall('2026-04-22T17:00');
    expect(isPastTodayButSameIstDay(now, scheduled)).toBe(false);
  });
});
