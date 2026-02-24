---
name: story-runner
description: Execute all subtasks in a story file. Reads the story, runs kb-updater if KB changes needed, then executes each subtask using code-generator. Tracks progress and reports completion.
---

# Story Runner

Execute a complete story with all subtasks.

## Usage

```
Input: "Implement story STUDIO-001"
Process:
1. Read /stories/STUDIO-001-*.md
2. Check "Requires KB Updates" section
3. If updates needed, run kb-updater first
4. For each subtask, run code-generator
5. Report completion status
```

## Execution Order

1. **KB Updates First** — If story requires doc updates
2. **Server Before Client** — [API] tasks before [FE]
3. **Dependencies** — Check @see references, generate missing deps first

## Progress Tracking

```markdown
## Story: STUDIO-001

### Progress
- [x] KB Updates (1/1)
- [x] [API] Create story generation endpoint
- [x] [FE] Create StoryPromptForm component
- [ ] [FE] Create StoryViewer component ← Current
- [ ] [FE] Wire up AI X-Ray popup

### Status: In Progress (3/5 subtasks)
```

## Subtask Labels

- `[API]` — Next.js API route handler (app/api/)
- `[FE]` — React component or page (components/ or app/)
- `[HOOK]` — Custom React hook (hooks/)
- `[LIB]` — Utility or service (lib/)
- `[TYPE]` — Type definitions (types/)
- `[CONFIG]` — Configuration file
- `[TEST]` — Test file

## Error Handling

- Subtask fails: Stop, report error, allow retry
- Missing dependency: Generate dependency first
- KB update fails: Stop, manual intervention needed
