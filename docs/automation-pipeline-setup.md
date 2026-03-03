# Building an AI-Powered Dev Pipeline: Linear → Claude Code → GitHub PR

## Overview

This document captures how we built a fully automated development pipeline where:
1. You create a ticket in Linear (project management)
2. Assign it to yourself
3. Claude Code (AI) automatically implements the feature
4. Opens a PR with passing CI checks
5. You review, leave feedback via `@claude`, and it fixes issues
6. You merge

No manual coding required for standard features.

---

## Architecture

```
Linear (Issue Tracker)
    │
    │  Webhook (on assignment)
    ▼
Netlify Function (linear-webhook.ts)
    │
    │  repository_dispatch event
    ▼
GitHub Actions (claude-linear.yml)
    │
    │  Runs Claude Code Action
    ▼
Claude Code (AI Agent)
    │
    │  Reads story files, writes code,
    │  runs lint/typecheck/test/build
    ▼
Pull Request (auto-created)
    │
    │  You review, comment @claude for fixes
    ▼
Merge to main → Netlify auto-deploys
```

---

## Step 1: The Webhook Bridge (Netlify Function)

**File:** `netlify/functions/linear-webhook.ts`

This serverless function receives webhooks from Linear and bridges them to GitHub Actions.

### What it does:
- Receives POST from Linear when an issue is updated
- Verifies the webhook signature (HMAC-SHA256) for security
- Checks if the update is an **assignment change** (our trigger)
- Sends a `repository_dispatch` event to GitHub with the issue data

### Key design decisions:
- **Assignment-only trigger** — We tried label-based triggers first, but issues with existing labels would fire twice (once for label, once for assignment). Assignment is a single, intentional action.
- **Passes labels to GitHub** — Labels are forwarded so the workflow can select the AI model (Opus vs Sonnet) based on issue type.

### Code:
```typescript
// Only triggers on assignment — prevents duplicate runs
const isAssignment =
  action === "update" &&
  payload.updatedFrom?.assigneeId !== undefined &&
  data.assignee;

// Forwards issue data + labels to GitHub Actions
await triggerGitHubAction({
  issue_id: data.identifier || data.id,
  title: data.title || "Untitled",
  description: data.description || "",
  labels,
});
```

### Environment variables needed:
- `LINEAR_WEBHOOK_SECRET` — For signature verification
- `GITHUB_PAT` — Personal Access Token with `repo` + `actions:write` scopes

---

## Step 2: The GitHub Actions Workflow

**File:** `.github/workflows/claude-linear.yml`

This workflow runs when the webhook fires a `repository_dispatch` event.

### What it does:
1. **Creates a feature branch** — Slugifies the Linear issue title into a branch name (e.g., `CLA-6-ui-001-my-creations-gallery`)
2. **Selects the AI model** — Opus (powerful) by default, Sonnet (fast/cheap) if issue has a "quick-fix" label
3. **Runs Claude Code** — The AI reads the codebase, finds the matching story file, implements all subtasks
4. **Opens a PR** — With the Linear issue key in the title

### Branch naming:
```bash
ISSUE_ID="CLA-6"
TITLE="UI-001: My Creations Gallery"
# Slugify: lowercase, special chars → hyphens, trim to 50 chars
BRANCH="CLA-6-ui-001-my-creations-gallery"
```

### Model selection:
```bash
# Only "quick-fix" label triggers Sonnet, everything else uses Opus
if echo "$LABELS" | grep -q '"quick-fix"'; then
  MODEL="claude-sonnet-4-6"
else
  MODEL="claude-opus-4-6"
fi
```

### The prompt — what Claude Code receives:
```
1. Read .claude/CLAUDE.md for project context and conventions.
2. Look for the matching story file in stories/ (search by issue prefix).
3. If a story file exists, follow its subtasks exactly.
4. Follow existing code patterns.
5. Before creating the PR, run ALL checks and fix errors:
   - pnpm lint (code style)
   - pnpm typecheck (TypeScript)
   - pnpm test -- --run (unit tests)
   - pnpm build (production build)
   Do NOT create the PR until all four pass.
6. Prefix ALL commits with the issue key (e.g., CLA-6: add gallery UI).
7. Push and create a PR to main.
```

### Key lessons learned:
- **`claude_args` not `model:`** — The v1 action doesn't accept `model`, `direct_prompt`, `allowed_tools`, or `dangerously_skip_permissions` as inputs. Everything goes through `claude_args`.
- **All 4 CI checks required** — Initially we only told Claude to run lint + test. The PR passed those but failed typecheck + build in CI. Now Claude runs all 4 before pushing.
- **60-minute timeout** — Complex features can take 30+ minutes. We bumped from 30 to 60.

---

## Step 3: The PR Review Workflow

**File:** `.github/workflows/claude-pr-review.yml`

This workflow lets you give feedback on Claude's PR and have it fix issues.

### How to use:
1. Review the PR Claude created
2. Leave a comment: `@claude fix the type errors in CreationCard.tsx`
3. Claude reads your feedback, fixes the code, runs all checks, and pushes

