# GSI AI Studio — UX Patterns

## Design Philosophy

**"Create in 60 seconds"** — Every creation studio must get a kid from landing to first creation in under 60 seconds. Zero friction, zero confusion, instant gratification.

**Target Users**: Kids ages 8-17 on phones, tablets, and school computers. Design for mobile-first, touch-first, low-bandwidth India.

## Design System

> **Full specification**: See `docs/design-system.md` for complete visual tokens, component specs, and implementation details.

- **Colors**: Electric Indigo primary (`#5B5FFF`), Teal Mint secondary (`#20C997`), Warm Orange accent (`#FF9F43`), Soft Purple AI (`#8A5CFF`). Background `#F7F8FC`.
- **Typography**: Satoshi (headings/display), Figtree (body/UI), JetBrains Mono (XP/scores/stats). Large touch targets (44px min), generous line heights.
- **Spacing**: 8-point grid. Scale: 4/8/12/16/24/32/48/64.
- **Breakpoints**: sm(640), md(768), lg(1024), xl(1280). Design mobile-first.
- **Border Radius**: Cards 16–24px, buttons 16px, badges 8px. Soft, rounded feel everywhere.
- **Shadows**: Soft floating shadows — `shadow-card`, `shadow-elevated`, `shadow-button`. Never harsh or dark.
- **Gradients**: Primary (`#5B5FFF → #8A5CFF`), Gamification (`#20C997 → #5B5FFF`), Reward (`#FF9F43 → #FFD166`). Per-studio gradients defined in `globals.css`.

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

### Kid CEO — Business Simulation (Age 10+)

Long-running business simulation where kids run a virtual business across 30/60/90 days. Decisions shape skill patterns (Bold Moves, Money Smarts, Big Dreams, Getting It Done, Team Captain, Cool Under Pressure). 7-step flow: Landing → Pick Business → Register → Event Feed → Decision Feedback → Dashboard → CEO Profile. Dual-channel: web + `@GSIKidCeoAssistantBot` on Telegram.

```
┌─────────────────────────────────────────┐
│  Step 1: LANDING / START                 │
│  ┌──────────────────────────────────────┐│
│  │  🐨  "Ready to run your first       ││
│  │       business?"                     ││
│  │                                      ││
│  │  [Koko waving — happy expression]    ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  ▶️  Continue "Luna's Lemonade"     ││
│  │  📍 Getting Ready · 💰 ₹425 · 2/5   ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  [ 🚀 Start Your Business! ]         ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  💬 Connect to Telegram              ││
│  │  Play on @GSIKidCeoAssistantBot too →         ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
Kid lands on the Kid CEO home. If they have an active business, a "Continue" card shows phase + cash. Primary CTA starts a new sim. Telegram deep-link card is a secondary option.

```
┌─────────────────────────────────────────┐
│  Step 2: PICK YOUR BUSINESS              │
│  What do you want to run?                │
│                                          │
│  ┌──────────┐ ┌──────────┐              │
│  │ 🍋        │ │ 🍦        │              │
│  │ Lemonade  │ │ Ice Cream │              │
│  │ Stand     │ │ Shop      │              │
│  │ Start ₹500│ │ Start ₹800│              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 👕        │ │ 🎮        │              │
│  │ T-Shirt   │ │ Game      │              │
│  │ Shop      │ │ Studio    │              │
│  │ Start ₹700│ │ Start ₹600│              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 🎨        │ │ 📰        │              │
│  │ Craft     │ │ School    │              │
│  │ Shop      │ │ Blog      │              │
│  │ Start ₹400│ │ Start ₹300│              │
│  └──────────┘ └──────────┘              │
│  ┌──────────────────────────────────────┐│
│  │ 💡 My Own Idea                       ││
│  │ Tell us your business! [Type here..] ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
Grid of 7 business cards using per-business gradient backgrounds. Each shows emoji, name, and starting capital in rupees. "My Own Idea" opens a textarea for custom businesses.

