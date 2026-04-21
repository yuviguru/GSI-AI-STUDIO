# HOMEWORK-001: Interactive Homework Helper (Telegram)

## Description
Parent/kid forwards a school-group homework message (text, photo, voice)
to `@GSIPersonalAssistantBot`. The bot OCRs/STTs, classifies it as
homework, parses it into structured questions with a CBSE-aware LLM prompt,
and walks the kid through a quiz / recite / explain / practice session.
The kid gets hints, the answer after 3 failed attempts, and a warm
completion screen. Parents get a weekly digest DM and can open
`/homework/history` on the web to see every question and answer.

## Requires KB Updates
- Update `docs/MESSENGER_BOT_ARCHITECTURE.md` §5 with the v1 design
  decisions block (Telegram only, en+hi, intent classifier,
  reveal-after-3, half-math scope, school anchor, AI Points + streaks,
  WER-based recitation scoring).
- Update `docs/data-model.md` homeworkSessions schema: `language`,
  `revealedQuestionIds`, `schoolId`, `sourceChannelId`, per-question
  `language` + `meta.steps`; `sessions.homeworkStats` counter.
- Update `docs/security.md` with per-kid rate limit and `originalText`
  retention note.
- Update `docs/api-contracts.md` with `GET /api/homework/history` and
  `GET /api/homework/sessions/:id`.

## Subtasks

### [KB] Extend badges + rewards for homework
**Target**: `lib/badges.ts`, `lib/firebase/sessionService.ts`,
`types/bot.types.ts`
**Action**: Update
**Requirements**:
- Add `homework_sessions_completed` and `homework_streak` badge criteria
  types and wire them into `meetsCriteria` / `getBadgeProgressHint`.
- Add Homework Hero Bronze / Silver / Gold badges (1 / 5 / 15 sessions)
  plus "On a Roll" (3-day streak) and "Week Warrior" (7-day streak).
- Add `complete_homework` `PointsAction` with idempotent same-day streak
  semantics; export `computeHomeworkStreak` for unit tests.
- Extend `HomeworkSession` with `language`, `revealedQuestionIds`,
  `schoolId`, `sourceChannelId`; `HomeworkQuestion.meta` (steps today,
  latex / diagramUrl reserved for v1.1); `HomeworkAnswer.revealed`.

### [LIB] homeworkSessionStore
**Target**: `lib/bot/services/homeworkSessionStore.ts`
**Action**: Create
**Requirements**:
- CRUD via Admin SDK against `homeworkSessions/{id}` (server-only).
- `createHomeworkSession(input)` — rejects empty-question input with
  `INVALID_INPUT`.
- `recordAnswer` — transactional; increments `attempts`; tracks
  `revealedQuestionIds`; computes mastery score that excludes revealed
  questions from the denominator.
- `setMode(id, mode)`, `skipCurrentQuestion(id)`.
- `listRecentHomeworkSessions({ gsiSessionId, kidId?, limit })`.

### [LIB] OCR + language detection + homework classifier
**Target**: `lib/bot/services/ocr.ts`, `lib/bot/services/languageDetect.ts`,
`lib/bot/services/homeworkClassifier.ts`
**Action**: Create
**Requirements**:
- OCR: wraps Google Cloud Vision REST `DOCUMENT_TEXT_DETECTION` with
  `languageHints: ['en', 'hi']`; returns `null` when the key is missing
  or Vision errors; exposes a `lowConfidence` signal for module to
  prompt "please type the question" in hairy cases.
- languageDetect: Unicode-script heuristic (`en` vs `hi`). Not an LLM
  call — language detection runs on every forward.
- homeworkClassifier: cheap LLM "is this homework?" gate. Returns
  `{ isHomework, confidence, reason }`. Fails open (returns true) when
  the LLM errors so one flaky call doesn't block a real homework.

### [LIB] homeworkParser
**Target**: `lib/bot/services/homeworkParser.ts`
**Action**: Create
**Requirements**:
- LLM prompt that extracts subject, grade estimate, questions (up to 12),
  suggested mode, and `meta.steps` for multi-step math.
- Sanitises + type-checks every question. Returns `null` when no
  questions could be extracted (never invents questions).

### [LIB] Recitation scorer
**Target**: `lib/bot/services/recitationScorer.ts`
**Action**: Create
**Requirements**:
- Word-level Levenshtein WER for numeric accuracy (deterministic, cheap).
- LLM handles only `encouragement` + `tip` + `pronunciationNotes`.
- Works across Latin and Devanagari scripts.

### [LIB] Homework rate limiter
**Target**: `lib/bot/services/homeworkRateLimit.ts`
**Action**: Create
**Requirements**:
- Sliding-window counter in Firestore (`homeworkRateLimits/{key}`).
- 5 forwards / hour / chat, plus 5 forwards / hour / kid once bound.
- Throws `RATE_LIMITED` with a retry-in-minutes message.

### [LIB] Rewards integration
**Target**: `lib/bot/services/homeworkRewards.ts`
**Action**: Create
**Requirements**:
- `computePointsForSession(session)` — base 20, +2 per correct-unrevealed,
  +0.3× that for revealed-correct (keeps "reveal everything" from being
  optimal).
- `todayIsoKolkata()` — IST day boundary for streak correctness.
- `applyHomeworkReward({ gsiSessionId, kidId, session })` — routes
  through `updateSessionPoints` so points, badges, and streak all land
  atomically.

