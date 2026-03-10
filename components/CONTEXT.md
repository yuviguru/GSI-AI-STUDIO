# Components

## Purpose
Reusable React components for the GSI AI Studio UI, organized by domain.

## Load References
@import /docs/ux-patterns.md#design-system
@import /docs/ux-patterns.md#core-ux-patterns
@import /docs/tech-standards.md#frontend

## Structure
```
components/
├── ui/                 # Base UI primitives (shadcn/ui — Button, Input, Card, Dialog)
├── studios/            # Creation studio components
│   ├── story/          # StoryPromptForm, StoryViewer, PageFlip
│   ├── music/          # MusicPromptForm, MusicPlayer, WaveformVisualizer
│   ├── quiz/           # QuizPromptForm, QuizPlayer, ScoreCard
│   ├── game/           # GamePromptForm, GamePlayer (scene navigation)
│   └── comic/          # ComicPromptForm, ComicViewer (panel display)
├── creation/           # CreationCard, CreationGrid, CreationViewer
├── learning/           # AiXrayPopup, CurriculumBadge, PointsDisplay
├── mascot/             # Koko mascot (Lottie animations, 7 expressions)
├── celebrations/       # ConfettiCelebration (burst, rain, sides variants)
├── onboarding/         # OnboardingCarousel (first-time flow)
├── explore/            # Leaderboard, FeaturedSection
├── layout/             # Header, Footer, BottomNav, Sidebar
└── shared/             # ShareButton, RemixButton, TemplateCarousel, SurpriseButton, DownloadButton, LoadingAnimation, EmptyState
```

## Local Patterns
- One component per file, PascalCase naming
- Props interface defined above component
- Use `cn()` utility from `lib/utils.ts` for conditional Tailwind classes
- Extract sub-components when > 150 lines
- Kid-friendly: large touch targets (48px min), vibrant colors, rounded corners
- All loading states use animated illustrations, not spinners

## Related Code
@see /lib/utils.ts                  # cn() utility
@see /hooks/useAiGeneration.ts      # AI generation hook (loading/error states)
@see /types/creation.types.ts       # Creation type definitions