```
┌─────────────────────────────────────────┐
│  Step 3: REGISTER BUSINESS               │
│  ← Back                                  │
│                                          │
│  Business name                           │
│  ┌──────────────────────────┐ ┌───────┐ │
│  │ Luna's Lemonade          │ │ ✨Gen │ │
│  └──────────────────────────┘ └───────┘ │
│                                          │
│  Location                                │
│  ┌──────────────────────────────────────┐│
│  │ Bangalore                         ▾  ││
│  └──────────────────────────────────────┘│
│  (Mumbai / Delhi / Chennai / My city)    │
│                                          │
│  Choose your pace:                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 30-day   │ │ 60-day   │ │ 90-day   │ │
│  │ Sprint   │ │ Journey  │ │ Marathon │ │
│  │ Fast     │ │ Balanced │ │ Deep     │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  [ 🎉 Register Business! ]           ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
Registration wizard step 2 — name (with AI-generate button), city dropdown, and 3-card pace picker. Clicking Register creates the business doc and takes the kid to the event feed.

```
┌─────────────────────────────────────────┐
│  Step 4: EVENT FEED (main play)          │
│  ┌──────────────────────────────────────┐│
│  │ 💰 ₹425 · ⭐ 62 · 😊 78             ││
│  │ 📍 Getting Ready (2/5) ████░░░░     ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🟢 NEW · Event 3                    ││
│  │ A Supplier Problem                  ││
│  │                                      ││
│  │ Your lemon supplier wants to raise   ││
│  │ prices by 20%. What do you do?       ││
│  │                                      ││
│  │  [ A — Accept the new price      ]   ││
│  │  [ B — Find a different supplier ]   ││
│  │  [ C — Negotiate a better deal   ]   ││
│  └──────────────────────────────────────┘│
│                                          │
│  🐨  "Think before you choose — there's │
│      no wrong answer!"                   │
│                                          │
│  ─── Past decisions ───                  │
│  ▸ Event 2 · You chose B · "Bold move!" │
│  ▸ Event 1 · You chose A · "Smart start"│
│                                          │
│  ⏳ Next event in 8h (30-day pace)       │
└─────────────────────────────────────────┘
```
Dashboard strip on top, active event card in the middle with 3 equal-weight choice buttons, Koko peeking with a nudge. Past events collapse below — tap any to re-read feedback. Ticker shows cadence for the chosen pace.

```
┌─────────────────────────────────────────┐
│  Step 5: DECISION FEEDBACK (overlay)     │
│  ┌──────────────────────────────────────┐│
│  │  You chose: B — Find a different     ││
│  │  supplier                            ││
│  │                                      ││
│  │     🔄 Scoring your decision...      ││
│  │     [Koko thinking — brief beat]     ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  🎯 That's a Bold Move!              ││
│  │                                      ││
│  │  You took a risk on change instead   ││
│  │  of playing safe. That's how founders││
│  │  find better deals — curiosity first.││
│  └──────────────────────────────────────┘│
│                                          │
│  Bold Moves     ████████░░ 72 (↑ +6)    │
│  Money Smarts   ██████░░░░ 54 (↑ +2)    │
│  Big Dreams     █████░░░░░ 48           │
│  Getting Done   ██████░░░░ 56           │
│  Team Captain   ████░░░░░░ 40           │
│  Cool Pressure  ███████░░░ 66 (↑ +4)    │
│                                          │
│  State: 💰 +₹50 · ⭐ -3                  │
│  ✅ BRAND figured out! (milestone)       │
│                                          │
│  ┌──────────┐ ┌────────────────────┐    │
│  │ Got it!  │ │ What next? →       │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```
Overlay after a choice: quick "scoring..." beat, then reveal of kid-friendly feedback text, updated skill bars with delta arrows, state changes, and any milestone unlock. Growth language throughout — never "wrong" or "failed".

```
┌─────────────────────────────────────────┐
│  Step 6: BUSINESS DASHBOARD              │
│  Luna's Lemonade · Bangalore             │
│                                          │
│  Phase progress:                         │
│  Ready → Open → Grow → Big → Running     │
│  ████████░░░░░░░░░░░░░░░░░░░░░░          │
│  ▲ You are here: Getting Ready (2/5)     │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ Stats                               ││
│  │ Cash:           ₹425                ││
│  │ Reputation:     62 / 100            ││
│  │ Morale:         78 / 100            ││
│  │ Employees:      1                   ││
│  │ Decisions:      12                  ││
│  │ Avg response:   4.2 min             ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  Your Skills                         ││
│  │                                      ││
│  │        Bold Moves (72)               ││
│  │          ╱──╲                        ││
│  │  Cool  ╱      ╲  Money               ││
│  │  (66) ╱   ⬡    ╲ Smarts (54)        ││
│  │       ╲        ╱                     ││
│  │  Team  ╲      ╱  Big                 ││
│  │  (40)   ╲──╱     Dreams (48)         ││
│  │      Getting It Done (56)            ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
Full dashboard: 5-phase horizontal progress bar with current phase highlighted, stat block, and 6-axis radar chart showing skill pattern. Reached via tab from the event feed.

