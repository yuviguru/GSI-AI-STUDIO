# AI Integrations

## Purpose
AI service integration layer — handles communication with Claude, Replicate, and Suno APIs.

## Load References
@import /docs/architecture.md#external-integrations
@import /docs/api-contracts.md#ai-generation-endpoints
@import /docs/security.md#ai-content-safety
@import /docs/tech-standards.md#ai-integration

## Structure
```
ai/
├── prompts/                # System prompts for each studio
│   ├── storyPrompt.ts      # Story generation system prompt
│   ├── musicPrompt.ts      # Music generation system prompt
│   ├── quizPrompt.ts       # Quiz generation system prompt
│   └── xrayPrompt.ts       # AI X-Ray explanation prompt
├── storyGenerator.ts       # Story pipeline: Claude (text) + Replicate (images)
├── musicGenerator.ts       # Music pipeline: Suno/MusicGen
├── quizGenerator.ts        # Quiz pipeline: Claude
├── xrayGenerator.ts        # AI X-Ray explanation generator
├── claudeClient.ts         # Claude API client wrapper
├── replicateClient.ts      # Replicate API client wrapper
└── sunoClient.ts           # Suno/MusicGen API client wrapper
```

## Local Patterns
- All prompts include age-appropriate safety instructions
- Every AI call logs: model, tokens, cost estimate, creation ID, prompt version
- Generation pipelines handle retries (1 retry on transient failure)
- Image prompts always append safety keywords, negative prompts
- Force illustration/cartoon style for images (never photorealistic)
- Output always passes through safety filter before returning to client
- System prompts are versioned (track which version generated which creation)

## Related Code
@see /lib/safety/                   # Safety filters applied before/after AI calls
@see /app/api/ai/                   # API endpoints that call these generators
@see /docs/security.md#claude-system-prompt-safety-rules  # Safety prompt rules