### Triggers:
- `issue_comment` — Comments on the PR conversation
- `pull_request_review_comment` — Inline review comments on specific lines

### The prompt:
```
Address the review feedback in the PR comment. Fix the issues, then run ALL checks:
- pnpm lint
- pnpm typecheck
- pnpm test -- --run
- pnpm build

Fix any failures before pushing.
```

---

## Step 4: Linear Setup

### Create a webhook:
1. **Linear Settings → API → Webhooks → New webhook**
2. **URL:** `https://your-site.netlify.app/api/linear-webhook`
3. **Secret:** Same value as `LINEAR_WEBHOOK_SECRET` in Netlify
4. **Events:** Issue updates

### Issue structure that works best:
Each Linear issue maps to a **story file** in `stories/` with:
- Description of what to build
- Subtasks with specific file paths and requirements
- Labels for priority and phase

Example issue title: `UI-001: My Creations Gallery`
Matching story file: `stories/phase-1.5/UI-001-my-creations-gallery.md`

---

## Step 5: GitHub Secrets

Add to **GitHub repo → Settings → Secrets → Actions**:
- `CLAUDE_CODE_OAUTH_TOKEN` — From running `claude setup-token` in your terminal

---

## Step 6: The Story Files (Claude's Instructions)

**Directory:** `stories/`

These are detailed implementation specs that Claude follows. Each story has:
- Description
- Subtasks with `[FE]`, `[API]`, `[HOOK]` labels
- Target file paths
- Acceptance criteria

Example:
```markdown
# UI-001: My Creations Gallery

## Description
Implement the My Creations gallery at /creations.

## Subtasks
- [FE] Create CreationCard component — components/creation/CreationCard.tsx
- [FE] Create CreationGrid component — components/creation/CreationGrid.tsx
- [HOOK] Create useCreations hook — hooks/useCreations.ts
- [API] Implement delete endpoint — app/api/creations/[id]/route.ts
- [FE] Wire up My Creations page — app/(public)/creations/page.tsx
```

---

## Step 7: The Context System

**File:** `.claude/CLAUDE.md` + `CONTEXT.md` files throughout the repo

Claude reads these to understand:
- Tech stack (Next.js 14, Tailwind, Firebase, etc.)
- Code patterns and conventions
- Component structure
- API route patterns

This is what makes Claude's output consistent with your existing codebase.

---

## Complete Flow Example

1. **You** create a Linear issue: "UI-001: My Creations Gallery"
2. **You** add labels: "Feature", "Phase 1.5"
3. **You** assign it to yourself
4. **Linear** fires webhook → Netlify function
5. **Netlify function** verifies signature → dispatches to GitHub
6. **GitHub Actions** creates branch `CLA-6-ui-001-my-creations-gallery`
7. **GitHub Actions** selects Opus model (no "quick-fix" label)
8. **Claude Code** reads CLAUDE.md, finds story file, implements all subtasks
9. **Claude Code** runs lint ✓, typecheck ✓, test ✓, build ✓
10. **Claude Code** pushes commits prefixed `CLA-6:` and opens PR
11. **You** review the PR
12. **You** comment: `@claude fix the loading skeleton`
13. **Claude Code** fixes it, re-runs checks, pushes
14. **You** merge → Netlify auto-deploys to production

---

## Troubleshooting & Lessons Learned

### Issue: Duplicate workflow runs
**Cause:** Webhook triggered on both label changes AND assignment.
**Fix:** Changed to assignment-only trigger.

### Issue: Wrong AI model used (Haiku instead of Opus)
**Cause:** `model:` is not a valid v1 input. Action ignored it and used default.
**Fix:** Pass model via `claude_args: --model claude-opus-4-6`.

### Issue: PR created but CI fails
**Cause:** Prompt only told Claude to run lint + test. TypeScript and build errors slipped through.
**Fix:** Added typecheck + build to the prompt with "Do NOT create PR until all four pass."

### Issue: "Unexpected input" warnings in GitHub Actions
**Cause:** Used v0.x inputs (`direct_prompt`, `dangerously_skip_permissions`, `allowed_tools`) with v1 action.
**Fix:** Migrated everything to `claude_args` (the v1 way).

### Issue: 4KB Lambda env var limit on Netlify
**Cause:** `FIREBASE_SERVICE_ACCOUNT` base64 blob (~2.5KB) + other vars exceeded 4KB.
**Fix:** Replaced with individual credential fields (`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`).

### Issue: Deploy preview fails but production works
**Cause:** PR branch was created before the Firebase credentials fix was merged to main.
**Fix:** Rebase PR branch onto main: `git rebase main && git push --force-with-lease`.

---

## Cost & Performance

- **Opus** (features): ~$5-15 per story depending on complexity
- **Sonnet** (quick fixes): ~$1-3 per fix
- **PR review** (@claude feedback): ~$2-5 per round
- **Typical feature time:** 15-45 minutes end-to-end
