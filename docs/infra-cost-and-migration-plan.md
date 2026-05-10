# Infrastructure Cost Model & Firebase Migration Plan

**Date**: 2026-05-05
**Status**: Draft for review
**Purpose**: Decide if/when/where to migrate off Firebase, and confirm the current pricing tiers can reach break-even.

---

## TL;DR

1. **Firebase is NOT the dominant cost driver** — AI (Claude + image gen) is ~80–95% of variable cost per creation. Migrating to Supabase saves ~₹15–80K/month at 30K MAU but doesn't fix the real margin problem.
2. **The real risk is the comic/story `base64` images stored inline in Firestore docs.** That alone can blow Firestore bandwidth from ~$50 to ~$500+/month at 30K MAU. Fixing this is higher leverage than the database migration itself.
3. **Recommended path**: Move base64 images to object storage now (Firebase Storage or Supabase Storage — same effort), defer the full database migration until ~10K MAU when Supabase's predictability advantage outweighs migration cost.
4. **Break-even at current pricing**: ~5,300 Pro users OR ~150 schools (or a blend), assuming 30K active free users. Achievable but tight — a third "Family/Creator-Lite" tier at ₹99 closes the gap faster.

---

## 1. Current Pricing (from `components/marketing/Pricing.tsx`)

| Tier | Price | Limits | Target |
|---|---|---|---|
| **Free** | ₹0 forever | 3 creations/day across all studios | Trial / virality |
| **Pro** | ₹299/month or ₹2,499/year | Unlimited creations, all 12 badges, parent dashboard | Daily creators |
| **Schools** | From ₹99/student/month, 50-student minimum (₹4,950/mo floor) | Everything in Pro + teacher dashboard + CBSE plans + compliance | Schools (CBSE 2026-27 mandate) |

---

## 2. Cost Per Creation — What Actually Drives Spend

A "creation" = 1 row in `creations` collection + 1 LLM call + 0 to N image/audio generations.

### 2.1 Studio cost breakdown

| Studio | LLM tokens (in/out) | Images | Audio | Notes |
|---|---|---|---|---|
| Story | ~1K / 4K | 5 (default), max 8 | 0 | `lib/validators.ts` `pages.default(5)` |
| Comic | ~1K / 4K | 4 panels | 0 | base64 stored inline → big docs |
| Quiz | ~0.5K / 2K | 0 | 0 | Cheapest studio |
| Game | ~0.5K / 3K | 0–N | 0 | 8 scenes (`gamePrompt.ts`) |
| Music | ~0.5K / 1.5K | 0 | 1 (Gemini) | Audio dominates cost |

### 2.2 Provider chain (already cost-aware — good)

- **LLM**: Groq (free) → Claude Sonnet 4 (paid). Auto-fallback in `app/api/ai/story/route.ts:40`.
- **Images**: ComfyUI local → Pixazo Flux Schnell (free tier) → Replicate SDXL (~$0.0027/image) → Pollinations (free). See `lib/ai/imageProvider.ts:64`.
- **Audio**: Gemini (cheap, ~$0.005/sec for TTS-class).

### 2.3 Cost per creation — three scenarios

Assumptions: ₹1 ≈ $0.012 USD; Claude Sonnet 4 at $3/MTok in, $15/MTok out.

| Scenario | LLM | Images | Firestore | **Per creation** |
|---|---|---|---|---|
| **All-free path** (Groq + Pixazo/Pollinations) | $0 | $0 | ~$0.00005 | **~₹0.005 (essentially free)** |
| **Realistic blend** (Claude 30% of time, Replicate 20% fallback) | ~$0.02 | ~$0.003 | $0.0001 | **~₹2.0** |
| **Worst case** (always Claude + always Replicate) | $0.06 | $0.0135 | $0.0002 | **~₹6.2** |

> **Note**: Groq's free tier has rate limits (~30 req/min). Once you exceed it, you fall back to Claude at full price. So real cost depends heavily on hourly traffic distribution, not just MAU.

---

## 3. Per-User Monthly Cost

### 3.1 Free user (signups → active funnel)

Industry benchmark for ed-tech freemium: 5–10% DAU/MAU, 25–35% MAU/total signups.

| User type | Creations/mo | Cost @ realistic blend | Cost @ worst case |
|---|---|---|---|
| Active free (uses daily) | 3/day × 30 = 90 | ₹180 | ₹560 |
| Casual free (uses weekly) | 3/wk × 4 = 12 | ₹24 | ₹75 |
| Inactive (signup only) | 0–3 total | ~₹3 | ~₹15 |

**Blended free-user cost** (assuming the funnel above): **~₹15–40/month per signup that converted to MAU**.

### 3.2 Pro user (₹299/month)

"Unlimited" needs a soft cap to model. Real power users:

| Pro user type | Creations/mo | Cost (realistic) | **Margin** |
|---|---|---|---|
| Light Pro (3/day) | 90 | ₹180 | **₹119** |
| Medium Pro (10/day) | 300 | ₹600 | **−₹301 (LOSS)** |
| Heavy Pro (30/day) | 900 | ₹1,800 | **−₹1,501 (LOSS)** |

