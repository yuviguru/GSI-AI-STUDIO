---
name: story-creator
description: Create implementation stories from new requirements. Analyzes requirement, loads existing context, breaks down into subtasks, and identifies if KB updates are needed. Outputs story file(s) to /stories/.
---

# Story Creator

Create stories from new requirements.

## Usage

```
Input: "Add parent dashboard with kid progress tracking"
Output: /stories/DASH-001-parent-dashboard.md
```

## Process

1. **Understand requirement** — Parse what's being asked
2. **Load context**:
   - /docs/prd.md — Existing features
   - /docs/architecture.md — Current system
   - /docs/data-model.md — Existing entities
   - /stories/*.md — Avoid duplicates
3. **Identify changes needed**:
   - New Firestore collections? → KB update needed
   - New API endpoints? → KB update needed
   - New UI pages/components? → Subtask
4. **Generate story** — With subtasks and KB update flags
5. **Save to /stories/** — With proper naming

## Story Template

```markdown
# [PREFIX]-[NUMBER]: [Title]

## Description
[What this accomplishes and why]

## Requires KB Updates
- [ ] data-model.md — [describe change]
- [ ] api-contracts.md — [describe change]
(or "None" if no updates needed)

## Subtasks

### [API] [Task title]
**Target**: `app/api/[path]/route.ts`
**Action**: Create | Update
**Requirements**:
- Requirement 1
- Requirement 2

### [FE] [Task title]
**Target**: `components/[path]/[Component].tsx`
**Action**: Create | Update
**Requirements**:
- Requirement 1
- Requirement 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

## Naming Convention

- **Prefix**: Feature area (STUDIO, AUTH, DASH, SHARE, LEARN, INFRA)
- **Number**: Sequential (001, 002, etc.)
- **Slug**: Kebab-case description

Examples:
- STUDIO-001-story-creation-flow.md
- AUTH-001-anonymous-sessions.md
- SHARE-001-whatsapp-sharing.md
- LEARN-001-ai-xray-popup.md

## KB Update Detection

Flag KB update if requirement involves:
- New Firestore collection/fields → data-model.md
- New API endpoints → api-contracts.md
- New system component or service → architecture.md
- New auth flow → security.md
- New UI pattern or component library → ux-patterns.md
