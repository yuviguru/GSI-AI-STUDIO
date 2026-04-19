# UI-005: Customizable Per-Kid Mascots

## Description
Today every kid sees the same "Koko" Lottie mascot and the 7 expression JSONs in `public/lottie/` are dev placeholders. For MVP we want each kid to pick their own mascot (like a profile-icon picker) and swap the placeholders for real Lottie art sourced via the official [LottieFiles Creator MCP](https://creator.lottiefiles.com/).

## Requires KB Updates
- `docs/data-model.md` — Add `mascotId` field to `kids` doc
- `docs/ux-patterns.md` — Add MascotPicker pattern in kid profile setup

## Subtasks

### [MCP] Connect the official LottieFiles Creator MCP
**Target**: `.claude/settings.json`
**Source**: https://creator.lottiefiles.com/ (official Lottie-hosted MCP)
**Action**: Add MCP server entry so Claude Code can search, preview, and export Lottie animations directly from LottieFiles during design work. Follow the connection instructions on creator.lottiefiles.com (auth + endpoint).

### [TYPE] Add mascotId to Kid type
**Target**: `types/kid.types.ts`
**Action**: Add `mascotId: 'koko' | 'tara' | 'bolt' | 'luna' | 'zap' | 'pip'` (default `'koko'`).

### [ASSETS] Source 6 mascots × 7 expressions = 42 Lottie files
**Target**: `public/lottie/{mascotId}/{expression}.json`
**Expressions**: happy, painting, singing, celebrating, surprised, thinking, waving.
**Action**: Use LottieFiles MCP to search/commission; save per-mascot folders.

### [FE] Add MascotPicker component
**Target**: `components/profile/MascotPicker.tsx`
**Action**: Grid of 6 mascot tiles with live Lottie preview on hover/select. Mirror the UX of `ProfilePicker.tsx`.

### [FE] Wire MascotPicker into KidProfileSetup
**Target**: `components/profile/KidProfileSetup.tsx`
**Action**: Add mascot-pick step after avatar-pick; persist to `kids.mascotId` via `kidService.updateKid()`.

### [FE] Make Mascot.tsx read from kid profile context
**Target**: `components/mascot/Mascot.tsx`
**Action**: Read `mascotId` via `useKidProfile()`, load `public/lottie/{mascotId}/{expression}.json`. Fallback to `koko` if unset.

## Acceptance Criteria
- Each kid sees their chosen mascot across landing page, studios, celebration modal
- Mascot picker appears during new-kid setup and is editable from profile settings
- 6 mascots render with all 7 expressions without file-not-found errors
- LottieFiles MCP server callable by Claude Code for future mascot additions
