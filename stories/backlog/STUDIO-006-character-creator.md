# STUDIO-006: Character Creator — Design Custom Characters

## Description
Let kids design custom characters (name, appearance, personality traits) that persist in their profile and can be reused across stories, comics, and games. Kids love returning characters — this creates attachment and continuity in their creations.

## Requires KB Updates
- Update `docs/data-model.md` with characters sub-collection

## Dependencies
- PROFILE-001 (kid profiles — characters stored per kid)
- STUDIO-004 (Game Studio), STUDIO-005 (Comic Studio) — characters used across studios

## Subtasks

### [FE] Create CharacterDesigner component
**Target**: `components/character/CharacterDesigner.tsx`
**Action**: Create
**Requirements**:
- Multi-step character builder:
  1. Name + gender + age
  2. Appearance: body type, skin color, hair style/color, eye color (using modular avatar builder)
  3. Outfit: casual, school uniform, traditional Indian, fantasy, sci-fi
  4. Personality traits: pick 3 from list (brave, funny, kind, smart, curious, creative, adventurous, shy, mischievous)
  5. Special ability/superpower (optional, for fantasy/superhero stories)
- Preview: assembled character illustration updates in real-time
- Save to kid profile's `characters` sub-collection

### [FE] Create CharacterPicker component
**Target**: `components/character/CharacterPicker.tsx`
**Action**: Create
**Requirements**:
- Shows in PromptForms as optional "Add your characters" section
- Horizontal scroll of saved character cards
- Tap to select (multi-select for stories with multiple characters)
- "Create New" button opens CharacterDesigner
- Selected characters injected into AI prompt

### [API] Generate character portrait
**Target**: `app/api/ai/character/route.ts`
**Action**: Create
**Requirements**:
- Takes character description and generates a portrait illustration via Replicate
- Consistent art style matching story illustrations
- Saved as character's `portraitUrl`

## Acceptance Criteria
- [ ] Kids can design characters with name, appearance, and personality
- [ ] Characters persist in kid profile
- [ ] Characters selectable when creating stories, comics, and games
- [ ] AI incorporates selected characters into generated content
- [ ] Character portrait auto-generates from description
