# GSI AI Studio — Design System Specification

> Canonical reference for all UI work. Every component, page, and visual element MUST follow this system.
> Updated: 2026-03-13

---

## 1. Design Philosophy

GSI AI Studio is a **gamified AI learning platform** for students aged 11–17.

The interface must feel:
- **Exploratory** — a world to discover, not a dashboard to navigate
- **Intelligent** — AI-powered, with smart suggestions and contextual help
- **Playful** — game-like, rewarding, and fun without being childish
- **Modern** — clean, current design language (not retro or overly cartoonish)
- **Rewarding** — every action gives feedback, progress is always visible

**Design inspirations**: Duolingo, Brilliant, Minecraft Education, space exploration interfaces, game dashboards.

**The interface MUST avoid**:
- Corporate/enterprise UI patterns
- Dense dashboards or data tables
- Complex multi-step forms
- Dark patterns or manipulative UI
- Overly childish or "baby" aesthetics

**Priority order**: Motivation > Discovery > Visual Clarity > Short Learning Cycles

---

## 2. Visual Language

The visual language combines:
- Soft gradients on cards and backgrounds
- Rounded geometry (no sharp corners)
- 3D playful illustrations (soft, pastel, low-poly style)
- Floating card UI with elevated shadows
- Gamified progress systems (XP bars, badges, streaks)

The UI should feel like **a world the student explores** — not a traditional web application.

---

## 3. Color System

The palette balances vibrancy and calmness — engaging without cognitive overload.

### Brand Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `primary` | Electric Indigo | `#5B5FFF` | Primary buttons, progress indicators, active states, navigation highlights |
| `secondary` | Teal Mint | `#20C997` | Success states, learning completion, positive reinforcement |
| `accent` | Warm Orange | `#FF9F43` | Rewards, achievement highlights, call-to-action emphasis |
| `ai` | Soft Purple | `#8A5CFF` | AI tools, intelligence features, smart suggestions |

### Neutral Palette

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `background` | Page BG | `#F7F8FC` | Page background |
| `surface` | Card BG | `#FFFFFF` | Card/panel backgrounds |
| `soft` | Section BG | `#EEF1FF` | Soft section backgrounds, hover states |
| `text-primary` | Dark Ink | `#1E1E2F` | Headings, primary text |
| `text-secondary` | Gray | `#6B7280` | Secondary text, labels |
| `text-muted` | Light Gray | `#9CA3AF` | Muted text, placeholders |
| `border` | Border | `#E5E7EB` | Borders, dividers |

### State Colors

| State | Color | Usage |
|-------|-------|-------|
| Success | `#20C997` | Completion, correct answers |
| Warning | `#FF9F43` | Caution, attention needed |
| Error | `#FF6B6B` | Errors (friendly red, not harsh) |
| Info | `#5B5FFF` | Information, tips |

---

## 4. Gradient System

Gradients create the playful atmosphere. Use sparingly — not on every element.

### Primary Gradient
```
#5B5FFF → #8A5CFF (135deg)
```
**Usage**: Hero sections, highlighted cards, active navigation, primary CTA backgrounds

### Gamification Gradient
```
#20C997 → #5B5FFF (135deg)
```
**Usage**: Mission cards, learning progress indicators, level-up screens

### Reward Gradient
```
#FF9F43 → #FFD166 (135deg)
```
**Usage**: Badges, rewards, unlock screens, achievement cards

### AI Gradient
```
#8A5CFF → #5B5FFF (135deg)
```
**Usage**: AI feature cards, AI X-Ray panels, smart suggestion backgrounds

### Studio-Specific Gradients

| Studio | From | To | Direction |
|--------|------|----|-----------|
| Story | `#8A5CFF` | `#5B5FFF` | 135deg |
| Music | `#FF9F43` | `#FF6B6B` | 135deg |
| Quiz | `#5B5FFF` | `#20C997` | 135deg |
| Game | `#20C997` | `#5B5FFF` | 135deg |
| Comic | `#FF9F43` | `#FFD166` | 135deg |

---

## 5. Typography

Typography is modern, readable, and slightly playful — avoiding overly common UI fonts.

### Font Families

| Role | Font | Weight Range | Usage |
|------|------|-------------|-------|
| **Display / Headings** | **Satoshi** | 500–900 | Page titles, section headings, hero text |
| **Body** | **Figtree** | 400–700 | Body text, descriptions, form labels, buttons |
| **Numeric / Code** | **JetBrains Mono** | 400–700 | XP points, statistics, leaderboard scores, level indicators, code snippets |

### Type Scale

| Token | Size | Line Height | Weight | Font | Usage |
|-------|------|-------------|--------|------|-------|
| `display-xl` | 48px (3rem) | 1.1 | 800 | Satoshi | Hero headlines |
| `display-lg` | 40px (2.5rem) | 1.15 | 700 | Satoshi | Page titles |
| `h1` | 32px (2rem) | 1.2 | 700 | Satoshi | Section headings |
| `h2` | 26px (1.625rem) | 1.25 | 600 | Satoshi | Subsection headings |
| `h3` | 22px (1.375rem) | 1.3 | 600 | Satoshi | Card titles |
| `h4` | 18px (1.125rem) | 1.4 | 600 | Satoshi | Small headings |
| `body-lg` | 16px (1rem) | 1.6 | 400 | Figtree | Large body text |
| `body` | 14px (0.875rem) | 1.6 | 400 | Figtree | Default body text |
| `caption` | 12px (0.75rem) | 1.5 | 400 | Figtree | Captions, labels |
| `numeric` | inherit | inherit | 500 | JetBrains Mono | XP, scores, stats |

