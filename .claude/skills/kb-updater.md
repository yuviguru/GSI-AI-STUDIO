---
name: kb-updater
description: Update documentation when stories require changes to data model, API contracts, or other docs. Updates docs, Firestore rules, and type definitions together to keep them in sync. Preserves existing structure and formatting.
---

# KB Updater

Update docs and related files when stories require changes.

## Usage

```
Input: Story with KB updates flagged
- data-model.md — Add challenges collection
- api-contracts.md — Add /challenges endpoints

Process:
1. Read current doc
2. Find correct section
3. Add new content following existing patterns
4. Update related files (types, Firestore rules)
5. Keep everything in sync
```

## Rules

### DO
- ✅ Add new content to existing sections
- ✅ Follow existing formatting patterns
- ✅ Preserve all existing content
- ✅ Match indentation and style
- ✅ Update types/ when data-model.md changes
- ✅ Update firestore.rules when adding new collections

### DON'T
- ❌ Change document structure
- ❌ Remove or modify existing content
- ❌ Change headings or section order
- ❌ Reformat existing content
- ❌ Add new top-level sections

## Document-Specific Patterns

### data-model.md + types/ (ALWAYS UPDATE TOGETHER)

**Step 1: Update data-model.md**
Find `## Collections` section, add new collection:

```markdown
### challenges
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-generated |
| title | string | Challenge title |
| ...
```

**Step 2: Update types/**
Create or update the relevant type file:

```typescript
// types/challenge.types.ts
export interface Challenge {
  id: string;
  title: string;
  // ...
}
```

**Step 3: Update firestore.rules**
Add security rules for the new collection.

### api-contracts.md

Find appropriate section or create subsection:

```markdown
### Challenges

#### GET /api/challenges
**Description**: List active challenges
**Auth**: Optional
**Response**: PaginatedResponse<Challenge>
```

### architecture.md

Add to Components section if new service:

```markdown
### Challenge Service
**Purpose**: Manage weekly creative challenges
**Dependencies**: Firestore, Claude API
```

## Update Verification

After updating, verify:
- [ ] data-model.md and types/ match
- [ ] Existing content unchanged
- [ ] New content in correct section
- [ ] Formatting matches surrounding content
- [ ] No duplicate entries
- [ ] firestore.rules updated if new collection
