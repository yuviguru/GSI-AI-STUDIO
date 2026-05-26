/**
 * @file Razorpay barrel — single import path for the Razorpay integration.
 */

export {
  getRazorpayClient,
  getRazorpayPublicKey,
  createOrder,
  fetchOrder,
  __resetRazorpayClientForTests,
  type CreateOrderInput,
  type RazorpayOrder,
} from './client';

export { verifyWebhookSignature } from './webhookSignature';
export { verifyPaymentSignature } from './paymentSignature';

export {
  TOPUPS,
  getTopup,
  listTopups,
  type TopupSku,
  type TopupBundle,
} from './topupCatalog';