> ⚠️ **Risk**: "Unlimited" Pro is unprofitable for daily power users. Either (a) add a soft cap (e.g. 50/day), (b) push heavy users to a higher tier, or (c) ensure free-provider fallbacks dominate (Groq + Pixazo carry most volume).

### 3.3 School user (₹99/student/mo, 50-student min = ₹4,950/mo floor)

| School type | Creations/student/mo | Cost/student | Margin/student | Margin/school (50 students) |
|---|---|---|---|---|
| Light usage (2/day school days) | 40 | ₹80 | ₹19 | ₹950 |
| Medium (5/day school days) | 100 | ₹200 | **−₹101 (LOSS)** | **−₹5,050** |
| Heavy (homework + class) | 200 | ₹400 | **−₹301 (LOSS)** | **−₹15,050** |

> ⚠️ **CRITICAL**: ₹99/student/month is **likely below cost** for any school using the platform meaningfully. This needs re-pricing or per-student-creation caps.

---

## 4. Firebase vs Supabase vs Custom Postgres

### 4.1 At 1K MAU (today-ish)

| Stack | Monthly cost | Notes |
|---|---|---|
| **Firebase** (current) | $5–20 | Below free tier on most metrics |
| **Supabase** | $0 (Free) or $25 (Pro) | Free tier covers this easily |
| **Custom Postgres** (Hetzner/Railway) | $20–40 | + ~3 weeks engineering to build auth + RLS-equivalent |

**Verdict at 1K**: Stay on Firebase. Migration cost > savings.

### 4.2 At 10K MAU

| Stack | Monthly cost | Notes |
|---|---|---|
| **Firebase** | $80–250 | Reads dominate; comics-with-base64 inflate egress |
| **Supabase** | $25 + ~$50 compute = **$75** | Predictable, includes 250GB bandwidth |
| **Custom Postgres** | $50–80 + ops time | Cheapest if you have a DevOps person |

**Verdict at 10K**: Supabase wins on predictability and modest savings. **This is the migration trigger point.**

### 4.3 At 100K MAU (assume 30K active)

| Stack | Monthly cost | Risk |
|---|---|---|
| **Firebase** | $500–1,500+ | Per-op pricing punishes feed/browse-heavy products |
| **Supabase** | $25 + $200–400 compute = **$225–425** | Linear, predictable |
| **Custom Postgres** (managed e.g. Neon/RDS) | $150–300 + ongoing ops | Cheapest, highest ops burden |

**Verdict at 100K**: Supabase saves ~50–70% vs Firebase, ~30% more than custom Postgres but with zero ops overhead.

### 4.4 The hidden cost nobody talks about: comic base64 images

`docs/data-model.md` line 139: comics store `"imageUrl": "data:image/png;base64,..."` directly in Firestore docs.

- 1 comic = 4 panels × ~200KB base64 = **~800KB per document**
- Firestore document max = 1MB (close to limit)
- Each public-feed read of 20 comics = **16MB egress**
- 1000 feed views/day × 30 = **~480GB egress/month** at 30K MAU
- Cost: 480GB × $0.12/GB = **~$58/month just for comic egress**

This is fixable in either Firebase OR Supabase by moving images to object storage. **Do this first regardless of migration choice.**

---

## 5. Break-Even Analysis

### 5.1 Cost stack at 30K MAU (the "interesting" scale)

**Fixed monthly costs**:
- Hosting (Netlify): ₹4,000 ($50)
- Firebase/Supabase base: ₹2,000 ($25) → ₹15,000 ($180) at 30K
- Anthropic minimum / commit: ₹8,000 ($100)
- Image storage CDN: ₹3,000 ($35)
- Founder salary opportunity cost (excluded for now)
- **Subtotal fixed**: **~₹30,000/mo**

**Variable cost @ 30K active free + AI usage**:
- 30K × ₹25 average per active free user = **₹750,000/mo**

**Total monthly burn at 30K MAU**: **~₹780,000 (~$9,750)**

### 5.2 Revenue needed to break even

To cover ₹780K/mo:

| Strategy | Pro users needed | Schools needed | Combined example |
|---|---|---|---|
| Pro only (@ ₹150 margin/user) | 5,200 | 0 | — |
| Schools only (@ ₹4,000 margin/school, light usage) | 0 | 195 | — |
| **Mix** | 2,000 | 100 | 2K Pro (₹300K) + 100 schools (₹400K) + buffer ₹80K |

**Conversion math**: 2,000 Pro out of 30K active free = **6.7% conversion** — aggressive but achievable for a strong ed-tech product.

### 5.3 What if free user cost is lower (free providers carry the load)?

If Groq + Pixazo + Pollinations handle 80%+ of volume, average cost per creation drops to ~₹0.5, so:
- Free user cost: 90 creations × ₹0.5 = **₹45/mo per active free user**
- Better: blended ₹5–10/mo per active free
- Total burn at 30K MAU: **~₹250K/mo** (3× lower)
- Break-even: **~1,500 Pro users (5% conversion)** OR **60 schools**

