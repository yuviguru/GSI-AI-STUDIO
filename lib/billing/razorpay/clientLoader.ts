/**
 * Client-side Razorpay checkout loader.
 *
 * Lazy-loads https://checkout.razorpay.com/v1/checkout.js once per page,
 * then opens the checkout sheet. Returns a promise that resolves on
 * successful payment (handler) or rejects on dismiss / failure.
 *
 * The webhook is the authoritative path that actually credits the kid's
 * wallet (idempotent on paymentRef). This client-side success callback
 * is just a UX cue — the page should poll `/api/billing/credits` after
 * resolve to reflect the new balance once the webhook has run.
 */

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (response: unknown) => void) => void;
}

let loadPromise: Promise<void> | null = null;

/** Inject the Razorpay script tag once. Subsequent calls reuse the promise. */
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout can only run in the browser'));
  }
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // allow retry
      reject(new Error('Razorpay script failed to load — check network'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export interface OpenCheckoutInput {
  orderId: string;
  razorpayKeyId: string;
  amount: number; // paise
  currency: string;
  name?: string;
  description?: string;
  prefill?: RazorpayOptions['prefill'];
}

export interface CheckoutResult {
  paymentId: string;
  orderId: string;
  signature: string;
}

/**
 * Open the Razorpay checkout sheet. Promise resolves on success handler
 * fire, rejects on dismiss or load failure.
 *
 * Note: the success resolution doesn't mean the wallet has been credited
 * yet — that happens asynchronously when the webhook fires. Poll
 * `/api/billing/credits` after resolve to surface the new balance.
 */
export async function openCheckout(input: OpenCheckoutInput): Promise<CheckoutResult> {
  await loadScript();
  if (!window.Razorpay) throw new Error('Razorpay script loaded but global is missing');

  return new Promise<CheckoutResult>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: input.razorpayKeyId,
      amount: input.amount,
      currency: input.currency,
      name: input.name ?? 'GSI AI Studio',
      description: input.description ?? 'AI Coins topup',
      order_id: input.orderId,
      handler: (resp) => {
        resolve({
          paymentId: resp.razorpay_payment_id,
          orderId: resp.razorpay_order_id,
          signature: resp.razorpay_signature,
        });
      },
      prefill: input.prefill,
      theme: { color: '#6366f1' }, // indigo, matches the CreditsBadge palette
      modal: {
        ondismiss: () => reject(new Error('Checkout cancelled')),
      },
    });
    rzp.open();
  });
}
