# PLATFORM-005: Multilingual Support — Hindi, Tamil, Telugu, Kannada

## Description
Add Indian language support for both the UI and AI-generated content. Kids can use the app in their preferred language, and AI generates stories/quizzes/games in regional languages. Starts with Hindi, then expands to Tamil, Telugu, and Kannada.

## Requires KB Updates
- Update `docs/architecture.md` with i18n architecture

## Subtasks

### [LIB] Set up i18n framework
**Target**: `lib/i18n/`
**Action**: Create
**Requirements**:
- Use `next-intl` or lightweight custom i18n solution
- Language files: `lib/i18n/messages/{en,hi,ta,te,kn}.json`
- Language selector component
- Store preference in localStorage and kid profile
- Translate all UI strings (buttons, labels, headings, descriptions)
- Keep AI prompt engineering in English (Claude works best in English, translates output)

### [API] Add language parameter to AI generation
**Target**: `app/api/ai/story/route.ts` (and all AI routes)
**Action**: Update
**Requirements**:
- Accept optional `language` parameter in request body
- Modify Claude system prompt to generate content in requested language
- Support: English, Hindi, Tamil, Telugu, Kannada
- Transliteration option for Hindi (Devanagari vs Roman script)

### [FE] Create LanguageSwitcher component
**Target**: `components/shared/LanguageSwitcher.tsx`
**Action**: Create
**Requirements**:
- Dropdown or bottom sheet with language options
- Each option: flag/icon + language name in native script
- Accessible from Header settings area
- Language change triggers re-render of all translated strings

## Acceptance Criteria
- [ ] App UI available in 5 languages
- [ ] AI generates content in selected language
- [ ] Language preference persists across sessions
- [ ] Language switcher accessible from header
