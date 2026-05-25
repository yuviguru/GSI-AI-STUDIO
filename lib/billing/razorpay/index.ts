/**
 * @file Razorpay barrel — single import path for the Razorpay integration.
 */

export {
  getRazorpayClient,
  getRazorpayPublicKey,
  createOrder,
  __resetRazorpayClientForTests,
  type CreateOrderInput,
  type RazorpayOrder,
} from './client';

export { verifyWebhookSignature } from './webhookSignature';

export {
  TOPUPS,
  getTopup,
  listTopups,
  type TopupSku,
  type TopupBundle,
} from './topupCatalog';
