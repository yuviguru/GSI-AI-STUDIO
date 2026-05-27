import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreditCostBadge } from './CreditCostBadge';

describe('CreditCostBadge', () => {
  it('renders the configured cost for a known feature', () => {
    render(<CreditCostBadge feature="story.generate" />);
    // story.generate = 5 in creditCostsDefaults
    expect(screen.getByText(/5 coins/i)).toBeInTheDocument();
  });

  it('uses singular form for cost = 1', () => {
    render(<CreditCostBadge feature="beatTheAi.round" />);
    // beatTheAi.round = 1
    expect(screen.getByText(/1 coin$/i)).toBeInTheDocument();
  });

  it('renders compact variant with emoji shorthand', () => {
    render(<CreditCostBadge feature="image.sdxl" compact />);
    // image.sdxl = 25; compact = "25 🪙"
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('hides itself for zero-cost features by default', () => {
    const { container } = render(<CreditCostBadge feature="unknown.action" />);
    // Unknown features cost 0 → no badge
    expect(container.firstChild).toBeNull();
  });

  it('renders "Free" when showFree is true on a zero-cost feature', () => {
    render(<CreditCostBadge feature="unknown.action" showFree />);
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });
});