---

## 6. Spacing System

All spacing follows an **8-point grid** system.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight internal spacing |
| `sm` | 8px | Small gaps, icon padding |
| `md` | 12px | Component internal padding |
| `lg` | 16px | Standard spacing |
| `xl` | 24px | Section spacing |
| `2xl` | 32px | Large section gaps |
| `3xl` | 48px | Page section separators |
| `4xl` | 64px | Hero / major section spacing |

---

## 7. Border Radius

The interface feels soft and approachable — no sharp corners.

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Small elements, badges, tags |
| `md` | 12px | Inputs, small cards |
| `lg` | 16px | Standard cards, buttons |
| `xl` | 24px | Large cards, modals |
| `2xl` | 32px | Hero cards, featured elements |
| `full` | 9999px | Avatars, circular elements |

**Default card radius**: `16px` or `24px`
**Default button radius**: `16px`

---

## 8. Shadow System

Soft, floating shadows — never harsh or dark.

| Token | Value | Usage |
|-------|-------|-------|
| `card` | `0 10px 25px rgba(0,0,0,0.08)` | Default card elevation |
| `card-hover` | `0 15px 35px rgba(0,0,0,0.12)` | Card hover state |
| `elevated` | `0 20px 40px rgba(0,0,0,0.12)` | Modals, overlays, dropdowns |
| `button` | `0 6px 14px rgba(0,0,0,0.10)` | Primary buttons |
| `button-hover` | `0 8px 20px rgba(0,0,0,0.15)` | Button hover state |
| `soft` | `0 4px 12px rgba(0,0,0,0.05)` | Subtle elevation (tags, badges) |
| `inner` | `inset 0 2px 4px rgba(0,0,0,0.05)` | Inset inputs, wells |

---

## 9. Layout Grid

| Breakpoint | Columns | Max Width | Gutter |
|------------|---------|-----------|--------|
| Mobile (<640px) | 4 | 100% | 16px |
| Tablet (640–1024px) | 8 | 100% | 24px |
| Desktop (>1024px) | 12 | 1280px | 24px |

**Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

---

## 10. Button System

### Primary Button
```
Background: #5B5FFF
Text: white
Radius: 16px
Padding: 12px 20px
Shadow: 0 6px 14px rgba(91,95,255,0.3)
Hover: brightness 110%, shadow grows
Font: Figtree 600
```

### Secondary Button
```
Background: white
Border: 2px solid #5B5FFF
Text: #5B5FFF
Radius: 16px
Padding: 12px 20px
Hover: bg #EEF1FF
```

### Ghost Button
```
Background: transparent
Text: #5B5FFF
Radius: 16px
Padding: 12px 20px
Hover: bg #EEF1FF
```

### Reward Button
```
Background: gradient #FF9F43 → #FFD166
Text: white
Radius: 16px
Shadow: 0 6px 14px rgba(255,159,67,0.3)
```

### Button Sizes

| Size | Padding | Font Size | Min Height |
|------|---------|-----------|------------|
| `sm` | 8px 16px | 14px | 36px |
| `md` | 12px 20px | 14px | 44px |
| `lg` | 14px 28px | 16px | 52px |

> All buttons must meet **44px minimum touch target** on mobile.

---

## 11. Card System

Cards are the primary UI element. Every card follows this pattern:

### Card Anatomy
```
┌─────────────────────────┐
│  [Icon/Illustration]    │
│                         │
│  Title (Satoshi 600)    │
│  Description (Figtree)  │
│                         │
│  [Progress Bar]         │
│  [Action Button]        │
└─────────────────────────┘
```

### Card Variants

| Variant | Background | Border | Shadow | Radius |
|---------|------------|--------|--------|--------|
| Default | `#FFFFFF` | `1px solid #E5E7EB` | `card` | 16px |
| Highlighted | Gradient | none | `card` | 24px |
| Mission | `#FFFFFF` | `2px solid #5B5FFF` | `card` | 16px |
| Achievement | `#FFFFFF` | `2px solid #FFD166` | `card` | 16px |
| Studio | Gradient (per studio) | none | `card` | 24px |

