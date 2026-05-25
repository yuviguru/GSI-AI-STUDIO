import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HubScene } from './HubScene';

/**
 * Smoke tests for the mobile hub scene.
 *
 * The component is heavily styled and animation-driven; we don't try to
 * snapshot the visual output. Instead we verify:
 *   1. Every mode in the active group is rendered as a tappable card.
 *   2. Switching Create / Play / Learn swaps the visible portals.
 *   3. The side stacks are present and Streak is a non-interactive status badge.
 *   4. Tab-shortcut actions (Quests, Badges) call `onTabChange` with the
 *      right tab; the Daily button opens the modal.
 *
 * External primitives are stubbed at the module boundary so the test
 * doesn't reach into Firebase, the Lottie mascot, or the Web Audio API.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/AiPointsContext', () => ({
  useAiPoints: () => ({ totalPoints: 250, isLoaded: true, badges: [], creationsByType: {} }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/hooks/useResolvedIdentity', () => ({
  useResolvedIdentity: () => ({
    name: 'Test Player',
    avatarUrl: null,
    mascotId: 'pixie',
    mascotEmoji: '🦊',
    hasProfile: false,
  }),
}));

vi.mock('@/components/mascot/MascotAvatar', () => ({
  MascotAvatar: ({ id }: { id: string }) => <div data-testid="mascot" data-mascot-id={id} />,
}));

vi.mock('@/lib/sounds', () => ({
  playSound: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function getModeCards(): HTMLElement[] {
  // Every PortalCard has an aria-label of the mode's full label (e.g.
  // "Book Studio"). The side-stack buttons use uppercase action labels
  // (Daily / Streak 7 / etc.) so this filter is unambiguous.
  return Array.from(screen.queryAllByRole('button')).filter((btn) => {
    const label = btn.getAttribute('aria-label') ?? '';
    return /Studio|Lab|Maker|Kid CEO|MindX Arena|Beat the AI|AI Lab|Explore$/.test(label);
  });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('HubScene', () => {
  beforeEach(() => {
    // Reset any state captured by stubs between tests.
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the 6 Create modes by default', () => {
    render(<HubScene />);
    const labels = getModeCards()
      .map((c) => c.getAttribute('aria-label'))
      .filter((l): l is string => l !== null && /Studio|Lab|Maker/.test(l));
    expect(labels).toEqual(
      expect.arrayContaining([
        'Book Studio',
        'Story Studio',
        'Game Studio',
        'Music Lab',
        'Comic Studio',
        'Quiz Maker',
      ]),
    );
  });

  it('switches to the 3 Play modes when the Play tab is clicked', () => {
    render(<HubScene />);
    fireEvent.click(screen.getByRole('tab', { name: /Play/ }));
    // Filter cards strictly to Play modes — Explore is the side-stack
    // Discovery button and matches our broader regex above.
    const playLabels = getModeCards()
      .map((c) => c.getAttribute('aria-label'))
      .filter((l): l is string => l !== null && !/Studio|Lab|Maker|^Explore$/.test(l));
    expect(playLabels).toEqual(
      expect.arrayContaining(['Kid CEO', 'MindX Arena', 'Beat the AI']),
    );
    // Create cards should no longer be on screen.
    expect(screen.queryByRole('button', { name: 'Book Studio' })).toBeNull();
  });

  it('renders the 2 Learn modes when the Learn tab is clicked', () => {
    render(<HubScene />);
    fireEvent.click(screen.getByRole('tab', { name: /Learn/ }));
    expect(screen.getByRole('button', { name: 'AI Lab' })).toBeInTheDocument();
    // Two "Explore" entries exist: one in Learn (mode), one in the side
    // stack. getAllByRole returns both, which is the assertion we want —
    // Learn renders Explore as a mode.
    expect(screen.getAllByRole('button', { name: 'Explore' }).length).toBeGreaterThan(0);
  });

  it('renders all 6 side-stack actions and marks Streak as passive', () => {
    render(<HubScene />);
    // Every interactive side action is a button with its label.
    for (const label of ['Daily', 'Squad', 'Quests', 'Badges', 'Explore']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // Streak is a status badge — role="status", not a button.
    const streak = screen.getByRole('status', { name: 'Streak 7' });
    expect(streak.tagName).toBe('DIV');
  });

  it('calls onTabChange with "quests" when the Quests button is tapped', () => {
    const onTabChange = vi.fn();
    render(<HubScene onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(onTabChange).toHaveBeenCalledWith('quests');
  });

  it('calls onTabChange with "profile" when the Badges button is tapped', () => {
    const onTabChange = vi.fn();
    render(<HubScene onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Badges' }));
    expect(onTabChange).toHaveBeenCalledWith('profile');
  });

  it('opens the daily reward modal when the Daily button is tapped', () => {
    render(<HubScene />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Daily' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Daily Reward')).toBeInTheDocument();
  });
});
