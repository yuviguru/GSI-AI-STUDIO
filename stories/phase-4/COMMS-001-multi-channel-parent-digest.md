# COMMS-001: Multi-Channel Parent Weekly Digest

## Description
Every Friday, each parent gets a WhatsApp or Telegram message summarizing their child's week: creations, concepts learned, 1-line teacher note, next week's due items. Channel choice is per-parent — we reuse the existing Telegram Bot (from commit b9d47ed) and add WhatsApp once Meta BSP approval lands. The foundational piece is a provider-agnostic `MessagingService` with `TelegramProvider` and `WhatsAppProvider` adapters, so future providers (SMS, email) plug in cleanly. Telegram path ships first and unblocks COMMS-002.

## Requires KB Updates
- Update `docs/architecture.md` with messaging service design + provider interface
- Update `docs/data-model.md` with `parentDigests`, `commsLog`, `parentChannelPrefs` collections
- Update `docs/api-contracts.md` with `/api/comms/*` endpoints
- Update `docs/security.md` with DPDP-compliant opt-in flow

## Dependencies
- ADMIN-002 (Assignment System) — source for due-item summary
- HW-001 (existing Telegram bot — see commit b9d47ed)
- COMPLIANCE-002 (DPDP Consent) — opt-in audit trail

## Subtasks

### [LIB] Define messaging types + interface
**Target**: `lib/comms/types.ts`, `lib/comms/messagingService.ts`
**Action**: Create
**Requirements**:
- `interface MessagingProvider { send(recipient: ChannelRecipient, message: OutboundMessage): Promise<DeliveryReceipt>; channel: 'telegram' | 'whatsapp' | 'sms' | 'email' }`
- `sendMessage(recipientId, template, params)` — routes to provider based on parent's `parentChannelPrefs`
- Logs every send to `commsLog` with `{ recipientId, channel, templateId, status, error?, sentAt }`
- DPDP check: verifies `consentStatus === 'granted'` before sending

### [LIB] Telegram provider
**Target**: `lib/comms/providers/telegramProvider.ts`
**Action**: Create
**Requirements**:
- Wraps existing Telegram Bot SDK setup
- `send()` maps templates → formatted Telegram messages (Markdown)
- Handles delivery receipts + error codes
- Supports Hindi + English (uses locale from parent pref)

### [LIB] WhatsApp provider
**Target**: `lib/comms/providers/whatsappProvider.ts`
**Action**: Create
**Requirements**:
- WhatsApp Cloud API (Meta Business) wrapper
- `send()` uses pre-approved template IDs (template registry in Firestore)
- Handles delivery + read receipts via webhook
- **Gated on BSP approval** — ship behind feature flag until live

### [LIB] Parent channel preferences
**Target**: `lib/firebase/parentCommsService.ts`
**Action**: Create
**Requirements**:
- `getChannelPref(parentUid): Promise<ParentChannelPref>`
- `setChannelPref(parentUid, channel, handle): Promise<void>` — e.g. `{ channel: 'telegram', handle: '@user123', consentStatus: 'granted', consentedAt }`
- `recordConsent(parentUid, scope): Promise<void>` (ties to COMPLIANCE-002)

### [LIB] Digest generator
**Target**: `lib/ai/parentDigestGenerator.ts`
**Action**: Create
**Requirements**:
- `generateParentDigest(kidId, weekStart): Promise<ParentDigestContent>`
- Assembles: creations + concepts + assignment status + teacher flag
- Uses Claude to produce 3-4 sentence friendly summary in parent's locale
- Output matches WhatsApp template variables (short fields, no markdown)

### [API] Digest endpoints
**Target**: `app/api/comms/parent-digest/route.ts`, `app/api/comms/parent-digest/preview/route.ts`, `app/api/comms/parent-digest/send/route.ts`
**Action**: Create
**Requirements**:
- `POST /api/comms/parent-digest/preview` — teacher preview for a student
- `POST /api/comms/parent-digest/send` — send single (teacher approval step)
- `POST /api/comms/parent-digest/send-batch` — weekly Friday run for class
- Delivery webhook: `/api/comms/webhooks/whatsapp`, `/api/comms/webhooks/telegram`

### [FE] Parent digest queue
**Target**: `components/teacher/ParentDigestQueue.tsx`, `app/(auth)/teacher/parent-comms/page.tsx`
**Action**: Create
**Requirements**:
- List students → draft digests → approve-all or edit-per-student
- Shows channel per parent + consent status
- Dry-run preview before sending
- Delivery status dashboard (sent / delivered / read / failed)

### [FE] Parent consent screen
**Target**: `components/parent/ConsentForm.tsx`
**Action**: Create
**Requirements**:
- Parent onboarding or settings: pick channel (Telegram / WhatsApp / none), enter handle or phone, tick consent checkbox
- Stores in `parentChannelPrefs` with audit trail
- Can revoke anytime

### [TEST] Messaging service tests
**Target**: `lib/comms/__tests__/messagingService.test.ts`
**Action**: Create
**Requirements**:
- Provider switching by pref
- No send without granted consent (DPDP)
- Retry on transient failures, log on permanent
- Template param validation

## Acceptance Criteria
- [ ] `MessagingService` interface with Telegram + WhatsApp adapters
- [ ] Parents opt in and pick channel
- [ ] Digest generates in under 10s per student
- [ ] Sends go through preferred channel; falls back if not configured
- [ ] No send without consent
- [ ] Friday batch job sends digests to all consenting parents
- [ ] Delivery logs queryable for teachers
