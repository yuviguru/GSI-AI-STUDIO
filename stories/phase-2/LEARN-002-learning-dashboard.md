# LEARN-002: Learning Dashboard with Skill Tree

## Description
Visual learning dashboard showing AI concepts the kid has explored through their creations, mapped to CBSE AI & Computational Thinking curriculum. Features a skill tree where each creation unlocks concept nodes. Parents and teachers can view this as evidence of structured learning — "productive screen time" proof.

## Requires KB Updates
- Update `docs/data-model.md` with curriculum collection details

## Dependencies
- PROFILE-001 (kid profile stores concepts learned)

## Subtasks

### [LIB] Define curriculum mapping
**Target**: `lib/curriculum/curriculumMap.ts`
**Action**: Create
**Requirements**:
- Complete CBSE AI & CT curriculum map:
  - **AI Basics**: What is AI, Types of AI, AI vs Humans, AI in Daily Life
  - **Machine Learning**: Training Data, Pattern Recognition, Classification, Prediction
  - **NLP**: Natural Language Processing, Text Generation, Sentiment Analysis, Translation
  - **Computer Vision**: Image Recognition, Image Generation, Object Detection
  - **Creative AI**: Generative Art, Music Generation, Story Generation
  - **AI Ethics**: Bias in AI, Responsible AI, Privacy, Deepfakes
  - **Computational Thinking**: Decomposition, Pattern Recognition, Abstraction, Algorithms
- Each concept: `{ id, name, description, category, gradeLevel, studio: CreationType[] }`
- Map each studio action to concepts taught (e.g., creating a story teaches NLP + Text Generation + Creative AI)
- Export `getConceptsForCreation(type: CreationType): Concept[]`

### [FE] Create SkillTree component
**Target**: `components/learning/SkillTree.tsx`
**Action**: Create
**Requirements**:
- Visual tree/map with concept nodes organized by category
- Nodes: unlocked (colorful, checkmark) vs locked (greyed out)
- Categories as branches/sections: AI Basics, ML, NLP, Vision, Creative, Ethics, CT
- Tap a node: shows concept detail card (name, description, which creation taught it)
- Connection lines between related concepts
- Animated unlock when new concept is learned
- Responsive: works on mobile (vertical scroll) and tablet (full tree view)
- Uses SVG or CSS grid for layout

### [FE] Create ConceptCard component
**Target**: `components/learning/ConceptCard.tsx`
**Action**: Create
**Requirements**:
- Card showing: concept name, category badge, description (2-3 sentences kid-friendly)
- "Learned from: [Story/Music/Quiz]" with creation type emoji
- Grade level indicator (Class 6-8, 9-10, etc.)
- Locked state: shows "Create a [story/music/quiz] to learn about this!"
- Progress indicator if partially learned (e.g., "Explored 2/3 related concepts")

### [FE] Create Learning Dashboard page
**Target**: `app/(auth)/dashboard/page.tsx`
**Action**: Create
**Requirements**:
- Requires authentication (redirect to home if not logged in)
- **Summary stats**: concepts learned / total, categories covered, AI Points earned
- **SkillTree** as main content
- **Progress bars** per category showing % completion
- **Recent Concepts**: last 5 concepts learned with creation that taught them
- **Learning Report** export button (generates PDF summary)
- Active kid selector at top (if multiple kids)

### [LIB] Create learning report generator
**Target**: `lib/export/learningReport.ts`
**Action**: Create
**Requirements**:
- `generateLearningReport(kid: KidDoc, concepts: Concept[]): Promise<Blob>` — PDF report
- Contents: kid name, date range, concepts learned by category, creation count, curriculum mapping
- Format: clean, printable, parent/teacher-friendly
- Header: "GSI AI Studio — Learning Progress Report"
- Uses `jspdf` (same dependency as ENGAGE-001)

### [FE] Auto-track concepts on creation
**Target**: `hooks/useAiGeneration.ts`
**Action**: Update
**Requirements**:
- After creation: call gamification/learning endpoint with concepts taught
- Concepts come from `aiXray.concept` field returned by AI generation
- Update kid profile's `conceptsLearned` array
- Trigger concept unlock animation in dashboard (if dashboard is open)

## Acceptance Criteria
- [ ] Learning dashboard shows visual skill tree with concept nodes
- [ ] Unlocked concepts display with descriptions and source creation
- [ ] Locked concepts show what to create to learn them
- [ ] Category progress bars show % completion
- [ ] Learning report exports as PDF
- [ ] Concepts auto-track when kids create content
- [ ] Dashboard requires authentication
- [ ] Maps to CBSE AI & CT curriculum accurately
