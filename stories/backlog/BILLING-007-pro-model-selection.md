# BILLING-007: Pro-tier model selection per studio

## Description

Pro-plan kids should be able to **pick the AI model** per generation —
e.g. "use Claude Sonnet for this story", "use SDXL for this image".
Today every studio routes through the env-driven AI provider router
with a fixed cascade (Groq → Claude for text, Pixazo → Replicate →
Pollinations for images).

Two things to ship together:

1. **Inline model picker** in each studio (right next to the cost
   badge). Free/Creator users see a static "Auto" label; Pro+ users see
   a dropdown with the models their plan unlocks.
2. **Plan-aware provider routing** server-side. The route accepts an
   optional `model` param, validates it against the kid's plan, and
   passes it down to the provider router (which currently picks based
   on env + health, not request param).

## Why we deferred from BILLING-001

The current image routes all charge `image.flux` (5 credits) regardless
of which provider actually runs. The user noted: "Charging SDXL while
Flux runs would mislead kids." Until the router becomes plan-aware,
we can't ship the picker honestly. BILLING-001 deliberately stuck to
flat per-feature pricing.

## Scope

### Server

- Extend `lib/ai/router` (LlmRouter, ImageRouter) to accept an optional
  `requestedModel` param. Falls back to the existing cascade when not
  supplied.
- Validate `requestedModel` against the kid's plan's
  `entitlements.allowedLlmModels` / `allowedImageModels` (NEW fields
  on `PlanEntitlements`).
- Adjust `creditCosts.ts` per-model: `image.flux: 5`, `image.sdxl: 25`,
  `image.dalle3: 30`. Story/music similar.
- AI route handlers accept `model` in the request body; pass to the
  router; charge the matching `image.X` feature key.

### Client

- New `<ModelPicker feature="image" />` component. Reads the kid's
  plan via `useCredits()` → looks up `getEntitlements(plan).allowedImageModels`.
- Free kids: static "Auto" pill (no dropdown).
- Pro kids: dropdown lists "Auto" + each unlocked model. Selection
  passed to the generation form's submit handler.
- Cost badge re-renders based on selection (the existing
  `useCreditCost(feature)` hook already supports this).

### Documentation

- Update `docs/architecture.md` AI provider section to describe the
  plan-gated model param.
- Update `entitlements.ts` with the new `allowedLlmModels` /
  `allowedImageModels` arrays.

## Out of scope

- Audio model picker (Lyria is the only audio provider for now).
- Per-prompt model recommendations / quality scoring.
- Cost-tier-bucket display ("Auto picks the best free option").
  Future polish.

## Dependencies

- BILLING-001 — must ship first (this story depends on `enforceBilling`
  and `CREDIT_COSTS`).
- `ai-provider-abstraction-plan.md` — already supports a `maxCostTier`
  param. This story extends that to accept a specific model.
