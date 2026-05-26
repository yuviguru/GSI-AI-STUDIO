import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll re-import inside each test so the module-level loadPromise resets.
describe('lib/billing/razorpay/clientLoader', () => {
  let originalDocument: Document | undefined;
  let originalWindow: Window | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.document = originalDocument as Document;
    globalThis.window = originalWindow as Window & typeof globalThis;
    vi.restoreAllMocks();
  });

  it('rejects on server (no window)', async () => {
    // Simulate Node environment by removing window — jsdom keeps it by default
    const originalWin = globalThis.window;
    // @ts-expect-error — intentional for the test
    delete globalThis.window;
    try {
      const { openCheckout } = await import('./clientLoader');
      await expect(
        openCheckout({
          orderId: 'o1',
          razorpayKeyId: 'k',
          amount: 100,
          currency: 'INR',
        }),
      ).rejects.toThrow(/browser/);
    } finally {
      globalThis.window = originalWin;
    }
  });

  it('reuses an already-loaded Razorpay global without injecting a script', async () => {
    // Pretend the SDK has already loaded
    (globalThis.window as unknown as { Razorpay: unknown }).Razorpay = function MockRzp(
      this: unknown,
      _opts: unknown,
    ) {
      Object.assign(this as object, {
        open: () => {
          // Immediately invoke the handler from the constructor args
          const opts = _opts as { handler: (r: Record<string, string>) => void };
          opts.handler({
            razorpay_payment_id: 'pay_test',
            razorpay_order_id: 'order_test',
            razorpay_signature: 'sig_test',
          });
        },
      });
    } as unknown as Window['Razorpay'];

    const createElementSpy = vi.spyOn(document, 'createElement');
    const { openCheckout } = await import('./clientLoader');

    const result = await openCheckout({
      orderId: 'order_test',
      razorpayKeyId: 'rzp_test_xxx',
      amount: 19900,
      currency: 'INR',
    });

    expect(result.paymentId).toBe('pay_test');
    expect(result.orderId).toBe('order_test');
    expect(result.signature).toBe('sig_test');
    // We didn't need to inject a <script> since Razorpay was already global
    expect(createElementSpy).not.toHaveBeenCalledWith('script');

    // Cleanup the mock
    delete (globalThis.window as unknown as { Razorpay?: unknown }).Razorpay;
  });

  it('rejects when the user dismisses the checkout modal', async () => {
    (globalThis.window as unknown as { Razorpay: unknown }).Razorpay = function MockRzp(
      this: unknown,
      _opts: unknown,
    ) {
      Object.assign(this as object, {
        open: () => {
          const opts = _opts as { modal?: { ondismiss?: () => void } };
          opts.modal?.ondismiss?.();
        },
      });
    } as unknown as Window['Razorpay'];

    const { openCheckout } = await import('./clientLoader');
    await expect(
      openCheckout({ orderId: 'o', razorpayKeyId: 'k', amount: 100, currency: 'INR' }),
    ).rejects.toThrow(/cancelled/i);

    delete (globalThis.window as unknown as { Razorpay?: unknown }).Razorpay;
  });
});
