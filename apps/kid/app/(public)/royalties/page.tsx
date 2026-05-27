import type { Metadata } from 'next';
import { RoyaltiesClient } from './RoyaltiesClient';

export const metadata: Metadata = {
  title: 'My Royalties · GSI AI Studio',
  description:
    "Track your AI Royalties from books you sell, see how much KIT (the kids' fund) has raised, and preview what you can redeem.",
};

/**
 * BOOK-006 — /royalties placeholder page.
 *
 * Phase 1: balance + lifetime + KIT total all show ₹0 since BOOK-004 Phase 2
 * (actual purchase flow) hasn't shipped yet. Honest "Coming Soon" stamps on
 * the redemption cards. Once BOOK-004 Phase 2 lands, the values populate
 * from the existing wiring without UI changes here.
 */
export default function RoyaltiesPage() {
  return <RoyaltiesClient />;
}