### [MODULE] homework feature module
**Target**: `lib/bot/modules/homework.ts`
**Action**: Create
**Requirements**:
- Accepts forwards, voice, text, and callbacks.
- Callback prefixes: `hw_mode:`, `hw_ans:`, `hw_hint:`, `hw_next:`,
  `hw_explain:`, `hw_skip:`, `hw_continue:`, `hw_confirm:`, `hw_cancel:`.
- Forward flow: rate-limit → extract text (text / Vision OCR / Whisper) →
  classify → parse → save → mode selector with smart default.
- Quiz / recite / explain / practice modes; `Q#N of N` progress in
  every prompt.
- Reveal answer + explanation after 3 failed attempts; marks
  `revealed: true` on the answer and adds to `revealedQuestionIds`.
- On completion: completion celebration + rewards + badge announcement.
- `/homework` command prints an intro explaining the forward flow.

### [FN] Register module on studio webhook
**Target**: `netlify/functions/telegram-webhook-studio.ts`
**Action**: Update
**Requirements**:
- Register `homeworkModule` on the studio router alongside
  `studioLinksModule`.
- Keep future registration points for challenge / skills / notifications
  modules.

### [API] Homework history list
**Target**: `app/api/homework/history/route.ts`
**Action**: Create
**Requirements**:
- `GET` only. Accepts `X-Session-Id` OR `Authorization` +
  `X-Active-Kid-Id`.
- Returns compact summaries (no `originalText`, no answers) — the detail
  endpoint has the full transcript.
- Resolves the caller's `gsiSessionId` via `botSessions` binding for
  authenticated callers.

### [API] Homework session transcript
**Target**: `app/api/homework/sessions/[id]/route.ts`
**Action**: Create
**Requirements**:
- `GET` only. Ownership check — `gsiSessionId` must match caller's
  resolved id; authenticated callers must own the kid that owns the
  session.
- Returns every question + every answer attempt + revealed flags.

### [FE] Homework history list page
**Target**: `app/(public)/homework/history/page.tsx` +
`HomeworkHistoryClient.tsx`
**Action**: Create
**Requirements**:
- Lists the caller's recent homework sessions with subject, grade,
  mode, score, revealed count, relative time.
- Empty state guides the kid to forward to `@GSIPersonalAssistantBot`.
- Each list item links to the transcript page.

### [FE] Homework transcript page
**Target**: `app/(public)/homework/history/[id]/page.tsx` +
`HomeworkTranscriptClient.tsx`
**Action**: Create
**Requirements**:
- Shows subject/grade/language header + score + revealed count.
- Renders every question (MCQ options, recitation text) alongside the
  kid's answer, attempts, and revealed flag.
- Back-link to the list page.

### [DIGEST] Weekly homework digest
**Target**: `lib/bot/digests/weeklyHomeworkDigest.ts`,
`netlify/functions/homework-weekly-digest.ts`, `netlify.toml`
**Action**: Create
**Requirements**:
- Pure `runWeeklyDigest()` service iterates `botSessions` for
  `@GSIPersonalAssistantBot` chats, pulls last-7-days sessions per kid,
  composes a Markdown summary.
- Digest line items: sessions completed, average score, subjects
  practised, strongest subject, working-on subject, revealed count.
- `buildDigestMessage` + `computeStats` exported for unit testing.
- Cron wrapper runs on Sunday 19:00 IST (= 13:30 UTC) via `netlify.toml`
  `schedule = "30 13 * * 0"`. Manual HTTP invocation requires
  `WEEKLY_DIGEST_SECRET`.

### [INFRA] Firestore rules + indexes
**Target**: `firestore.rules`, `firestore.indexes.json`
**Action**: Update
**Requirements**:
- `homeworkRateLimits/{key}` — deny all (server-only).
- Add composite indexes for `homeworkSessions`:
  `gsiSessionId + createdAt desc`, `gsiSessionId + kidId + createdAt desc`,
  `schoolId + createdAt desc` (sparse, for the Phase 3 teacher heatmap).
- Add `botSessions` indexes for `botHandle + lastActiveAt desc`
  (weekly-digest iteration) and `kidId + lastActiveAt desc` (per-kid
  lookups).

### [TESTS] Unit coverage
**Target**: `lib/bot/services/*.spec.ts`,
`lib/bot/digests/weeklyHomeworkDigest.spec.ts`,
`lib/firebase/sessionService.streak.spec.ts`,
`app/api/homework/sessions/[id]/route.spec.ts`
**Action**: Create
**Requirements**:
- `wordErrorRate` / `accuracyFromWer` on English + Devanagari.
- Language detection across English, Hindi, mixed, empty.
- Session store: creation, reveal tracking, mastery denominator, skip.
- Rewards: points math (revealed weighting), IST day boundary,
  delegation to `updateSessionPoints`.
- Streak math: fresh start, yesterday increment, same-day idempotency,
  day-skip reset.
- Digest stats: completed vs incomplete counts, subject averaging,
  strongest/working-on selection, revealed totals.
- API route: ownership enforcement (not-found vs forbidden vs ok).

## Acceptance criteria
- Forwarding a plain-text homework to the bot returns a mode selector
  within 6 seconds (p50) on a warm container.
- Non-homework forwards trigger the confirmation prompt instead of a
  hallucinated session.
- Kids can forward homework in English or Hindi and the bot replies
  consistent with `HomeworkSession.language`.
- After 3 failed attempts on a question, the bot reveals the answer
  and continues — the revealed question does not tank the mastery score.
- Completing a homework session awards at least the base 20 AI Points
  and unlocks Homework Hero Bronze on the first completion.
- `/homework/history` on the web shows the caller's sessions; opening
  one shows every question and answer.
- Sunday evening IST: every linked chat with activity in the last 7
  days receives a digest DM.
