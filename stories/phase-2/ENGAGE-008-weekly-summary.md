# ENGAGE-008: Weekly Summary — Parent Recap via Telegram (Email + WhatsApp later)

## Description
Every Monday morning, send each linked parent a short weekly recap of their kid's activity: creations, AI Points, new badges, Skill Arena progress, and Kid CEO milestones. Drives re-engagement and builds parent trust. MVP ships Telegram delivery only — email and WhatsApp are deferred.

## Requires KB Updates
- `docs/data-model.md` — Add `weeklySummaries` collection
- `docs/architecture.md` — Add scheduled Netlify Function pattern

## Subtasks

### [DATA] Add weeklySummaries collection
**Target**: `firestore.indexes.json`, `firestore.rules`
**Action**: New collection `weeklySummaries` (one doc per kid per week for dedup + audit). Index `kidId + weekStart DESC`. Admin-SDK writes only.

### [LIB] Per-kid weekly aggregator
**Target**: `lib/summary/aggregator.ts`
**Action**: Given `kidId` + `weekStart`, pull:
- `creations` where `kidId == X && createdAt >= weekStart`
- `sessions` points delta + badges unlocked
- `skillArenaAssessments` completed
- `ceoEvents` decisions made
Return a structured `WeeklyDigest` object.

### [LIB] Telegram template
**Target**: `lib/summary/templates/telegram.ts`
**Action**: Render `WeeklyDigest` as Telegram Markdown message with emoji icons. Include deep-link to kid's web profile.

### [FN] Scheduled Netlify Function
**Target**: `netlify/functions/weekly-summary.ts`
**Action**: Runs Mondays 09:00 IST via Netlify scheduled functions. For each parent with `telegramChatId` bound and `kidIds.length > 0`, render digest per kid and DM via `@GSIKidCeoAssistantBot`. Write dedup record to `weeklySummaries`.

### [TESTS] Aggregator + template tests
**Target**: `lib/summary/aggregator.spec.ts`, `lib/summary/templates/telegram.spec.ts`
**Action**: Happy path + empty-week + zero-kid fixtures.

## Acceptance Criteria
- Manual invoke `netlify dev functions:invoke weekly-summary` delivers Telegram DM to test parent account
- Dedup prevents double-send on the same week
- Parents can opt out via `/summaryoff` command in bot

## Out of scope (post-MVP)
- Email delivery (needs SendGrid/Resend integration + HTML template)
- WhatsApp delivery (needs WhatsApp Business API / Twilio, expensive + compliance-heavy in India)
- Teacher/school digest (tracked under ADMIN-003)
