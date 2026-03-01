# UI-004: Onboarding Flow for First-Time Users

## Description
New users land on the app with no guidance. Implement a 3-screen onboarding carousel that introduces the mascot "Koko", shows what kids can create (stories, music, quizzes), and nudges them into their first creation. Only shows once per device (tracked via localStorage).

## Requires KB Updates
- None

## Dependencies
- UI-002 (Mascot component)

## Subtasks

### [FE] Create OnboardingSlide component
**Target**: `components/onboarding/OnboardingSlide.tsx`
**Action**: Create
**Requirements**:
- Full-screen centered layout with illustration area, title, and subtitle
- Props: `illustration: ReactNode`, `title: string`, `subtitle: string`, `gradient: string`
- Large illustration area (top 50% of screen)
- Title in `font-display text-2xl font-bold`
- Subtitle in `text-gray-500 text-base`
- Supports background gradient prop for variety

### [FE] Create OnboardingCarousel component
**Target**: `components/onboarding/OnboardingCarousel.tsx`
**Action**: Create
**Requirements**:
- 3 slides:
  1. "Meet Koko!" — Mascot waving, "Your AI creative buddy who helps you imagine anything!"
  2. "Create Amazing Things" — Grid of 3 creation type previews (story book, music note, quiz), "Stories, music, quizzes — all powered by AI!"
  3. "Let's Go!" — Mascot celebrating, "Your first creation is just a tap away!"
- Swipe navigation with `framer-motion` drag gestures
- Dot indicator (3 dots) showing current slide
- "Skip" text button in top-right corner
- "Next" button on slides 1-2, "Start Creating!" CTA on slide 3
- Smooth spring transitions between slides
- Full-screen overlay (covers entire viewport including header/nav)
- z-index above everything (z-50)

### [FE] Wire onboarding into app entry
**Target**: `app/(public)/page.tsx`
**Action**: Update
**Requirements**:
- Check `localStorage` key `gsi-onboarding-complete` on mount
- If not set: render `OnboardingCarousel` as overlay
- On carousel complete/skip: set `localStorage` key, unmount overlay
- On "Start Creating!" tap: navigate to `/create/story` (lowest friction entry)
- Use `AnimatePresence` for smooth overlay exit animation
- Never shows again for returning users

### [FE] Create onboarding illustrations
**Target**: `components/onboarding/OnboardingIllustrations.tsx`
**Action**: Create
**Requirements**:
- Slide 1: Mascot component with `waving` expression at `lg` size, surrounded by floating sparkle emojis
- Slide 2: Three mini-cards showing story/music/quiz with their emojis and brief labels, arranged in a fan layout
- Slide 3: Mascot with `celebrating` expression, confetti-like dots in background
- All illustrations use existing Tailwind colors and `framer-motion` entrance animations
- Pure React/SVG — no external image assets needed

## Acceptance Criteria
- [ ] First-time visitors see the onboarding carousel overlay
- [ ] Carousel has 3 swipeable slides with dot indicators
- [ ] "Skip" button dismisses onboarding immediately
- [ ] "Start Creating!" on slide 3 navigates to Story Studio
- [ ] Onboarding never shows again after completion/skip
- [ ] Works smoothly on mobile with touch swipe
- [ ] Animations are smooth (no janky transitions)
