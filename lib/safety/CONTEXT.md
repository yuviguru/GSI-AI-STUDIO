# Content Safety

## Purpose
Multi-layer content safety pipeline ensuring all AI inputs and outputs are appropriate for children ages 8-17. Child safety is the #1 priority.

## Load References
@import /docs/security.md#ai-content-safety
@import /docs/security.md#child-safety-is-the-1-priority

## Structure
```
safety/
├── inputFilter.ts      # Pre-AI input validation (profanity, inappropriate topics)
├── outputFilter.ts     # Post-AI output validation (content classification, PII)
├── imageFilter.ts      # Image-specific safety (NSFW detection, style enforcement)
├── blocklist.ts        # Curated word/phrase blocklist
└── safetyTypes.ts      # Safety check result types
```

## Local Patterns
- Every AI generation call: `filterInput(input)` → AI call → `filterOutput(output)`
- Input filter: blocklist check → age-appropriate topic check → reject or sanitize
- Output filter: content classification → PII scan → pass or block
- Image filter: NSFW check (Replicate built-in) → style verification → pass or regenerate
- Rejection returns kid-friendly message: "Let's try a different idea!" (never "blocked" or "inappropriate")
- Log all safety rejections for audit (without storing the offending content long-term)
- Safety filters run server-side only

## Related Code
@see /lib/ai/prompts/               # System prompts include safety instructions
@see /app/api/ai/                   # API endpoints apply safety pipeline
@see /docs/security.md              # Full safety documentation