```
┌─────────────────────────────────────────┐
│  Step 7: CEO PROFILE CARD                │
│  ┌──────────────────────────────────────┐│
│  │   🏆 Luna's Lemonade                ││
│  │   Phase reached: Going Big           ││
│  │   60-day Journey · Bangalore         ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  │        Bold Moves (78)               ││
│  │          ╱──╲                        ││
│  │  Cool  ╱      ╲  Money               ││
│  │  (64) ╱   ⬡    ╲ Smarts (72)        ││
│  │       ╲        ╱                     ││
│  │  Team  ╲      ╱  Big                 ││
│  │  (52)   ╲──╱     Dreams (80)         ││
│  │      Getting It Done (68)            ││
│  └──────────────────────────────────────┘│
│                                          │
│  You're a Big Dreamer with Money Smarts! │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 52 decisions · 4 phases · 3.8 min avg││
│  └──────────────────────────────────────┘│
│                                          │
│  Share:                                  │
│  ┌─────────┐ ┌────────┐ ┌─────────────┐ │
│  │ 💬 WA   │ │ 🔗 Copy│ │ ⬇️ Download │ │
│  └─────────┘ └────────┘ └─────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  [ 🚀 Run Another Business! ]        ││
│  └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```
Generated at simulation end: banner with business name + phase reached, full-size radar chart, dominant-pattern callout, compact stats, and share row (WhatsApp, copy link, PNG download). CTA to start the next business.

**Key UX Notes (Kid CEO)**:
- Top-level nav placement — Kid CEO lives as its own tab, not nested under Create, because the interaction model is an ongoing sim rather than a one-shot creation.
- Returning kids see a prominent "Continue [business name]" card on the landing screen instead of the business picker — resuming is always one tap.
- Business picker cards use per-business gradients defined in `globals.css` (same gradient system as the existing studios).
- Event cards support expanded (active) and collapsed (past) states — tap any past event to expand it and re-read the full feedback.
- No time pressure on decisions — response time is tracked for skill scoring but never shown as a countdown. Kids see "Think before you choose" messaging instead.
- The 3 choices are always visually equal — same size, same color, no hierarchy. Anti-gaming rule carried over from FoundersDNA so kids don't pattern-match to a "correct" answer.
- Decision feedback uses growth language only — never "wrong", "lost", or "failed". Framing: "There's no wrong answer — we're learning how you think."
- Milestone unlocks reuse the existing CelebrationModal with Koko celebrating + confetti burst (same component as badge unlocks).
- Phase transitions trigger a dedicated animation — the 5-phase bar fills to the new phase and the next phase label slides in.
- CEO profile card reuses the existing `/view/[id]` SSR pattern so WhatsApp link previews render proper OG tags + share card thumbnail.
- Koko expressions map to context: `thinking` during a pending decision, `celebrating` on milestones and phase transitions, `surprised` on crisis events, `happy` on growth events.
- Bot parity — the same kid can play on web OR `@GSIKidCeoAssistantBot`. Deep-link "Connect to Telegram" is shown on landing. Once linked, new events arrive via both channels (Telegram push + in-app event feed).
- Skills radar reuses the same component as Beat the AI / MindX — prefer `components/beat-the-ai/SkillRadarChart.tsx` (or a shared version) rather than building a new chart.
- Mobile: event feed uses vertical scroll with the active event sticky at the top. Choice buttons stack vertically on narrow screens (full-width, 48px min height each).
- Accessibility: each choice button has an ARIA label including its letter + choice text (e.g., "Choice B — Find a different supplier"). Radar chart provides a text summary fallback for screen readers.

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

**Header**: Sticky top bar with GSI AI Studio logo, MuteToggle (volume icon), and AiPointsBadge (shows current points + badge count).

**Bottom Navigation** (mobile): 3-tab fixed bar with modal sheet for studio selection.

```
┌─────────────────────────────────────┐
│  🎨 GSI AI Studio    🔇  ⭐ 150pts │  ← Header (sticky)
├─────────────────────────────────────┤
│                                     │
│  [Page Content]                     │
│                                     │
└─────────────────────────────────────┘
│  ➕ Create  │  🔍 Explore │  ✨ My Stuff │  ← BottomNav (fixed)
```

