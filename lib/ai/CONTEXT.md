# AI Integrations

## Purpose
AI service integration layer with provider fallback chains — handles communication with multiple AI providers for text, image, and audio generation.

## Load References
@import /docs/architecture.md#ai-provider-fallback-chains
@import /docs/architecture.md#all-integrations
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
│   ├── gamePrompt.ts       # Game generation system prompt
│   ├── comicPrompt.ts      # Comic generation system prompt
│   └── xrayPrompt.ts       # AI X-Ray explanation prompt
├── claudeClient.ts         # Claude API client wrapper (primary text LLM)
├── groqClient.ts           # Groq (Llama 3.3) client wrapper (free text fallback)
├── replicateClient.ts      # Replicate API client wrapper (SDXL images + MusicGen audio)
├── pollinationsClient.ts   # Pollinations.ai client (free image generation, no API key)
├── comfyuiClient.ts        # ComfyUI client (self-hosted FLUX.1 Schnell images)
└── musicClient.ts          # Music generation (Lyria → Replicate MusicGen → Mock)
```

## Provider Fallback Logic
Each API route auto-selects providers based on configured environment variables:
- **Text**: Claude (`ANTHROPIC_API_KEY`) → Groq (`GROQ_API_KEY`)
- **Images**: ComfyUI (`COMFYUI_URL`) → Replicate (`REPLICATE_API_TOKEN`) → Pollinations (free, always available)
- **Audio**: Google Lyria (`GEMINI_API_KEY`) → Replicate MusicGen (`REPLICATE_API_TOKEN`) → Mock WAV (always available)

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
