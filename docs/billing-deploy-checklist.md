# Billing deploy checklist (BILLING-001)

How to take the billing system from local dev to a working test or
production environment. Covers env vars, Razorpay dashboard setup,
webhook validation, and how to verify the loop end-to-end without a
real card.

---

## 1. Env vars

Required on the deploy environment (Netlify, Vercel, etc.) — set in
the host's UI, **not** committed to git.

| Var | Required | Source | Notes |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | ✅ | Razorpay dashboard → Settings → API Keys | `rzp_test_*` or `rzp_live_*` |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay dashboard → Settings → API Keys | Server-side only. Never expose to client. |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Razorpay dashboard → Settings → Webhooks → (create webhook) → Secret | **Different** from KEY_SECRET. One per webhook URL. |
| `RAZORPAY_PLAN_CREATOR_MONTHLY` | ✅ for subs | Razorpay dashboard → Subscriptions → Plans | See step 3 below |
| `RAZORPAY_PLAN_PRO_MONTHLY` | ✅ for subs | Razorpay dashboard → Subscriptions → Plans | See step 3 below |
| `DEVICE_CREDITS_INITIAL_BALANCE` | optional | default `10` | Anonymous trial pool size per device |
| `BILLING_BYPASS` | dev-only | `true` to skip all billing checks | Refused in production unless `ALLOW_BILLING_BYPASS_IN_PROD=true` |
| `BILLING_BYPASS_KIDS` | dev-only | comma-separated kid IDs | Same restriction |
| `CREDIT_COST_*` | optional | e.g. `CREDIT_COST_STORY_GENERATE=3` | Per-feature overrides for promos |
| `TOPUP_CREDITS_*_INR` | optional | e.g. `TOPUP_CREDITS_500_INR=149` | Promo pricing for topup SKUs |
| `PLAN_*_CREDITS` | optional | e.g. `PLAN_PRO_CREDITS=3000` | Override monthly grant amounts |

---

## 2. Razorpay dashboard — one-time setup

1. **Account onboarding** — must be in **test mode** for `rzp_test_*`
   keys, **live mode** for `rzp_live_*`. Switch in the top-left dropdown.
2. **API Keys** (Settings → API Keys → Generate Test Key / Live Key).
   Copy `key_id` and `key_secret` into env. The secret is shown once —
   if lost, you'll need to regenerate.
3. **Plans for subscriptions** (Subscriptions → Plans → New Plan):
   - **Creator monthly**: ₹99 / monthly / 1 cycle interval.
   - **Pro monthly**: ₹299 / monthly / 1 cycle interval.
   - Copy each plan's id (`plan_xxx`) into the matching
     `RAZORPAY_PLAN_*_MONTHLY` env var.
   - Test-mode plans only work with test-mode subscriptions; create
     them again separately when you go live.

---

## 3. Webhook setup

1. **Add webhook**: Settings → Webhooks → Add New Webhook.
2. **URL**: `https://<your-deploy-url>/api/billing/razorpay/webhook`.
3. **Secret**: generate a strong random string (16+ chars). Copy into
   `RAZORPAY_WEBHOOK_SECRET` env var on the deploy environment.
4. **Active events** — check at minimum:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
5. **Save**. Razorpay shows the webhook id and a "Test webhook"
   button — keep this tab open for step 4.

---

## 4. Verify the webhook is live

### From Razorpay dashboard (sanity check)

1. Click **Test webhook** next to your webhook entry. Razorpay sends a
   synthetic `payment.captured` event.
2. Check your deploy logs (Netlify Functions → realtime, or Vercel →
   Runtime Logs). Look for:
   ```
   [razorpay-webhook] payment.captured pay_test_xxx missing kidId in notes — manual reconciliation required.
   ```
   That error is **good**: it means the HMAC verified, the route
   parsed the event, and only failed at the application layer
   (test events have no `notes.kidId`).
3. **If you instead see** `[razorpay-webhook] Invalid signature from
   <ip>` → the `RAZORPAY_WEBHOOK_SECRET` env var is wrong. Compare
   it against the dashboard.

### End-to-end with a real test card

1. Sign in to the deployed kid app, create a kid profile.
2. `/billing/credits` → **Buy coins** → pick a bundle.
3. Razorpay test checkout opens. Use:
   - Card: `4111 1111 1111 1111`
   - CVV: any 3 digits
   - Expiry: any future month/year
   - OTP: `1234`
4. Modal should show **🎉 Added N coins!** within ~2 seconds — that's
   the client-side `/verify` path (signature verified server-side,
   credits added immediately, no webhook involved).
5. Within ~5–10s, Razorpay also delivers a `payment.captured` webhook.
   Logs should show:
   ```
   [razorpay-webhook] duplicate pay_xxx ignored (balance N)
   ```
   The "duplicate" log is **expected** — the verify path already
   credited; the webhook idempotency check (on `paymentRef`) prevents
   double-credit.

### Subscription flow

1. **Buy coins** modal → close it. **Plan** section → **See plans** →
   **Subscribe** to Creator.
2. Razorpay subscription checkout. Same test card. Razorpay sets up
   the recurring mandate; you'll get an OTP for the first charge.
3. Logs should show:
   ```
   [razorpay-webhook] subscription activated: kid <kidId> → creator (sub sub_xxx)
   ```
4. Within ~1–2 minutes, Razorpay sends `subscription.charged` for the
   first cycle. Logs:
   ```
   [razorpay-webhook] subscription charged: kid <kidId> → creator (sub sub_xxx)
   ```
   `creditBalance` should now reflect the Creator plan's monthly grant
   (default 500 coins) on top of any existing balance.

---

## 5. Failure-mode quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid signature from <ip>` log on every webhook | `RAZORPAY_WEBHOOK_SECRET` mismatch | Re-copy from Razorpay dashboard |
| `Razorpay is not configured` from `/order` | `RAZORPAY_KEY_ID` / `_SECRET` missing | Set both env vars |
| `RAZORPAY_PLAN_CREATOR_MONTHLY is not set` | Plans not created in Razorpay dashboard | Step 3 above |
| Topup succeeds in Razorpay but balance unchanged | `/verify` not called by client (older build cached?) | Hard refresh kid app; check `POST /api/billing/razorpay/verify` log |
| Subscription created but no credits | `subscription.activated` webhook not enabled OR wrong URL | Razorpay dashboard → Webhooks → confirm event subscriptions |
| Webhook works in test but not production | Live-mode plans + secrets are independent from test-mode | Create live-mode plan IDs separately, swap env |

---

## 6. Rotation runbook

- **Key compromise (test or live)** — Razorpay dashboard → Settings
  → API Keys → **Regenerate**. Update env immediately. Old key stops
  working at the moment of regeneration.
- **Webhook secret rotation** — Razorpay dashboard → Webhooks →
  Edit → **Regenerate secret**. Update env. Razorpay starts signing
  with the new secret immediately, so update env _before_ regenerating
  to avoid a window of rejected events.
- **Test → Live cutover** — separate keys, plans, and webhook URLs
  (the live-mode dashboard is a different account view). Update all
  env vars together; never mix test and live IDs.

---

## Reference

- Razorpay docs: https://razorpay.com/docs/webhooks/
- HMAC verification spec: https://razorpay.com/docs/webhooks/validate-test/
- Subscription lifecycle: https://razorpay.com/docs/payments/subscriptions/states/
- Our HMAC implementation: `lib/billing/razorpay/webhookSignature.ts`
- Our payment signature implementation: `lib/billing/razorpay/paymentSignature.ts`
- Our subscription wrapper: `lib/billing/razorpay/subscriptions.ts`
