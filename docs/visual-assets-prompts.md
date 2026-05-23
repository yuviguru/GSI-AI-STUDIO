# Visual Asset Prompts — Studio / Feature Cards (v2 · purpose-driven)

Goal: one clean **single 3D object** per card — like premium product/brand icons, not busy
illustrations. Reference look: the "Built for the Hustle" board (megaphone, cup, headphones,
backpack) — each a single glossy-soft object floating on an almost-white background, lots of
calm empty space, minimal, modern, cohesive.

**Philosophy of these prompts:** we lock the *visual system* (so all 11 look like one family
and match the reference) but we **do NOT dictate the object**. Each prompt explains what the
studio is *for* and what a kid *becomes* through it, then asks the engine to invent the single
object that best represents that future. Try the same brief in **ChatGPT and Gemini**, keep the
strongest result per card.

---

## THE STYLE (constant — paste this before every brief, never change it)

> A single object, soft photoreal 3D render. Smooth matte material with a gentle soft-gloss
> finish (premium "soft plastic / soft clay" feel), rounded friendly forms, subtle realistic
> studio lighting from the upper-left, one soft contact shadow beneath. Calm, minimal,
> premium, modern — like a high-end brand's 3D product icon. Background: a single plain,
> almost‑white warm neutral (very light grey, ~#F4F4F5), no scene, no extra props, no
> surface detail — just generous empty space around the object. Exactly **one** object,
> centered, not touching the edges. **No text, no letters, no numbers, no logos, no UI.**
> Square 1:1, ~1024px. Every asset in this set must share the **identical** material,
> lighting direction, scale and background so all of them look like one family.

Consistency tip: generate 2–3 first, lock that exact material/lighting/background, then for
the rest add "match the material, lighting, background and scale of the set exactly." Reuse a
seed if the tool allows.

---

## THE 11 BRIEFS (style above + the purpose below — let the engine choose the object)

Each brief = **purpose, not instructions.** Read it as: "here's what this means; you decide
the one object that captures it."

**1 · Book Studio** — `book` *(Create · NEW)*
> This is where a child stops being only a reader and becomes an **author**. They write and
> publish their own real book; the AI only fixes grammar — never the ideas, never the story.
> It stands for ownership, patience, and imagination made permanent: "I made something real."
> Audience: kids 8–17. Feeling: proud, grown-up, lasting. Design the single object that best
> represents a young author and the future they're stepping into — you choose what that is.

**2 · Story Studio** — `story` *(Create)*
> Quick magical storytelling. A child sparks a world, characters and adventures in minutes.
> It stands for imagination set free, play, and "what if". Lighter and faster than Book
> Studio — wonder over permanence. Feeling: playful, dreamy, limitless. Pick the one object
> that captures a child's imagination becoming a story.

**3 · Music Lab** — `music` *(Create)*
> Turning feelings into sound. A child composes their own music and rhythm with AI help.
> It stands for self-expression, mood, and finding your own voice without needing to read
> notation. Feeling: expressive, rhythmic, joyful. Choose the single object that represents a
> young music-maker.

**4 · Game Studio** — `game` *(Create)*
> The flip from *playing* games to *building* them. A child designs a playable game world —
> logic plus creativity. It stands for systems thinking, agency, and "I can make the things I
> love." Feeling: inventive, clever, fun. Decide the one object that represents a kid who
> builds their own game.

**5 · Comic Studio** — `comic` *(Create)*
> Visual storytelling — art and narrative together. A child creates comics: heroes, panels,
> drama. It stands for combining drawing and story, identity, and bold expression. Feeling:
> punchy, characterful, creative. Pick the single object that represents a young comic creator.

**6 · Quiz Maker** — `quiz` *(Create)*
> Learning by *teaching*. A child makes quizzes to challenge friends and family — they have to
> understand a topic well enough to question others on it. It stands for mastery, curiosity,
> and sharing knowledge. Feeling: clever, social, confident. Choose the one object that
> represents a kid who turns knowledge into a challenge for others.

**7 · Beat the AI** — `beat-ai` *(Play · LIVE)*
> A friendly creative duel: the child vs the AI. The point is confidence — kids discover their
> imagination can match or beat the machine. It stands for courage, playfulness, and human
> creativity holding its own. Not violent — spirited and kind. Feeling: bold, fun, "bring it
> on." Design the single object that represents a child confidently taking on the AI.

**8 · MindX Arena** — `mindx` *(Play)*
> Skill challenges that sharpen the mind and level the child up. It stands for growth, focus,
> and proving and improving your abilities. Feeling: sharp, energetic, rewarding. Pick the one
> object that represents a mind getting stronger and reaching the next level.

**9 · Kid CEO** — `ceo` *(Play)*
> A child runs their own simulated company — decisions, leadership, building something that
> grows. It stands for ambition, ownership, and seeing your choices create outcomes. Feeling:
> aspirational, confident, future-leader. Choose the single object that represents a young
> founder building their future.

**10 · AI Lab** — `ai-lab` *(Learn)*
> Where the magic gets demystified — the child learns how the AI behind every studio actually
> works, in plain, hands-on terms. It stands for curiosity, understanding, and "now I see how
> it works." Feeling: smart, curious, illuminating. Decide the one object that represents a
> kid who understands the AI, not just uses it.

**11 · Explore** — `explore` *(Learn)*
> Discovery and belonging — the child sees what other kids across the community have created
> and gets inspired to make their own. It stands for wonder, community, and "look what's
> possible." Feeling: open, inspiring, connected. Pick the single object that represents a
> child discovering a whole world of creations.

---

## Deliverable spec (so wiring stays clean)

- Any format/size is fine. Files are served from
  **`public/images/modes/<key>.<ext>`** where `<key>` is exactly one of:
  `book`, `story`, `music`, `game`, `comic`, `quiz`, `beat-ai`, `mindx`, `ceo`, `ai-lab`, `explore`.
  Extension follows what you upload (we currently serve `.png` for the wired-in set).
- Drop new raws anywhere and tell me — I rename + relocate. If a file is large (>~400 KB) I'll
  also resize ≤768px → compressed WebP and archive the raw under `design-assets/mode-card-originals/`.

### Current state (as of this batch)

| Status | Modes |
|---|---|
| ✅ Wired with illustration | `book`, `story`, `music`, `game`, `comic`, `quiz`, `beat-ai`, `ceo` |
| ⏳ Pending (icon fallback in use) | `mindx`, `ai-lab`, `explore` |

`ModeTile` auto-falls back to the lucide-icon treatment for any mode without an image, so
partial delivery never breaks the grid.
