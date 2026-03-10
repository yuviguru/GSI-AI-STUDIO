# Studios Components

## Purpose
Creation studio UI components — the core interactive experience where kids create with AI.

## Load References
@import /docs/ux-patterns.md#creation-studio-layout
@import /docs/ux-patterns.md#daily-spark-and-template-discovery
@import /docs/ux-patterns.md#ai-x-ray-popup
@import /docs/ux-patterns.md#game-player
@import /docs/api-contracts.md#ai-generation-endpoints
@import /docs/security.md#ai-content-safety

## Studios
- **Story Studio** (`story/`): Text premise → LLM generates narrative → image provider generates illustrations → shareable storybook
- **Music Lab** (`music/`): Mood/genre/theme → audio provider generates music → kid tweaks → shareable track
- **Quiz Maker** (`quiz/`): Topic → LLM generates questions → playable/shareable quiz game
- **Game Studio** (`game/`): Premise → LLM generates branching scene graph → interactive choose-your-own-adventure
- **Comic Studio** (`comic/`): Premise + characters → LLM generates panel scripts → image provider generates panels → comic with dialogue bubbles

## Local Patterns
- All studios follow the 3-step pattern: INSPIRE → CREATE → SHARE & LEARN
- Step 1 (INSPIRE): Suggestion chips + free text input + optional voice input
- Step 2 (CREATE): Animated loading with progress messages (5-30 seconds)
- Step 3 (SHARE): Interactive preview + Share/Save/AI X-Ray buttons
- Use `useAiGeneration` hook for all AI calls (handles loading, error, retry)
- AI X-Ray popup triggers automatically after creation, closeable, earns AI Points

## Related Code
@see /lib/ai/storyGenerator.ts      # Story generation pipeline
@see /lib/ai/musicGenerator.ts      # Music generation pipeline
@see /lib/ai/quizGenerator.ts       # Quiz generation pipeline
@see /lib/ai/validateSceneGraph.ts  # Game scene graph validation
@see /lib/ai/prompts/               # System prompts for each studio
@see /hooks/useAiGeneration.ts      # AI generation state management
@see /components/learning/           # AI X-Ray popup component