### Card Hover
```
transform: translateY(-4px)
shadow: card-hover
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 12. Navigation

### Mobile (Bottom Tab Bar)
```
Fixed bottom | bg white/80 + backdrop-blur | safe-area-bottom
Tabs: Create+ | Beat AI | Explore | My Stuff
Active: #5B5FFF with animated indicator
Icon: 24px, label: 12px
Min touch target: 48x48px
```

### Desktop (Sidebar + Top Bar)
```
Sidebar: 240px width, sticky left
Top bar: sticky top, frosted glass (bg-white/80 backdrop-blur-md)
```

---

## 13. Gamification Elements

### XP Progress Bar
```
Height: 8px (compact) or 12px (standard)
Background: #EEF1FF
Fill: gradient #5B5FFF → #8A5CFF
Radius: full
Animation: width transition 500ms ease-out
```

### Level Badge
```
Radius: full
Background: gradient per level tier
Text: JetBrains Mono 600
Example: "Level 5 — AI Explorer"
```

### Achievement Card
```
Icon: 48px illustration
Title: Satoshi 600
XP reward: JetBrains Mono, #FF9F43
Unlocked: golden glow shadow
Locked: grayscale + opacity 50%
```

### Streak Indicator
```
Flame emoji + count
Text: JetBrains Mono 600
Background: gradient #FF9F43 → #FFD166
Radius: full pill
```

---

## 14. Illustration Style

All illustrations follow a **soft 3D** style:
- Rounded shapes (no sharp edges)
- Soft drop shadows
- Vibrant pastel colors from the brand palette
- Low-poly / clay style
- Objects: planets, rockets, AI robots, islands, floating elements
- Characters: friendly, diverse, age-appropriate

---

## 15. Motion & Animation

### Timing
| Type | Duration | Easing |
|------|----------|--------|
| Micro | 150ms | ease-out |
| Standard | 250ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Complex | 350ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Entrance | 400ms | cubic-bezier(0, 0, 0.2, 1) |

### Common Animations
- **Fade up**: Entrance for cards and sections (translateY 20px → 0, opacity 0 → 1)
- **Scale pop**: Button press feedback (scale 0.95 → 1)
- **Progress fill**: XP bar fill (width 0 → target, 500ms)
- **Level up**: Celebration (scale + rotate + confetti)
- **Card hover**: Lift (translateY -4px, 300ms)
- **Float**: Decorative elements (translateY -10px oscillation, 3s infinite)
- **Sparkle**: Achievement unlock (opacity pulse + scale, 1.5s)

### Motion Library
Use **Framer Motion** for all animations. Do NOT use CSS keyframe animations for interactive elements.

---

## 16. Accessibility

WCAG AA compliance is **mandatory**.

| Requirement | Standard |
|-------------|----------|
| Text contrast | 4.5:1 minimum (body), 3:1 (large text) |
| Touch targets | 44px minimum (48px preferred) |
| Focus indicators | 2px solid ring, visible on all interactive elements |
| Reduced motion | Respect `prefers-reduced-motion`, disable decorative animations |
| Alt text | All illustrations and icons must have descriptive alt text |
| Keyboard nav | All interactive elements reachable via Tab/Enter/Space |
| Screen reader | Semantic HTML, ARIA labels where needed |

---

## 17. Tone of Voice

Language in the interface should be **encouraging, clear, and playful**.

| Instead of... | Use... |
|---------------|--------|
| Lesson Completed | Mission Complete! |
| Start Course | Begin Your Adventure |
| Error | Oops! Something went wrong |
| Loading... | Getting things ready... |
| Submit | Let's Go! |
| Settings | My Stuff |
| Quiz | Brain Battle |
| Tutorial | Quick Guide |

---

## 18. Responsive Breakpoints

| Name | Min Width | Target |
|------|-----------|--------|
| `xs` | 0 | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |

**Mobile-first**: All styles start from mobile, use `sm:`, `md:`, `lg:` for larger screens.

---

## 19. Tailwind Token Mapping

These are the Tailwind config values that implement this design system:

```
Colors:
  brand.primary     → #5B5FFF (Electric Indigo)
  brand.secondary   → #20C997 (Teal Mint)
  brand.accent      → #FF9F43 (Warm Orange)
  brand.ai          → #8A5CFF (Soft Purple)
  brand.background  → #F7F8FC
  brand.surface     → #FFFFFF
  brand.soft        → #EEF1FF
  brand.text        → #1E1E2F
  brand.text-secondary → #6B7280
  brand.text-muted  → #9CA3AF
  brand.error       → #FF6B6B

Fonts:
  font-display → Satoshi (headings)
  font-body    → Figtree (body)
  font-mono    → JetBrains Mono (numbers/code)

Border Radius:
  rounded-sm  → 8px
  rounded-md  → 12px
  rounded-lg  → 16px
  rounded-xl  → 24px
  rounded-2xl → 32px

Shadows:
  shadow-card     → 0 10px 25px rgba(0,0,0,0.08)
  shadow-elevated → 0 20px 40px rgba(0,0,0,0.12)
  shadow-button   → 0 6px 14px rgba(0,0,0,0.10)
  shadow-soft     → 0 4px 12px rgba(0,0,0,0.05)
```

---

## 20. File Reference

When implementing UI, always check:
- `tailwind.config.ts` — Token definitions
- `app/globals.css` — CSS variables and global styles
- `app/layout.tsx` — Font loading
- `docs/ux-patterns.md` — Component behavior patterns
- `docs/tech-standards.md` — Coding conventions
- This file — Visual specifications
