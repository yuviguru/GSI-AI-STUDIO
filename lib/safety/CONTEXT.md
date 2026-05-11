# Content Safety

## Purpose
Multi-layer content safety pipeline ensuring all AI inputs and outputs are appropriate for children ages 8-17. Child safety is the #1 priority.

## Load References
@import /docs/security.md#ai-content-safety
@import /docs/security.md#child-safety-is-the-1-priority

## Structure
```
safety/
├── inputFilter.ts        # filterInput / filterOutput / filterImagePrompt (gateway functions)
├── blocklist.ts          # Topical blocklist (violence, sex, drugs, hate, PII subjects)
├── profanityFilter.ts    # Reusable word-level abuse filter (text + voice transcripts)
└── profanityList.ts      # Structured profanity word list with severity + language tags
```

## Two Concerns, Two Files

- **Topical blocklist** (`blocklist.ts`) — *subjects* the AI shouldn't write about ("kill", "drugs", "porn"). Caught at the AI prompt boundary by `filterInput`.
- **Profanity filter** (`profanityFilter.ts`) — *abusive words* in any text, regardless of subject. Reused for: text input, AI output, kid voice transcripts, captions, comments, performance moderation.

## Local Patterns

### Standard AI flow
- Every AI generation call: `filterInput(input)` → AI call → `filterOutput(output)`
- `filterInput`: minimum-length check → topical blocklist → profanity check (severity ≥ moderate) → throws on hit
- `filterOutput`: PII redaction (phone/email/address/Aadhaar) → profanity masking → returns sanitized text
- `filterImagePrompt`: image-specific keyword block → profanity check → throws on hit

### Voice transcript flow (PERF-001)
- Kid records audio → speech-to-text → run transcript through `maskProfanity()` (does **not** throw)
- Inspect `hits[].severity`:
  - `severe` → set performance `status='flagged'`, route to moderation queue
  - `moderate` → publish but show masked transcript / caption
  - `mild` → publish unchanged
- Same module, different decision logic at the call site.

### Reusability rules
- Use `profanityFilter.ts` directly when you need word-level checks without the topical blocklist (captions, comments, kid-typed messages).
- Use `inputFilter.filterInput` when you also need the topical blocklist (any AI prompt).
- Never re-invent the leetspeak / repeat / inter-letter-punctuation logic — call into the filter.

### Other rules
- Rejection returns kid-friendly message: "Let's try a different word/idea!" (never "blocked" or "inappropriate").
- Log all safety rejections for audit (without storing the offending content long-term).
- Safety filters run server-side only.

## Extending the Profanity List

Edit `profanityList.ts`. Each entry:
```ts
{ term: 'word', severity: 'mild' | 'moderate' | 'severe', language: 'en' | 'hi-en' | ... }
```
- Default match strategy is `'word'` (whole-word, leet-tolerant). Override to `'substring'` only when false-positive risk is zero.
- Severity drives behavior: severe = always block + flag; moderate = block input, mask output; mild = pass input, mask output.
- Marked TODO sections in the list show where to slot Hinglish, Tamil, Punjabi, Bengali, and slur entries.

## Related Code
@see /lib/ai/prompts/               # System prompts include safety instructions
@see /app/api/ai/                   # API endpoints apply safety pipeline
@see /docs/security.md              # Full safety documentation
