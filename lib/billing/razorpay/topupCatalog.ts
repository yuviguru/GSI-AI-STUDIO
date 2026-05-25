/**
 * Topup SKUs — how much it costs (in INR) to buy a bundle of credits.
 *
 * The bundle prices are deliberately better-value-per-credit at higher
 * tiers (the 2000-pack is ~30% cheaper per credit than the 100-pack)
 * to nudge larger purchases — the same playbook as Cursor, Replicate,
 * OpenAI tokens.
 *
 * To re-price a SKU during a promo:
 *   TOPUP_CREDITS_100_INR=39    # ₹49 → ₹39 weekend sale
 *   TOPUP_CREDITS_500_INR=149
 *   TOPUP_CREDITS_2000_INR=599
 *
 * To add a new SKU, add a row to `TOPUPS` AND to the union type below —
 * the type-checker will then find every consuming call site for you.
 */

export type TopupSku = 'credits_100' | 'credits_500' | 'credits_2000';

export interface TopupBundle {
  sku: TopupSku;
  /** Credit count delivered to the wallet. */
  credits: number;
  /** Price in INR (rupees, not paise). */
  priceInr: number;
  /** Display label for the checkout sheet — kept short. */
  displayName: string;
  /** Optional tag (e.g. 'Most popular') for the buy-credits UI. */
  badge?: string;
}

function envInr(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * THE topup catalog. Three bundles is enough for now — adding a fourth
 * usually paralyzes the buy decision (see Cursor's pricing history).
 *
 * Price-per-credit (default):
 *   credits_100  = ₹0.49/credit (entry, full margin)
 *   credits_500  = ₹0.40/credit (sweet spot, recommended)
 *   credits_2000 = ₹0.35/credit (power user, best value)
 */
export const TOPUPS: Record<TopupSku, TopupBundle> = {
  credits_100: {
    sku: 'credits_100',
    credits: 100,
    priceInr: envInr('TOPUP_CREDITS_100_INR', 49),
    displayName: '100 AI Coins',
  },
  credits_500: {
    sku: 'credits_500',
    credits: 500,
    priceInr: envInr('TOPUP_CREDITS_500_INR', 199),
    displayName: '500 AI Coins',
    badge: 'Most popular',
  },
  credits_2000: {
    sku: 'credits_2000',
    credits: 2000,
    priceInr: envInr('TOPUP_CREDITS_2000_INR', 699),
    displayName: '2,000 AI Coins',
    badge: 'Best value',
  },
};

/**
 * Resolve an SKU to its bundle. Returns null for unknown SKUs — never
 * throws so the order endpoint can return a clean 400 INVALID_INPUT
 * instead of bubbling a stacktrace.
 */
export function getTopup(sku: string | undefined): TopupBundle | null {
  if (!sku) return null;
  return TOPUPS[sku as TopupSku] ?? null;
}

/** Public list for the buy-credits UI. */
export function listTopups(): TopupBundle[] {
  return Object.values(TOPUPS);
}
