/**
 * Client-side Razorpay checkout loader.
 *
 * Lazy-loads https://checkout.razorpay.com/v1/checkout.js once per
 * page, then opens the checkout sheet for either:
 *
 *   - a one-shot Order (topup) — pass `{ orderId }`
 *   - a recurring Subscription — pass `{ subscriptionId }`
 *
 * Both resolve with a typed `CheckoutResult` discriminated by `kind`.
 * Subscriptions return a different signature payload (paymentId +
 * subscriptionId) which `verifySubscriptionSignature` is built to
 * verify — distinct from the order signature path.
 *
 * The verify / webhook is the authoritative path that credits the
 * wallet; this client callback is just a UX cue. After resolve,
 * refresh `/api/billing/credits` to show the new balance.
 */

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount?: number; // paise — required for orders, ignored for subscriptions
  currency?: string;
  name: string;
  description?: string;
  order_id?: string;
  subscription_id?: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
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
      loadPromise = null;
      reject(new Error('Razorpay script failed to load — check network'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export type OpenCheckoutInput =
  | {
      kind?: 'order';
      orderId: string;
      razorpayKeyId: string;
      amount: number;
      currency: string;
      name?: string;
      description?: string;
      prefill?: RazorpayOptions['prefill'];
    }
  | {
      kind: 'subscription';
      subscriptionId: string;
      razorpayKeyId: string;
      name?: string;
      description?: string;
      prefill?: RazorpayOptions['prefill'];
    };

export type CheckoutResult =
  | {
      kind: 'order';
      paymentId: string;
      orderId: string;
      signature: string;
    }
  | {
      kind: 'subscription';
      paymentId: string;
      subscriptionId: string;
      signature: string;
    };

export async function openCheckout(input: OpenCheckoutInput): Promise<CheckoutResult> {
  await loadScript();
  if (!window.Razorpay) throw new Error('Razorpay script loaded but global is missing');

  return new Promise<CheckoutResult>((resolve, reject) => {
    const isSubscription = 'subscriptionId' in input;
    const options: RazorpayOptions = {
      key: input.razorpayKeyId,
      name: input.name ?? 'GSI AI Studio',
      description:
        input.description ?? (isSubscription ? 'Plan subscription' : 'AI Coins topup'),
      prefill: input.prefill,
      theme: { color: '#6366f1' },
      handler: (resp) => {
        if (isSubscription) {
          resolve({
            kind: 'subscription',
            paymentId: resp.razorpay_payment_id,
            subscriptionId: resp.razorpay_subscription_id!,
            signature: resp.razorpay_signature,
          });
        } else {
          resolve({
            kind: 'order',
            paymentId: resp.razorpay_payment_id,
            orderId: resp.razorpay_order_id!,
            signature: resp.razorpay_signature,
          });
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Checkout cancelled')),
      },
    };

    if (isSubscription) {
      options.subscription_id = input.subscriptionId;
    } else {
      options.order_id = input.orderId;
      options.amount = input.amount;
      options.currency = input.currency;
    }

    new window.Razorpay!(options).open();
  });
}
