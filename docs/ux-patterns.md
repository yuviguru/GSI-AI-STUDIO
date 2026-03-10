# GSI AI Studio — UX Patterns

## Design Philosophy

**"Create in 60 seconds"** — Every creation studio must get a kid from landing to first creation in under 60 seconds. Zero friction, zero confusion, instant gratification.

**Target Users**: Kids ages 8-17 on phones, tablets, and school computers. Design for mobile-first, touch-first, low-bandwidth India.

## Design System

- **Colors**: Vibrant, playful palette — primary purple (#7C3AED), secondary orange (#F97316), accent cyan (#06B6D4). Dark mode optional Phase 2.
- **Typography**: Inter (UI), Comic Neue or Nunito (kid-facing content). Large touch targets, generous line heights.
- **Spacing**: 4px base grid. Spacing scale: 4/8/12/16/24/32/48/64.
- **Breakpoints**: sm(640), md(768), lg(1024), xl(1280). Design mobile-first.
- **Border Radius**: Rounded-xl (12px) for cards, rounded-full for buttons and avatars. Soft, friendly feel.
- **Shadows**: Subtle, colorful shadows (e.g., `shadow-purple-200`) for depth without heaviness.

## Core UX Patterns

### Creation Studio Layout

All five studios (Story, Music, Quiz, Game, Comic) follow the same 3-step pattern:

```
┌─────────────────────────────────────────┐
│  Step 1: INSPIRE                         │
│  ┌──────────────────────────────────────┐│
│  │ "What kind of story do you want?"    ││
│  │                                      ││
│  │ [🏰 Adventure] [🚀 Sci-Fi] [🧚 Fantasy] ││
│  │ [🎃 Mystery]  [😂 Funny]  [💕 Friend] ││
│  │                                      ││
│  │ Or type your own idea:               ││
│  │ ┌──────────────────────────────┐     ││
│  │ │ A brave cat who...           │     ││
│  │ └──────────────────────────────┘     ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │     [ ✨ Create My Story! ]          ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 2: CREATE (AI generating)          │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  │     ✨ Creating your story...        ││
│  │     [animated progress indicator]    ││
│  │                                      ││
│  │     "The AI is writing page 2..."    ││
│  │                                      ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 3: SHARE & LEARN                   │
│  ┌──────────────────────────────────────┐│
│  │  [Interactive creation preview]      ││
│  │  (storybook pages / music player /   ││
│  │   quiz game)                         ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌───────┐ ┌───────┐ ┌───────────────┐  │
│  │ Share │ │ Save  │ │ 🔍 AI X-Ray   │  │
│  │  📤   │ │  💾   │ │ How did AI    │  │
│  │       │ │       │ │ make this?    │  │
│  └───────┘ └───────┘ └───────────────┘  │
└─────────────────────────────────────────┘
```

### AI X-Ray Popup

Appears after every creation. Dismissable but incentivized with AI Points.

```
┌─────────────────────────────────────┐
│  🔍 AI X-Ray                    [✕] │
│                                     │
│  What just happened?                │
│  ─────────────────                  │
│  The AI used "Natural Language      │
│  Generation" to write your story.   │
│  It predicted the best next word    │
│  thousands of times to create       │
│  your narrative!                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📊 Model: Claude Sonnet     │   │
│  │ 🧠 Concept: Text Generation │   │
│  │ ⭐ +10 AI Points earned     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Got it! ] [ Tell me more → ]     │
└─────────────────────────────────────┘
```

---

### Daily Spark & Template Discovery

Every studio includes a rotating **Daily Spark** — a single prompt template that changes daily and is the same for all users that day. Below it, a template carousel with category filters.

- **Daily Spark**: Highlighted with special badge + gradient background. Deterministic per day (date-based hash)
- **Categories**: All, Adventure, Fantasy, Sci-Fi, Funny, etc. (studio-specific)
- **Display modes**: Horizontal scroll carousel (compact) or grid view ("See all")
- **30+ sparks per type**: Ensures unique daily inspiration for a full month
- **"Surprise Me!" button**: Random template selection with animated spinner (600ms)

### Koko Mascot

Animated AI mascot (Lottie animations) that appears throughout the experience:
- **7 expressions**: happy, thinking, celebrating, waving, surprised, painting, singing
- **Cache strategy**: Module-level Lottie data cache to prevent re-fetching on expression switches
- **Assets**: `/public/lottie/koko-*.json`
- **Fallback**: Animated pulse placeholder while loading
- **Appears in**: Creation loading states, AI X-Ray, Beat the AI results, MindX evaluation, celebrations

### Celebration Animations

Confetti celebrations triggered on milestones and achievements:
- **Three variants**: `burst` (100 particles), `rain` (repeated drops), `sides` (dual cannons)
- **Brand colors**: `#7C3AED, #F97316, #06B6D4, #FBBF24, #34D399`
- **Trigger logic**: Only fires on false→true transition (prevents multiple fires)
- **Respects**: `prefers-reduced-motion` media query
- **Milestones**: First creation, 50 points, 100 points, 5 creations, 10 creations
- **Sound effects**: Web Audio API synthesis (pointsEarned, badgeUnlocked, creationComplete, celebrate)

### Download & Export

Export options available on creation preview:
- **PDF export**: Story PDFs (title page + story pages + branding), Quiz PDFs (questions + answer key)
- **Print**: Hidden iframe approach with formatted layout, waits for images to load
- **Audio download**: Direct download for music creations
- **Download tracking**: Fire-and-forget POST to increment `downloadCount`

### Remix/Fork

Any public creation can be remixed:
- **Remix button**: Available on creation cards and detail view (full button or compact icon)
- **Behavior**: Navigates to studio with `?remix=<id>&prompt=<original>` — pre-fills prompt form
- **Original credit**: Remixed creations store `remixedFromId` linking to the original

### Game Player

Interactive scene-based game viewer:
- **Scene transitions**: Fade animation with slide direction (left for next, right for previous)
- **Choice buttons**: Large touch targets with hover/focus states
- **Path history**: Collapsible sidebar showing breadcrumb trail of decisions
- **Ending screen**: Shows ending type emoji (victory/neutral/try_again), scene count, share/restart buttons

### Onboarding Flow

First-time user carousel (shown once):
- **Full-screen modal carousel** with swipe support, dot indicators, skip button
- **Slides**: Welcome, Create, Learn, Share — each with gradient background + illustration
- **Completion**: Stored in `localStorage` (`gsi-onboarding-complete`) — never shown again
- **Swipe threshold**: 50px offset or 300px/s velocity

---

### Beat the AI — Human vs AI Challenge

Competitive mode where kids write their own response (no AI help) and then see how AI responds to the same prompt. 5-step flow: Pick → Prompt → Write → Reveal → Results.

```
┌─────────────────────────────────────────┐
│  Step 1: PICK CATEGORY                   │
│  ┌──────────┐ ┌──────────┐              │
│  │ ✍️ Story  │ │ 🧠 Quiz  │              │
│  │  Sprint   │ │  Whiz    │              │
│  │  3 min    │ │  4 min   │              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 💬 Caption│ │ 🎵 Rhyme │              │
│  │  Battle   │ │  Time    │              │
│  │  2 min    │ │  3 min   │              │
│  └──────────┘ └──────────┘              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 2: PROMPT REVEAL                   │
│  ┌──────────────────────────────────────┐│
│  │  🎯 Your Challenge:                  ││
│  │                                      ││
│  │  "Write a 3-sentence story about     ││
│  │   an auto-rickshaw that can fly"     ││
│  │                                      ││
│  │  ⏱️ 3:00 — Ready? Go!               ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 3: WRITE (Timed Input)             │
│  ┌──────────────────────────────────────┐│
│  │  ⏱️ 2:34 remaining                  ││
│  │  ─────────────────────────           ││
│  │  ┌──────────────────────────────┐    ││
│  │  │ The old auto-rickshaw coughed│    ││
│  │  │ twice, then sprouted golden  │    ││
│  │  │ wings from its rusty sides...│    ││
│  │  │                              │    ││
│  │  └──────────────────────────────┘    ││
│  │  143/500 characters                  ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │     [ ⚡ Submit My Answer! ]         ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 4: SIDE-BY-SIDE REVEAL             │
│  ┌────────────────┐ ┌──────────────────┐│
│  │  💜 YOUR TAKE   │ │  🤖 AI'S TAKE   ││
│  │                 │ │                  ││
│  │  "The old auto- │ │  "In the bustling││
│  │   rickshaw      │ │   streets of     ││
│  │   coughed..."   │ │   Mumbai..."     ││
│  └────────────────┘ └──────────────────┘│
│                                          │
│  Rate both! (1-5 stars each)             │
│  ┌──────────────────────────────────────┐│
│  │  Creativity:  You ⭐⭐⭐⭐⭐  AI ⭐⭐⭐ ││
│  │  Fun Factor:  You ⭐⭐⭐⭐   AI ⭐⭐⭐ ││
│  │  Accuracy:    You ⭐⭐⭐    AI ⭐⭐⭐⭐⭐││
│  │  Heart:       You ⭐⭐⭐⭐⭐  AI ⭐⭐   ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 5: RESULTS + AI X-RAY              │
│  ┌──────────────────────────────────────┐│
│  │  🏆 YOU WIN!                         ││
│  │  Your avg: 4.25 vs AI avg: 3.25     ││
│  │                                      ││
│  │  🔍 AI X-Ray:                        ││
│  │  "AI is great at accuracy and        ││
│  │   consistency, but YOU brought more  ││
│  │   creativity and heart!"             ││
│  │                                      ││
│  │  +25 AI Points earned ⭐             ││
│  └──────────────────────────────────────┘│
│  ┌───────────┐ ┌────────────────────┐   │
│  │ Play Again│ │ View My Stats 📊   │   │
│  └───────────┘ └────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key UX Notes (Beat the AI)**:
- Timer creates urgency — pulsing animation when <30s remain
- AI response generated AFTER kid submits (prevents peeking)
- Side-by-side uses purple (kid) vs cyan (AI) color coding
- Star ratings are tap-friendly (large targets, 48px minimum)
- Results screen includes Koko mascot with appropriate expression (celebrating if kid wins, encouraging if AI wins)
- "Play Again" is prominent CTA to drive replay loop
- Skill XP breakdown shown on results: "+5 Storytelling, +2 Creativity, +3 Speed Thinking"
- Skill radar chart (6-axis spider chart) accessible from StatsBoard after 3+ rounds
- Skill level-up triggers CelebrationModal with Koko + confetti
- Each category card shows its primary skill icon so kids know what they're developing
- AI difficulty badge shown in arena (easy/medium/hard) — adapts to kid's skill level

---

### MindX — AI Skill Assessment (IELTS-style)

Multi-module assessment where AI tests kids on Speaking, Listening, Thinking, and Reading. Koko (AI mentor) provides personalized feedback. 4-step flow: Pick Module → Challenges → AI Evaluates → Mentor Feedback.

```
┌─────────────────────────────────────────┐
│  Step 1: PICK MODULE                     │
│  ┌──────────┐ ┌──────────┐              │
│  │ 🎤 Speaking│ │ 👂 Listen │              │
│  │  Band: ⭐3 │ │  Band: 🔍2│              │
│  │  8 min     │ │  6 min    │              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 🧠 Think  │ │ 📖 Read  │              │
│  │  Band: 🌱1 │ │  New!    │              │
│  │  7 min     │ │  6 min    │              │
│  └──────────┘ └──────────┘              │
│                                          │
│  📊 Overall Band: Achiever (⭐ 3)        │
│  [View My Progress →]                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 2: CHALLENGES (5 per assessment)   │
│  ┌──────────────────────────────────────┐│
│  │  Challenge 2 of 5  •  🎤 Read Aloud ││
│  │                                      ││
│  │  Read this clearly and confidently:  ││
│  │                                      ││
│  │  "The monsoon clouds gathered over   ││
│  │   Mumbai, bringing the promise of    ││
│  │   rain to the dusty streets below."  ││
│  │                                      ││
│  │  ┌──────────────────────────────┐    ││
│  │  │  🎙️ [  Recording... 0:23  ]  │    ││
│  │  │  ████████████░░░░░ 60s      │    ││
│  │  └──────────────────────────────┘    ││
│  │                                      ││
│  │  [ ⏭️ Next Challenge ]               ││
│  └──────────────────────────────────────┘│
│  ● ● ○ ○ ○  (progress dots)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 3: AI EVALUATES (loading)          │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  │     🤔 Koko is reviewing your work...││
│  │     [animated mascot thinking]       ││
│  │                                      ││
│  │     "Analyzing your responses..."    ││
│  │     "Preparing your feedback..."     ││
│  │                                      ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 4: MENTOR FEEDBACK                 │
│  ┌──────────────────────────────────────┐│
│  │  🎤 Speaking Assessment Results      ││
│  │                                      ││
│  │  Band Score: ⭐⭐⭐⭐ Expert (72/100)  ││
│  │  ████████████████░░░░ 72%            ││
│  │  ↑ Improved from Achiever!           ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  🐨 Koko says:                       ││
│  │                                      ││
│  │  💪 Strengths:                       ││
│  │  • Clear pronunciation               ││
│  │  • Good vocabulary use                ││
│  │  • Confident expression               ││
│  │                                      ││
│  │  🌱 Keep Growing:                    ││
│  │  • Try pausing at commas             ││
│  │  • Add more descriptive details      ││
│  │                                      ││
│  │  💡 Tip: Practice reading aloud for  ││
│  │  5 minutes daily — record yourself   ││
│  │  and listen back!                    ││
│  └──────────────────────────────────────┘│
│                                          │
│  Challenge Breakdown:                    │
│  Ch1: ████████░░ 16/20 "Great fluency!" │
│  Ch2: ███████░░░ 15/20 "Good detail!"   │
│  Ch3: ████████░░ 14/20 "Nice vocab!"    │
│  Ch4: █████████░ 17/20 "Well reasoned!" │
│  Ch5: ██████░░░░ 10/20 "Keep trying!"   │
│                                          │
│  🔍 AI X-Ray: How did AI evaluate you?  │
│  +30 AI Points earned ⭐                │
│                                          │
│  ┌───────────┐ ┌────────────────────┐   │
│  │ Try Again │ │ Try Another Module │   │
│  └───────────┘ └────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key UX Notes (MindX)**:
- Module cards show current band + badge, "New!" label for untried modules
- Speaking module requires mic permission — show friendly permission request with fallback to text input
- Listening uses Web Speech Synthesis API for audio — "Tap to play" button, replay allowed once
- Challenges progress via dots at bottom (not a stepper — less intimidating)
- AI evaluation loading uses Koko thinking animation (same pattern as creation loading)
- Mentor feedback is the star of the show — large, prominent, kid-friendly language
- Band improvement is celebrated with confetti + Koko celebrating (reuse CelebrationModal)
- Challenge breakdown shows per-challenge scores with mini progress bars + one-line feedback
- "Try Another Module" CTA encourages exploring all 4 modules
- Progress Dashboard shows 4-module radar-like visualization + history

---

### Cerebro — Competitive Exam (Phase 2+)

Multi-round competitive exam with anti-malpractice measures. 5-step flow: Browse Competitions → Register → Take Exam → Results → Leaderboard.

```
┌─────────────────────────────────────────┐
│  Step 1: BROWSE COMPETITIONS            │
│  ┌──────────────────────────────────────┐│
│  │ 🏆 Cerebro Competitions              ││
│  │                                      ││
│  │ ┌─────────────────────────────────┐  ││
│  │ │ 🧠 AI & Reasoning Challenge     │  ││
│  │ │ Prelims • Ages 11-13 • Mar 15  │  ││
│  │ │ 2,340 registered                │  ││
│  │ │ [Register Now →]                │  ││
│  │ └─────────────────────────────────┘  ││
│  │ ┌─────────────────────────────────┐  ││
│  │ │ 📖 Language & Reading Quest     │  ││
│  │ │ Prelims • Ages 8-10 • Mar 20   │  ││
│  │ │ 1,120 registered                │  ││
│  │ │ [Register Now →]                │  ││
│  │ └─────────────────────────────────┘  ││
│  └──────────────────────────────────────┘│
│                                          │
│  Filter: [All Ages ▾] [Upcoming ▾]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 2: PRE-EXAM (Lockdown Setup)      │
│  ┌──────────────────────────────────────┐│
│  │ 🔒 Exam Environment Check            ││
│  │                                      ││
│  │ ✅ Browser fullscreen               ││
│  │ ✅ Notifications blocked            ││
│  │ ⏳ Checking connection...           ││
│  │                                      ││
│  │ ⚠️ Rules:                           ││
│  │ • Don't switch tabs or windows      ││
│  │ • Don't copy/paste answers          ││
│  │ • Complete within time limit        ││
│  │                                      ││
│  │ Time: 30 questions • 45 minutes     ││
│  │                                      ││
│  │ [ 🚀 Start Exam ]                  ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 3: EXAM (Proctored)               │
│  ┌──────────────────────────────────────┐│
│  │  Q12 of 30         ⏱️ 28:14 left    ││
│  │                                      ││
│  │  What is the primary purpose of a    ││
│  │  decision tree in AI?                ││
│  │                                      ││
│  │  ○ A) Store large datasets          ││
│  │  ● B) Make predictions by splitting ││
│  │       data into branches             ││
│  │  ○ C) Generate random numbers       ││
│  │  ○ D) Compress images               ││
│  │                                      ││
│  │  [ ← Previous ] [ Next → ]          ││
│  └──────────────────────────────────────┘│
│  🔒 Secure Mode  •  ● ● ● ○ ○ ○ ...   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 4: RESULTS                        │
│  ┌──────────────────────────────────────┐│
│  │ 🏆 Your Exam Results                ││
│  │                                      ││
│  │ Score: 78/100  •  Rank: #42         ││
│  │ ████████████████████░░░░ 78%        ││
│  │                                      ││
│  │ ✅ Qualified for Semi-Finals!       ││
│  │                                      ││
│  │ 📊 Breakdown:                       ││
│  │ AI Concepts:    ████████░░ 16/20    ││
│  │ Reasoning:      ███████░░░ 14/20    ││
│  │ Language:       █████████░ 18/20    ││
│  │ General:        ██████████ 20/20    ││
│  │ Problem Solve:  ████████░░ 10/20    ││
│  └──────────────────────────────────────┘│
│                                          │
│  +40 AI Points earned ⭐               │
│  [View Leaderboard →]                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 5: LEADERBOARD                    │
│  ┌──────────────────────────────────────┐│
│  │ 🏆 AI & Reasoning Challenge         ││
│  │ Prelims • Ages 11-13                ││
│  │                                      ││
│  │ [National ▾] [School ▾] [City ▾]   ││
│  │                                      ││
│  │ 🥇 Priya S.       96/100  Mumbai   ││
│  │ 🥈 Arjun K.       94/100  Delhi    ││
│  │ 🥉 Meera R.       92/100  Chennai  ││
│  │  4. Rahul P.      89/100  Pune     ││
│  │  5. Ananya D.     87/100  Kolkata  ││
│  │  ...                                ││
│  │ 42. You (78/100)  ← highlighted    ││
│  └──────────────────────────────────────┘│
│                                          │
│  Your School: #3 in Prelims             │
│  Your City: #18 in Mumbai               │
└─────────────────────────────────────────┘
```

**Key UX Notes (Cerebro)**:
- Competition cards show age group, round, date, registration count — CTA prominent
- Pre-exam lockdown screen clearly states rules and checks environment readiness
- Exam UI is clean and distraction-free — fullscreen, no navigation, prominent timer
- Question navigation via Previous/Next (no jumping to prevent answer-sharing coordination)
- Results screen celebrates qualification for next round, shows category breakdown
- Leaderboard has geographic filters (National → State → City → District → School)
- Display names only (privacy) — no full names or school details on public leaderboard
- "Secure Mode" indicator visible during exam (builds trust in fairness)
- Tab-switch/window-blur events trigger warning overlay (anti-malpractice Layer 1)
- Phase 2+ (requires authentication for identity verification and prize distribution)

---

### GrowthMap — Parent Insight Dashboard (Phase 2+)

Parent-facing dashboard aggregating child's activity, strengths, interests, and AI-generated learning insights. 4 panels: Activity Pulse → Strength Radar → Koko's Report → Interest Signals.

```
┌─────────────────────────────────────────┐
│  🗺️ GrowthMap — Aarav's Dashboard      │
│  [Weekly ▾]  [Mar 3-9, 2026]           │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 📊 Activity Pulse                   ││
│  │                                      ││
│  │ This Week: 12 sessions • 5 creations││
│  │ Time: 3h 0min • 🔥 4-day streak    ││
│  │                                      ││
│  │ M  T  W  T  F  S  S                ││
│  │ ██ ██ ██ ░░ ██ ░░ ░░               ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🎯 Strength Radar                   ││
│  │                                      ││
│  │     Creativity (72 ↑)               ││
│  │         ╱──╲                        ││
│  │ Persist╱    ╲Language               ││
│  │  (80) ╱  ⬡   ╲ (58)                ││
│  │       ╲      ╱                      ││
│  │ Collab ╲    ╱ Reasoning             ││
│  │  (30)   ╲──╱  (45 ↑)               ││
│  │     AI Knowledge (65 ↑)             ││
│  │                                      ││
│  │ 💪 Strongest: Persistence            ││
│  │ 🌱 Grow next: Collaboration          ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🐨 Koko's Weekly Report             ││
│  │                                      ││
│  │ "Great week for Aarav! He improved  ││
│  │  his Speaking band to Achiever and  ││
│  │  created 3 amazing space stories."  ││
│  │                                      ││
│  │ ⭐ Highlights:                      ││
│  │ • Speaking band: Explorer → Achiever││
│  │ • First music composition!          ││
│  │ • 5 AI concepts learned             ││
│  │                                      ││
│  │ 💡 Tips for parents:                ││
│  │ • Try the Thinking module next      ││
│  │ • Read aloud together 10 min/day   ││
│  │                                      ││
│  │ 🎯 Goals:                           ││
│  │ Achiever in all MindX [████░░] 25% ││
│  │ 20 AI concepts       [██████░] 60% ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🔍 Interest Signals                 ││
│  │                                      ││
│  │ 🚀 Space & Astronomy     ████████ 85%│
│  │ "8 space stories this month!"       ││
│  │ 💡 Try: ISRO Young Scientist Prog  ││
│  │                                      ││
│  │ 🎵 Music & Rhythm        █████░░ 60%│
│  │ "Chose music studio 40% of time"   ││
│  │                                      ││
│  │ 📊 Creation Mix:                    ││
│  │ Story ████████████ 12               ││
│  │ Music █████ 5                       ││
│  │ Quiz  ███ 3                         ││
│  │ Game  ██ 2                          ││
│  │ Comic █ 1                           ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 📚 Learning Progress                ││
│  │                                      ││
│  │ CBSE AI Concepts: 12/30 ████████░░ ││
│  │                                      ││
│  │ MindX Bands:                        ││
│  │ 🎤 Speaking  ⭐⭐⭐ Achiever        ││
│  │ 👂 Listening 🔍🔍 Explorer          ││
│  │ 🧠 Thinking  🌱 Starter             ││
│  │ 📖 Reading   — Not Started          ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Key UX Notes (GrowthMap)**:
- **Parent-facing**, not kid-facing — language is clear, professional, insightful (not playful)
- Period selector: Weekly (default) or Monthly, with date range display
- Activity heatmap uses green/gray blocks (GitHub contribution graph style)
- Strength Radar is a 6-axis spider/radar chart — ↑ arrows show improvement from last period
- Koko's Report uses warm, encouraging language — never negative about the child
- Interest Signals sorted by strength, each with actionable suggestion for parents
- Learning Progress ties to CBSE curriculum — parents see grade-level expectations
- Peer comparison is OPT-IN only, shows percentile (top 30%), never raw scores
- Mobile: panels stack vertically in a scrollable dashboard
- Weekly report auto-generated every Sunday by Cloud Function
- Phase 2+ (requires parent authentication with linked kid profiles)

---

## Navigation

### Phase 1 (Playground — No Auth)

Mobile: Bottom tab bar with 3 studio icons + "My Creations" (session-based)
Desktop: Top nav with studio links + logo

```
┌─────────────────────────────────────┐
│  🎨 GSI AI Studio                   │
├─────────────────────────────────────┤
│                                     │
│  What do you want to create today?  │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │  📖     │ │  🎵     │ │  🎮   │ │
│  │ Story   │ │ Music   │ │ Quiz  │ │
│  │ Studio  │ │  Lab    │ │ Maker │ │
│  └─────────┘ └─────────┘ └───────┘ │
│                                     │
│  Recent Creations                   │
│  ┌─────────┐ ┌─────────┐           │
│  │ thumb   │ │ thumb   │           │
│  │ title   │ │ title   │           │
│  └─────────┘ └─────────┘           │
└─────────────────────────────────────┘
│  📖 Story  │  🎵 Music  │  🎮 Quiz  │  ← bottom tabs (mobile)
```

### Phase 2 (Authenticated)
Add: Profile avatar (top right), Dashboard link, Portfolio link, Challenges tab

---

## Forms

### Input Fields
- Large touch targets (minimum 48px height)
- Placeholder text as examples, not labels (labels always visible above)
- Validation on blur, re-validate on change after first error
- Error messages in friendly, kid-appropriate language

```
✗ "Invalid input" 
✓ "Oops! Tell us a bit more about your story idea"

✗ "Field required"
✓ "What's your story about? Type a few words to get started!"
```

### Prompt Input (Creation Studios)
- Large, multiline textarea with character count
- Suggestion chips below for inspiration
- Voice input button (Web Speech API) for younger kids
- Auto-save drafts to localStorage

### Buttons
- **Primary**: Purple background, white text, rounded-full, minimum 48px height
- **Secondary**: White background, purple border
- **Create/Generate**: Extra large, animated gradient, prominent placement
- **Share**: Green with share icon
- **Loading**: Disable + animated sparkle indicator (not a boring spinner)

---

## Feedback

### Loading States (AI Generation)

AI generation takes 5-30 seconds. This is the critical UX moment — kids must stay engaged.

- **Animated progress**: Fun character animation (not a spinner)
- **Status messages**: Rotate through encouraging messages: "The AI is writing your story...", "Imagining the illustrations...", "Almost done — adding the finishing touches!"
- **Progress indicator**: Stepped progress (Thinking → Writing → Illustrating → Done)
- **Estimated time**: "Usually takes about 15 seconds"

### Toast Notifications
- Success: Green, auto-dismiss 3s, with confetti animation for first creation
- Error: Orange (not red — less scary for kids), persist until dismissed
- Info: Purple, auto-dismiss 5s
- Position: Bottom-center (mobile), bottom-right (desktop)

### Empty States
```
┌─────────────────────────────────┐
│                                 │
│     🚀 No creations yet!       │
│                                 │
│  Your AI masterpieces will      │
│  show up here.                  │
│                                 │
│  [ Create Your First Story! ]   │
│                                 │
└─────────────────────────────────┘
```

---

## Share Experience

### WhatsApp Share Card
When a creation is shared on WhatsApp, the link preview shows:
- Thumbnail of the creation
- Title: "Luna's Ocean Adventure"
- Description: "An AI story created on GSI AI Studio ✨"
- CTA: Tapping opens the creation viewer

### Creation Viewer (Public)
- Full-screen immersive view (no distracting nav)
- Storybooks: Page-flip animation, tap/swipe to navigate
- Music: Waveform visualizer + play controls
- Quizzes: Interactive playable quiz
- Games: Interactive choose-your-own-adventure player (scene navigation with choices)
- Comics: Panel-by-panel view with dialogue bubbles
- Actions bar: Share, Download/Export, Remix, AI X-Ray
- Footer: "Made with GSI AI Studio — Create your own! [Try Now]"

---

## Accessibility

- All interactive elements keyboard accessible
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon-only buttons
- Focus visible indicators (purple ring)
- Color contrast minimum 4.5:1
- Touch targets minimum 48x48px
- Reduced motion preference respected
- Alt text on all AI-generated images (auto-generated from prompt)
- Font size: minimum 16px body text (no zoom issues on mobile)

## Responsive Patterns

### Mobile (< 768px)
- Single column layout
- Bottom tab navigation
- Full-width creation cards
- Slide-up modals (not center modals)
- Swipe gestures for storybook pages

### Tablet (768px - 1024px)
- Two-column creation grid
- Side-by-side prompt input + preview (landscape)
- Larger touch targets maintained

### Desktop (> 1024px)
- Three-column creation grid
- Sidebar navigation
- Split-pane creation studio (prompt left, preview right)
- Keyboard shortcuts for power users

## Performance Targets

- **First Contentful Paint**: < 1.5s (critical for Indian mobile networks)
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3s
- **Total page weight**: < 500KB initial load
- **Image optimization**: WebP format, lazy loading, responsive sizes
- **Service Worker**: Cache static assets, offline landing page
