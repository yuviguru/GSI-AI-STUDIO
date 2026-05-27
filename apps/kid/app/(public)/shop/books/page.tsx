import type { Metadata } from 'next';
import { ShopBooksClient } from './ShopBooksClient';

export const metadata: Metadata = {
  title: 'GSI Bookshop · Books written by kids',
  description:
    'Every book here is written by a kid. Part of every sale supports KIT — helping kids who don\'t have books.',
};

/**
 * BOOK-004 Phase 1 — /shop/books browse page.
 *
 * Lists every book the author has marked sales-enabled. Phase 1: the
 * "Buy" button is disabled with a "Coming Soon" stamp because the
 * purchase flow itself (Razorpay + parent verification + royalty
 * distribution) is Phase 2.
 */
export default function ShopBooksPage() {
  return <ShopBooksClient />;
}
