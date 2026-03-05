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

All three studios (Story, Music, Quiz) follow the same 3-step pattern:

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
- Games: Interactive choose-your-own-adventure player
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
