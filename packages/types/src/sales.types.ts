/**
 * Sales / royalty / KIT types (BOOK-004 Phase 1).
 *
 * Phase 1 introduces the schema only — no actual purchases happen until
 * BOOK-004 Phase 2 ships the Razorpay flow + parent verification + admin
 * tools. These types are stable contracts so downstream wiring (UI hooks,
 * admin tools, analytics) can be built without further breaking changes.
 */

/** Split of a sale's revenue. Sum of creator+kit+platform must equal 100. */
export interface RoyaltySplit {
  creator: number; // % to the kid author
  kit: number; // % to the KIT charitable fund
  platform: number; // % to the platform
}

export interface RoyaltySplitConfig {
  splits: RoyaltySplit;
  currency: 'INR';
}

/** Lifecycle of a `bookSales/{saleId}` doc. Phase 1 only ever sees `pending`
 *  because Phase 2's purchase flow is what advances states. */
export type BookSaleStatus = 'pending' | 'paid' | 'refunded' | 'failed';

/** A single sale record. Created when a buyer opens checkout (Phase 2)
 *  and updated on the Razorpay webhook. Phase 1: no sales are ever
 *  created. The schema is locked here so Phase 2 doesn't need to
 *  migrate. */
export interface BookSale {
  id: string;
  bookId: string;
  /** Author — royalty recipient. */
  kidId: string;
  /** Buyer's session (anonymous-safe). */
  buyerSessionId: string;
  /** Buyer's parent (Phase 2 once parent auth is wired). */
  buyerUserId: string | null;
  priceInr: number;
  /** Frozen split snapshot — protects creators if admin changes the
   *  config doc later. */
  splitSnapshot: RoyaltySplit;
  status: BookSaleStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

/** Append-only ledger entry under `kids/{kidId}/royaltyLedger/{entryId}`.
 *  Mirrors the `creditLedger` pattern. Source of truth for royalty
 *  balance; the `kid.royaltyBalanceInr` field is a denormalized cache. */
export type RoyaltyLedgerType = 'earn' | 'cashout' | 'reverse';

export interface RoyaltyLedgerEntry {
  id: string;
  type: RoyaltyLedgerType;
  /** INR. Positive on earn, negative on cashout, positive on reverse. */
  amountInr: number;
  balanceAfter: number;
  /** Reference for earn entries — the sale that triggered the payout. */
  saleId: string | null;
  /** Reference for cashout entries (Phase 2). */
  cashoutId: string | null;
  createdAt: Date;
}

/** Singleton at `kitFund/global` — lifetime KIT contributions. */
export interface KitFund {
  lifetimeInr: number;
  updatedAt: Date;
}
