# Mascot hero art

Drop generated PNG/WEBP files here to populate the mascot picker carousel
(see `components/onboarding/MascotPickerStep.tsx`). Until each file lands,
the card renders the emoji fallback from `mascot.art`.

## File naming

| Mascot id | File path |
|---|---|
| pixie | `/mascots/pixie.png` |
| koko | `/mascots/koko.png` |
| aria | `/mascots/aria.png` |
| bolt | `/mascots/bolt.png` |
| luma | `/mascots/luma.png` |
| pebble | `/mascots/pebble.png` |
| rio | `/mascots/rio.png` |
| nova | `/mascots/nova.png` |

Identical filename, lowercase, matches the `id` in `lib/mascots/roster.ts`.
WEBP works too — update `heroImage` in the roster file to point at
`/mascots/<id>.webp` if you go that route.

## Format specs

- **Dimensions**: 1024 × 1280 (4:5) — the carousel card renders at 200×333,
  Next.js downscales to crisp at 2x DPR.
- **Background**: transparent.
- **Composition**: full-body character, centered horizontally, the character
  filling roughly the bottom 80% of the canvas (so the head sits high
  enough that the SOON badge / footer gradient don't crop the face).
- **Lighting**: soft front light, slight rim highlight on the side facing
  the viewer. Cards sit on a colored gradient so the character needs to
  read against any saturated background.

## ChatGPT / DALL·E 3 prompt template

Paste this into ChatGPT and swap the bracketed bits per mascot. Generates
images you can drop straight into this folder.

```
Generate a vertical 4:5 portrait of a friendly, kid-safe mascot character
for an AI learning app aimed at Indian children ages 8–17. Style:
soft 3D rendered, clay-ish material, vibrant pastel-to-saturated colour
palette, full character visible from head to feet, slight three-quarter
pose, looking toward the viewer with a warm smile. Transparent background.
No text. No floor shadow. Output: 1024 × 1280.

Character: [mascot name and short description from the table below].
```

| Mascot | Character brief |
|---|---|
| **Pixie — the helper bot** | A small white-and-cyan robot helper with two big round eyes, antennae, friendly stance, curious posture. The kind of bot a kid would want as a study buddy. |
| **Koko — the cosmic fox** | An orange fox with a swirling galaxy-pattern tail. Mischievous grin, ears alert. Wearing a tiny star-pattern scarf. |
| **Aria — the starlit owl** | A purple-feathered owl with luminous violet eyes. Wise but warm. Tiny stars scattered around the wing feathers. |
| **Bolt — the lightning dragon** | A small red-and-gold dragon, cartoony not scary, with little lightning-shaped wing tips. Confident heroic pose. |
| **Luma — the space explorer** | A friendly green alien kid in a bubble helmet. Big eyes, two-finger wave, holding a small magnifying glass. |
| **Pebble — the crystal turtle** | A calm teal turtle whose shell is made of soft glowing crystals. Slow contented smile, sitting comfortably. |
| **Rio — the music panda** | A panda with magenta highlights wearing headphones around the neck. Dancing pose, drumsticks in one paw. |
| **Nova — the astronaut kid** | A young kid astronaut in a blue spacesuit (helmet visor up so the face shows). Brave grin, one hand on hip. |

## When you drop a new file in

1. Save the file to `apps/kid/public/mascots/<id>.png`.
2. Reload `/` → onboarding → step 1 of 4. The new art replaces the emoji
   automatically (the picker reads `mascot.heroImage` and falls back on
   any image load failure).
3. No code change needed unless you switch format (`.webp` etc.) — in
   that case update `heroImage` for that mascot in
   `lib/mascots/roster.ts`.