> **Implication**: aggressively prioritizing free-tier infrastructure (Groq, Pixazo, Pollinations) is the highest-ROI cost lever — bigger than Firebase→Supabase.

---

## 6. Recommended Pricing Adjustments

Current 2-tier consumer pricing leaves a gap and exposes margin risk.

### 6.1 Add a "Creator" tier at ₹99/mo

| Tier | Price | Limits |
|---|---|---|
| Free | ₹0 | 3 creations/day (current) |
| **Creator (NEW)** | **₹99/mo or ₹899/year** | 15 creations/day, 6 badges, no parent dashboard |
| Pro | ₹299/mo or ₹2,499/year | "Unlimited" — soft cap **50/day**, full features |
| Schools | Re-price to **₹149/student/month** (50 min) | Add per-student soft cap (10/day) |

**Why this works**:
- **Creator** at ₹99 captures price-sensitive families who'd never pay ₹299. India consumer ed-tech sweet spot is ₹99–199.
- **Soft cap on Pro** caps the worst-case loss. 50/day is generous for any real kid.
- **Schools at ₹149** matches actual cost of a meaningfully-used student. ₹99 is a loss-leader.

### 6.2 Annual nudge math

- Pro annual: ₹2,499 = 8.4 months equivalent → 30% discount, but eliminates monthly churn
- Push annual aggressively. CAC payback in 1 month vs 3+ months for monthly.

---

## 7. Migration Plan (Phased)

### Phase 0 — NOW (before any DB migration)

1. **Move base64 images out of Firestore** → Firebase Storage with public URLs in docs.
   - Effort: 2–3 days (one-time)
   - Savings: ₹4,000–₹50,000/month depending on scale
   - Works for both Firebase AND Supabase futures

2. **Add `costTracker` metadata to creations** — record which provider was used (Groq/Claude, Pixazo/Replicate). Lets you actually measure unit economics monthly.
   - Effort: 1 day
   - Touches: `lib/firebase/creationService.ts`, `lib/ai/claudeClient.ts`

3. **Add per-day soft caps even on Pro** (50/day default, configurable) — protects against worst-case loss.
   - Effort: 1 day in `lib/firebase/sessionService.ts`

### Phase 1 — At ~5K MAU (or now if expecting growth)

1. **Add Creator tier (₹99)** to pricing page + checkout flow.
2. **Re-price Schools to ₹149** (existing customers grandfathered).
3. **Aggressive free-provider routing**: ensure Groq + Pixazo handle 80%+ of free-tier traffic. Add metrics + alerting.

### Phase 2 — At ~10K MAU (the migration trigger)

1. **Migrate to Supabase** (recommended over custom Postgres).
   - Postgres schema mirrors `docs/data-model.md` collections.
   - Use Supabase Auth for parents (replaces Firebase Auth).
   - Use Supabase Realtime for any live features (currently we don't have many — easy migration).
   - Use Supabase Storage for media (already migrated in Phase 0).
   - **Estimated effort**: 4–6 weeks for one developer.
   - **Estimated savings**: ₹15K–₹50K/month at 10K MAU, growing linearly.

2. **Keep Firebase Auth for kid-facing flows during transition** (dual-write window of 2 weeks before cutover).

### Phase 3 — At ~50K+ MAU

1. **Re-evaluate**. If Supabase compute grows past ~₹40K/month, consider self-hosted Postgres (Neon/Hetzner). At that scale you should have a part-time DevOps person.

---

## 8. What I'd Do This Quarter (Concrete Next Actions)

1. **Week 1**: Move base64 → Firebase Storage. Add cost-tracking metadata. (Phase 0)
2. **Week 2**: Add Pro soft cap, ship Creator tier on pricing page. (Phase 1 partial)
3. **Week 3**: Re-price Schools, draft school-customer transition email.
4. **Week 4**: Build a `lib/cost/usage-monitor.ts` that reads `aiMetadata` + `creations` and outputs monthly cost-per-MAU. **You can't optimize what you can't measure.**
5. **Defer Supabase migration** until you hit ~10K MAU OR Firebase bill exceeds ₹40K/month, whichever first.

---

## 9. Open Questions

1. Do we have actual Firebase usage numbers from the last 3 months? The model above is bottom-up; real data would tighten the estimates by ±50%.
2. What's the current free→Pro conversion rate (even directional)? It's the single biggest unknown for break-even timing.
3. Are there contractual minimums with Anthropic / Replicate / Pixazo today? They change the fixed-cost line.
4. Do schools want offline / on-prem options (which would push us toward custom Postgres regardless)?

---

## 10. Source References

- Pricing tiers: `components/marketing/Pricing.tsx:15`
- Validation defaults: `lib/validators.ts:9` (story `pages.default(5)`)
- Image provider chain: `lib/ai/imageProvider.ts:64`
- Claude model in use: `lib/ai/claudeClient.ts:30` (Sonnet 4)
- Creations data model (incl. base64 inline): `docs/data-model.md:83`
- Comic base64 storage pattern: `docs/data-model.md:139`
