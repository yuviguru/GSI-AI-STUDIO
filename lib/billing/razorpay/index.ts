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
export { verifyPaymentSignature, verifySubscriptionSignature } from './paymentSignature';
export {
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  resolveRazorpayPlanId,
  isSubscribablePlan,
  type SubscribablePlan,
  type CreatedSubscription,
  type CreateSubscriptionInput,
} from './subscriptions';

export {
  TOPUPS,
  getTopup,
  listTopups,
  type TopupSku,
  type TopupBundle,
} from './topupCatalog';
