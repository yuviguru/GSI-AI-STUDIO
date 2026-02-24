---
name: kb-loader
description: Load context for a target file path. Walks up directories collecting CONTEXT.md files, resolves @import pointers to load doc sections, and assembles a focused context bundle.
---

# KB Loader

Load focused context for a target file path.

## Usage

Given a target file path, load all relevant context:

```
Target: app/api/ai/story/route.ts

Loads:
1. /CONTEXT.md (root)
2. /app/api/CONTEXT.md
3. All @import references from these files
```

## Algorithm

1. **Parse target path** — Extract directory path
2. **Walk up to root** — Collect CONTEXT.md at each level
3. **Parse @import directives**:
   - `@import /docs/security.md#auth-flow` → Load that section
   - `@import /docs/api-contracts.md` → Load entire file
4. **Parse @see directives** — Note related files (don't load)
5. **Assemble context** — Order: root → specific, deduplicate
6. **Trim to budget** — Target ~8k tokens max

## Project Structure Mapping

```
app/              → Frontend pages (Next.js App Router)
app/api/          → Serverless API routes (Netlify Functions)
components/       → React components
lib/firebase/     → Firebase client + admin SDK
lib/ai/           → AI service integrations (Claude, Replicate, Suno)
lib/safety/       → Content safety filters
hooks/            → Custom React hooks
types/            → TypeScript type definitions
```

## Output Format

```markdown
# Context for: [target path]

## Project Overview
[From root CONTEXT.md]

## Relevant Standards
[From @import directives]

## Local Context
[From nearest CONTEXT.md]

## Related Files
- path/to/related.ts
```
