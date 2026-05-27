import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Razorpay SDK BEFORE importing the SUT so the require chain
// picks up the stub. The SDK is a default-exported class; vi.mock needs
// a factory that returns `{ default: Mock }`.
const mockOrdersCreate = vi.fn();
vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      orders: { create: mockOrdersCreate },
    })),
  };
});

import { createOrder, __resetRazorpayClientForTests, getRazorpayPublicKey } from './client';

describe('razorpay client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    __resetRazorpayClientForTests();
    mockOrdersCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('config', () => {
    it('throws a clear error when RAZORPAY_KEY_ID is missing', async () => {
      vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret_xxx');
      // No KEY_ID set.
      await expect(
        createOrder({ amountInr: 100, receipt: 'r', notes: {} }),
      ).rejects.toThrow(/RAZORPAY_KEY_ID/);
    });

    it('throws when RAZORPAY_KEY_SECRET is missing', async () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_xxx');
      await expect(
        createOrder({ amountInr: 100, receipt: 'r', notes: {} }),
      ).rejects.toThrow(/RAZORPAY/);
    });

    it('getRazorpayPublicKey returns the configured key', () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_123');
      expect(getRazorpayPublicKey()).toBe('rzp_test_123');
    });

    it('getRazorpayPublicKey throws when key is unset — never returns undefined', () => {
      // Critical — if this regressed, the client-side checkout would
      // open with key=undefined and silently fail.
      expect(() => getRazorpayPublicKey()).toThrow(/RAZORPAY_KEY_ID/);
    });
  });

  describe('createOrder()', () => {
    beforeEach(() => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_xxx');
      vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret_xxx');
      __resetRazorpayClientForTests();
    });

    it('converts INR to paise (×100) when calling Razorpay', async () => {
      mockOrdersCreate.mockResolvedValue({
        id: 'order_test',
        amount: 19900,
        currency: 'INR',
        receipt: 'r1',
        status: 'created',
        notes: {},
      });

      await createOrder({
        amountInr: 199,
        receipt: 'r1',
        notes: { kidId: 'k1' },
      });

      expect(mockOrdersCreate).toHaveBeenCalledTimes(1);
      const call = mockOrdersCreate.mock.calls[0]?.[0];
      expect(call.amount).toBe(19900);
      expect(call.currency).toBe('INR');
      expect(call.receipt).toBe('r1');
      expect(call.notes).toEqual({ kidId: 'k1' });
    });

    it('rejects non-positive amounts before hitting Razorpay', async () => {
      await expect(
        createOrder({ amountInr: 0, receipt: 'r', notes: {} }),
      ).rejects.toThrow(/positive/);
      await expect(
        createOrder({ amountInr: -10, receipt: 'r', notes: {} }),
      ).rejects.toThrow(/positive/);
      expect(mockOrdersCreate).not.toHaveBeenCalled();
    });

    it('rounds fractional rupees to integer paise', async () => {
      mockOrdersCreate.mockResolvedValue({
        id: 'order_test',
        amount: 4951,
        currency: 'INR',
        receipt: 'r',
        status: 'created',
      });

      // 49.505 INR → 4950.5 paise → rounds to 4951 (NOT a float)
      await createOrder({ amountInr: 49.505, receipt: 'r', notes: {} });
      const call = mockOrdersCreate.mock.calls[0]?.[0];
      expect(Number.isInteger(call.amount)).toBe(true);
    });
  });
});
