import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PHASES,
  PHASE_CONFIG,
  initialMilestones,
  availableMilestones,
  pickNextMilestone,
  isPhaseComplete,
  nextPhase,
  milestoneDescription,
  milestoneSummary,
} from './phases';

describe('initialMilestones', () => {
  it('returns every milestone from every phase set to pending', () => {
    const m = initialMilestones();
    for (const phase of PHASES) {
      for (const name of Object.keys(PHASE_CONFIG[phase].milestones)) {
        expect(m[name]).toBe('pending');
      }
    }
  });

  it('returns exactly 20 milestones (sum across 5 phases)', () => {
    expect(Object.keys(initialMilestones())).toHaveLength(20);
  });
});

describe('availableMilestones', () => {
  it('returns dep-free milestones in pre_launch when nothing resolved', () => {
    const avail = availableMilestones('pre_launch', initialMilestones());
    expect(avail).toEqual(expect.arrayContaining(['BRAND', 'LOCATION', 'INITIAL_TEAM']));
    expect(avail).not.toContain('PRICING');
    expect(avail).not.toContain('FUNDING_STANCE');
  });

  it('unlocks PRICING only after BRAND AND LOCATION resolved', () => {
    const m = initialMilestones();
    m.BRAND = 'resolved';
    expect(availableMilestones('pre_launch', m)).not.toContain('PRICING');
    m.LOCATION = 'resolved';
    expect(availableMilestones('pre_launch', m)).toContain('PRICING');
  });

  it('unlocks FUNDING_STANCE only after PRICING AND INITIAL_TEAM resolved', () => {
    const m = initialMilestones();
    m.BRAND = 'resolved';
    m.LOCATION = 'resolved';
    m.PRICING = 'resolved';
    expect(availableMilestones('pre_launch', m)).not.toContain('FUNDING_STANCE');
    m.INITIAL_TEAM = 'resolved';
    expect(availableMilestones('pre_launch', m)).toContain('FUNDING_STANCE');
  });

  it('returns empty array when every milestone in the phase is resolved', () => {
    const m = initialMilestones();
    for (const name of Object.keys(PHASE_CONFIG.pre_launch.milestones)) m[name] = 'resolved';
    expect(availableMilestones('pre_launch', m)).toEqual([]);
  });

  it('scopes results to the requested phase only', () => {
    const m = initialMilestones();
    const launchAvail = availableMilestones('launch', m);
    expect(launchAvail).toEqual(expect.arrayContaining(['OPENING_STRATEGY', 'OPERATIONS_SETUP']));
    expect(launchAvail).not.toContain('BRAND');
  });
});

describe('pickNextMilestone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when all milestones in phase are resolved', () => {
    const m = initialMilestones();
    for (const name of Object.keys(PHASE_CONFIG.pre_launch.milestones)) m[name] = 'resolved';
    expect(pickNextMilestone('pre_launch', m)).toBeNull();
  });

  it('returns one of the available milestones (stubbed Math.random)', () => {
    const m = initialMilestones();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const pick = pickNextMilestone('pre_launch', m);
    expect(['BRAND', 'LOCATION', 'INITIAL_TEAM']).toContain(pick);
  });

  it('handles index rounding at the high end of Math.random', () => {
    const m = initialMilestones();
    // 0.9999 * 3 = 2.9997 → floor = 2 → last available
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const pick = pickNextMilestone('pre_launch', m);
    expect(['BRAND', 'LOCATION', 'INITIAL_TEAM']).toContain(pick);
  });
});

describe('isPhaseComplete', () => {
  it('returns false when any milestone is still pending', () => {
    const m = initialMilestones();
    m.BRAND = 'resolved';
    m.LOCATION = 'resolved';
    expect(isPhaseComplete('pre_launch', m)).toBe(false);
  });

  it('returns true when every milestone in the phase is resolved', () => {
    const m = initialMilestones();
    for (const name of Object.keys(PHASE_CONFIG.pre_launch.milestones)) m[name] = 'resolved';
    expect(isPhaseComplete('pre_launch', m)).toBe(true);
  });

  it('is unaffected by milestones in other phases', () => {
    const m = initialMilestones();
    for (const name of Object.keys(PHASE_CONFIG.pre_launch.milestones)) m[name] = 'resolved';
    // mature phase milestones still pending — but we ask about pre_launch
    expect(isPhaseComplete('pre_launch', m)).toBe(true);
    expect(isPhaseComplete('mature', m)).toBe(false);
  });
});

describe('nextPhase', () => {
  it('walks the phase arc in order', () => {
    expect(nextPhase('pre_launch')).toBe('launch');
    expect(nextPhase('launch')).toBe('early_growth');
    expect(nextPhase('early_growth')).toBe('scale');
    expect(nextPhase('scale')).toBe('mature');
  });

  it('returns null at the end of the arc', () => {
    expect(nextPhase('mature')).toBeNull();
  });
});

describe('milestoneDescription', () => {
  it('returns the description for a valid phase + milestone', () => {
    expect(milestoneDescription('pre_launch', 'BRAND')).toMatch(/name/i);
  });

  it('returns empty string for an unknown milestone', () => {
    expect(milestoneDescription('pre_launch', 'DOES_NOT_EXIST')).toBe('');
  });
});

describe('milestoneSummary', () => {
  it('marks resolved milestones with ✓ and pending with (pending)', () => {
    const m = initialMilestones();
    m.BRAND = 'resolved';
    const summary = milestoneSummary('pre_launch', m);
    expect(summary).toContain('BRAND ✓');
    expect(summary).toContain('LOCATION (pending)');
  });

  it('scopes to the requested phase', () => {
    const summary = milestoneSummary('launch', initialMilestones());
    expect(summary).toContain('OPENING_STRATEGY');
    expect(summary).not.toContain('BRAND');
  });
});
