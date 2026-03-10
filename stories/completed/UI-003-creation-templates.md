# UI-003: Creation Templates & Prompt Starters

## Description
Kids stare at blank prompts and don't know what to create. Provide pre-made templates, trending topic suggestions, a "Daily Spark" rotating prompt, and a "Surprise Me!" random button. This dramatically reduces the barrier to first creation and increases variety of content.

## Requires KB Updates
- None

## Subtasks

### [LIB] Create template data structure
**Target**: `lib/templates/storyTemplates.ts`, `lib/templates/musicTemplates.ts`, `lib/templates/quizTemplates.ts`, `lib/templates/index.ts`
**Action**: Create
**Requirements**:
- Each template: `{ id, emoji, title, description, promptText, category, settings? }`
- Story templates (12+): categorized by genre (Adventure, Fantasy, Sci-Fi, Friendship, Indian Mythology, School Life, Animal Kingdom, Space)
- Music templates (10+): categorized by mood/genre (Happy, Chill, Dance, Bollywood, Classical Fusion, Rap, Lullaby)
- Quiz templates (10+): categorized by subject (Science, History, Geography, Indian Culture, Space, Animals, Sports, Bollywood)
- Each template pre-fills the prompt textarea AND optional settings (genre, mood, difficulty)
- Export `getTemplatesByType(type: CreationType)` and `getRandomTemplate(type)` functions

### [FE] Create TemplateCarousel component
**Target**: `components/shared/TemplateCarousel.tsx`
**Action**: Create
**Requirements**:
- Horizontally scrollable card carousel (CSS scroll-snap)
- Each card: emoji icon + title + short description (2 lines max)
- Cards sized ~140px wide, colorful backgrounds matching studio theme
- Tap selects template → calls `onSelect(template)` callback
- Category tabs above carousel for filtering
- Smooth scroll with touch momentum
- "See all" link to expand into full grid view

### [LIB] Create Daily Spark system
**Target**: `lib/templates/dailySpark.ts`
**Action**: Create
**Requirements**:
- `getDailySpark(type: CreationType): Template` — returns deterministic daily prompt based on date hash
- Uses `new Date().toISOString().split('T')[0]` as seed for consistent daily rotation
- Different spark for each studio type
- Pool of 30+ spark prompts per type (covers a month without repeats)
- No database needed — pure client-side date-based selection

### [FE] Create SurpriseButton component
**Target**: `components/shared/SurpriseButton.tsx`
**Action**: Create
**Requirements**:
- Dice/magic wand icon button with "Surprise Me!" label
- Dice roll animation on click (rotate 360deg + shake)
- Calls `getRandomTemplate(type)` and applies it
- Positioned next to or below the prompt textarea
- Uses `framer-motion` for roll animation

### [FE] Integrate templates into PromptForms
**Target**: `components/studios/story/StoryPromptForm.tsx`
**Action**: Update
**Requirements**:
- Add TemplateCarousel below prompt textarea (before the "Create" button)
- Show Daily Spark as highlighted card at the start of carousel
- On template select: fill textarea with `promptText`, update genre/style settings if template has them
- Add SurpriseButton next to the prompt textarea
- Same integration for `MusicPromptForm.tsx` and `QuizPromptForm.tsx`

### [DATA] Track template usage in creation metadata
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add optional `templateId?: string` field to `Creation` interface
- Pass through from prompt form → API → Firestore save
- Used for future analytics (which templates are most popular)

## Acceptance Criteria
- [ ] Each studio shows a template carousel below the prompt input
- [ ] Tapping a template fills the prompt and optional settings
- [ ] Daily Spark shows a unique daily prompt, consistent for all users
- [ ] "Surprise Me!" picks a random template with animation
- [ ] Templates are categorized and filterable
- [ ] Template usage is tracked in creation metadata
- [ ] Templates are age-appropriate and Indian-context relevant
