# INFRA-010: Supabase Evaluation (Firebase → Supabase Migration Assessment)

## Description
Evaluate whether to migrate GSI AI Studio from Firebase (Firestore + Auth + Storage) to Supabase (Postgres + RLS + Auth + Storage). Revisit when Firebase spend exceeds **$200/month** or when data-model complexity starts to pay for relational features.

This is a non-coding discovery ticket — output is a go/no-go recommendation, not a migration.

## When to pick this up
- Firebase monthly invoice exceeds $200, OR
- We hit Firestore 1MB document limit on `creations` or `ceoBusiness` scaling, OR
- We need complex joins/aggregations (parent dashboard, school leaderboard), OR
- 2026-09-01 whichever is soonest — routine re-evaluation

## Current state (snapshot 2026-04-19)
- 10+ `lib/firebase/*Service.ts` service files (Firestore SDK syntax everywhere)
- 26 composite indexes in `firestore.indexes.json`
- `firestore.rules` ~60 lines (owner-only reads, Admin-SDK writes)
- Firebase Auth Phone OTP + Google Sign-In (wired in `hooks/useAuth.ts`)
- Firebase Storage for user uploads

## Rough migration cost (1 engineer)
- **Week 1**: Postgres schema design + RLS policies + set up Supabase project
- **Week 2**: Translate 10 service files (NoSQL → SQL), rewrite transactions
- **Week 3**: Rewrite rules as RLS, translate indexes, adapt storage adapter
- **Week 4**: Data migration script, integration tests, cut-over deploy

**Total**: 3–4 weeks of focused work, plus risk of regressions in hot paths (sessionService transactions, rate limiting, Kid CEO event engine).

## Cost comparison (at 1k DAU)
| | Firebase (Blaze) | Supabase (Pro) |
|---|---|---|
| Base | $0 + usage | $25/mo flat |
| Realistic 1k DAU/mo | $30–80 | $25 |
| Realistic 5k DAU/mo | $150–400 | $25–50 |

## Pre-migration optimizations (do first)
Before migrating, squeeze Firebase costs:
1. Batch `updateSessionPoints` writes (currently every action writes)
2. Aggressive client SDK caching on reads
3. Paginate heavy queries (`.limit(20)` everywhere)
4. Archive `creations` older than 90 days to cold storage

These often cut the bill 50–70%.

## Deliverables for this ticket
1. Benchmark current Firestore cost projection (pull Firebase billing data)
2. Prototype RLS policy equivalent of one `lib/firebase/*Service.ts` file
3. Schema design draft for the 10 biggest collections
4. Go/no-go recommendation memo