**Create+ Sheet**: Tapping "Create" opens a bottom modal with all 5 studios:
```
┌─────────────────────────────────────┐
│  Create Something Amazing!          │
│  ┌──────────┐ ┌──────────┐         │
│  │ 📖 Story │ │ 🎵 Music │         │
│  │  Studio  │ │   Lab    │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🎮 Quiz  │ │ 🕹️ Game  │         │
│  │  Maker   │ │  Studio  │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐                      │
│  │ 🎨 Comic │                      │
│  │  Studio  │                      │
│  └──────────┘                      │
└─────────────────────────────────────┘
```

**Explore** (`/explore`): Public creation feed with filter tabs and infinite scroll.
**My Stuff** (`/creations`): Session-based gallery of user's own creations.

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
- Games: Interactive choose-your-own-adventure player
- Footer: "Made with GSI AI Studio — Create your own! [Try Now]"

---

## Koko Mascot System

**Koko** is the AI mentor mascot — a Lottie-animated character that appears throughout the platform.

### Expressions (7)
`happy`, `thinking`, `celebrating`, `waving`, `surprised`, `painting`, `singing`

### Sizes
`sm` (64px), `md` (120px), `lg` (200px)

### Usage Contexts
- **Landing page**: Waving Koko with speech bubble ("What will you create today?")
- **Progress screens**: Context-appropriate expression per studio:
  - Story: painting, Music: singing, Quiz: thinking, Game: thinking, Comic: painting
- **Celebrations**: Celebrating expression with confetti
- **Empty states**: Waving Koko with encouragement

### Component
`components/mascot/Mascot.tsx` — On-demand Lottie loading from `public/lottie/koko-*.json`, module-level cache, Framer Motion bobbing animation.

`components/mascot/MascotSpeechBubble.tsx` — Mascot + speech bubble wrapper with configurable position.

---

## Celebrations & Feedback

### Confetti Celebration
`components/celebrations/ConfettiCelebration.tsx` — canvas-confetti wrapper with 3 modes:
- **burst**: Single center burst (first creation, badge unlock)
- **rain**: Falling confetti (milestone reached)
- **sides**: Dual side cannons (high achievement)

### Celebration Modal
`components/learning/CelebrationModal.tsx` — Full-screen overlay (Framer Motion) with two modes:
1. **Badge unlock**: Shows badge icon, name, description, Koko celebrating, auto-dismiss 3.5s
2. **Milestone celebration**: Shows milestone message (first creation, 50/100 points, 5/10 creations)

### Milestone Detection
Tracked in `AiPointsContext` — milestones stored in `localStorage['gsi-milestones-shown']` to prevent re-showing:
- First creation, 50 points, 100 points, 5 creations, 10 creations

### Sound Effects
`lib/sounds.ts` — 5 Web Audio API synthesized sounds (zero asset files):
- `pointsEarned`: ascending 2-note beep
- `badgeUnlocked`: 3-note arpeggio
- `creationComplete`: sine sweep
- `buttonTap`: single high tone
- `celebrate`: C major chord + ascending scale

Mute toggle: `components/layout/MuteToggle.tsx`, respects `localStorage['gsi-sound-muted']`.

---

## AI Points & Badge Gallery

### AiPointsBadge
Shown in header — displays current point total + badge count. Tap to open Badge Gallery.

### Badge Gallery
`components/learning/BadgeGallery.tsx` — Bottom sheet modal showing all 12 badges:
- Unlocked badges: full color with checkmark
- Locked badges: grayscale with progress hint ("Create 5 stories to unlock!")
- Badge catalog defined in `lib/badges.ts`

---

## Template Carousel & Daily Spark

### Template System
Each studio has a template carousel in the PromptForm step:
- Horizontal scrollable cards with emoji + title + short description
- Tapping a template pre-fills the prompt textarea
- Templates defined per-studio in studio components

### Daily Spark
Rotating suggestion chips below the prompt textarea — provides random inspiration ideas.

---

## Download & Export

After creation, the viewer includes a Download button:
- Stories: Downloads as image (html2canvas)
- Music: Downloads audio file
- Comics: Downloads panel images
- Tracks download count via `POST /api/creations/:id/download`

---

## Remix Flow

Remix button on shared/public creations:
- Loads the original creation's prompt into the appropriate studio
- Sets `remixedFromId` on the new creation
- Shows "Remixed from [original title]" attribution
- Increments remix count on the original creation

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
