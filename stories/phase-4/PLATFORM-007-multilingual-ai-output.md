# PLATFORM-007: English + Hindi AI Output Layer

## Description
Teacher-facing AI outputs (HPC narratives, question papers, PTM notes, lesson plans, parent messages) need to render in English and Hindi. This feature adds a small locale layer shared across all AI generators. Hindi only in Phase 4; the layer is architected so additional locales (Tamil, Telugu, Marathi, Bengali) can drop in without code churn when needed. Relies on Claude's native multilingual capability, enhanced with a curated CBSE/NEP glossary for terminology consistency.

## Requires KB Updates
- Update `docs/architecture.md` with locale layer design
- Update `docs/tech-standards.md` with locale convention for AI prompts

## Dependencies
- AI services in `lib/ai/` (consumers: ADMIN-004/005/006/007, COMMS-001/002)

## Subtasks

### [LIB] Locale constants + registry
**Target**: `lib/i18n/locales.ts`
**Action**: Create
**Requirements**:
- `SUPPORTED_LOCALES = ['en', 'hi'] as const; type Locale = typeof SUPPORTED_LOCALES[number]`
- `isSupportedLocale(s): s is Locale`
- `DEFAULT_LOCALE = 'en'`
- Pluggable: adding new locale = adding to array + glossary file, no other code change

### [LIB] CBSE/NEP glossary per locale
**Target**: `lib/i18n/glossary/hi.json`, `lib/i18n/glossary/en.json`
**Action**: Create
**Requirements**:
- Curated term map: `cognitive → संज्ञानात्मक`, `affective → भावात्मक`, `blueprint → प्रारूप`, etc.
- Covers NEP HPC domains, Bloom's taxonomy, CBSE learning-outcome verbs
- Consumed as prompt-cached glossary block

### [LIB] Locale-aware prompt helpers
**Target**: `lib/ai/localePrompts.ts`
**Action**: Create
**Requirements**:
- `buildSystemPrompt(basePrompt, locale): string` — wraps with locale directive + glossary
- `buildOutputFormatInstruction(locale, format): string`
- All AI generators call through this instead of raw prompts

### [LIB] Retrofit existing generators
**Target**: `lib/ai/hpcGenerator.ts`, `questionPaperGenerator.ts`, `feedbackSuggester.ts`, `lessonPlanGenerator.ts`, `ptmNoteGenerator.ts`, `parentDigestGenerator.ts`, `adhocMessageDrafter.ts`, `subInstructionsGenerator.ts`
**Action**: Modify
**Requirements**:
- All accept `locale: Locale` parameter
- Output always tagged with locale in persistence
- Fallback to `DEFAULT_LOCALE` if unsupported

### [TEST] Multilingual eval golden set
**Target**: `lib/ai/__tests__/multilingual.test.ts`
**Action**: Create
**Requirements**:
- For each generator × locale: run 3 golden-set inputs, check:
  - Output is in correct script (Devanagari for Hindi, Latin for English)
  - Key CBSE terms translate consistently (use glossary as expected answers)
  - No mid-text locale mixing (English sentence in a Hindi paragraph)
  - Same structure / length as English baseline

## Acceptance Criteria
- [ ] Every AI generator accepts `locale: Locale` param
- [ ] Hindi outputs render in Devanagari consistently
- [ ] CBSE/NEP terms use curated glossary translations
- [ ] Adding a new locale only requires registry + glossary addition (proven by adding Tamil as test-only)
- [ ] Passes multilingual golden-set eval
