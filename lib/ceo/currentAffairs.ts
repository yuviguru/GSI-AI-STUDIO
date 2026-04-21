/** Kid CEO current-affairs cache — gives milestone events a "real world is
 *  happening" feel without depending on live RSS/news APIs (which would need
 *  rate-limiting + content moderation + timezone handling).
 *
 *  Instead we run a once-per-day Netlify scheduled function that asks the LLM
 *  to brainstorm 10–15 kid-safe, India-relevant "business themes of the week":
 *    - cricket season heating up → lemonade sales
 *    - monsoon flooding the park → location rethink
 *    - Diwali shopping begins → craft-stand opportunity
 *    - new national school board rule → teacher-audience content angle
 *
 *  These are STORY HOOKS, not literal news — they're chosen to feel grounded
 *  in the world Indian kids actually navigate. The LLM generates them; they
 *  cache to `currentAffairsDaily/{YYYY-MM-DD}`; the milestone prompt pulls a
 *  subset so today's "TODAY'S BIG CHOICE" feels connected to what's happening
 *  around the kid right now.
 *
 *  Reader is safe on cache miss: falls back to a small evergreen pool so the
 *  milestone event still generates if the cron hasn't run yet. */

import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';

const COLLECTION = 'currentAffairsDaily';

// ─── Types ──────────────────────────────────────────────────────────────

/** One kid-safe, India-grounded theme the milestone prompt can weave in. */
export interface CurrentAffairTheme {
  /** Short 2-6 word label — for logging and a possible future "you were
   *  inspired by" blurb on the profile page. */
  label: string;
  /** 1-2 sentence story hook written for a 10-year-old. Tells the LLM what
   *  happened "out there" that might affect a kid's business. */
  hook: string;
  /** Which event categories this theme naturally pairs with (capital,
   *  growth, etc.) — lets the milestone prompt pick themes that fit the
   *  target milestone's feel. */
  categories: string[];
}

interface CurrentAffairsDoc {
  date: string; // YYYY-MM-DD UTC
  themes: CurrentAffairTheme[];
  generatedAt: Timestamp;
}

// ─── Public API ─────────────────────────────────────────────────────────

/** YYYY-MM-DD UTC bucket — same format as utcDayKey in ceoService. */
function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Pull today's themes, writing a fresh batch if the cache is empty or from
 *  an older UTC day. Safe to call from any server context (scheduled cron,
 *  on-demand from event generation, etc.) — writes are idempotent at the
 *  YYYY-MM-DD doc level so concurrent callers don't duplicate work. */
export async function getOrFreshenCurrentAffairs(): Promise<CurrentAffairTheme[]> {
  const today = utcDateKey();
  const ref = adminDb.collection(COLLECTION).doc(today);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() as CurrentAffairsDoc;
    if (Array.isArray(data.themes) && data.themes.length > 0) {
      return data.themes;
    }
  }

  // Generate fresh. On failure (no LLM, network blip, whatever) fall through
  // to the evergreen pool so callers always get SOMETHING to weave in.
  try {
    const themes = await generateFreshThemes();
    const doc: CurrentAffairsDoc = {
      date: today,
      themes,
      generatedAt: Timestamp.now(),
    };
    await ref.set(doc, { merge: true });
    return themes;
  } catch (err) {
    console.warn('[currentAffairs] LLM generation failed, using evergreen pool:', (err as Error).message);
    return EVERGREEN_THEMES;
  }
}

/** Read-only variant — returns today's cache if present, else the evergreen
 *  fallback pool. Never hits the LLM. Use this from hot paths (milestone
 *  event generation) so one slow LLM call doesn't cascade into slower
 *  event generation. The scheduled cron is the one that actually freshens
 *  the cache. */
export async function getCurrentAffairsReadOnly(): Promise<CurrentAffairTheme[]> {
  try {
    const today = utcDateKey();
    const snap = await adminDb.collection(COLLECTION).doc(today).get();
    if (snap.exists) {
      const data = snap.data() as CurrentAffairsDoc;
      if (Array.isArray(data.themes) && data.themes.length > 0) {
        return data.themes;
      }
    }
  } catch {
    // Firestore hiccup — fall through to evergreen.
  }
  return EVERGREEN_THEMES;
}

/** Pick `count` themes at random, optionally filtered to themes that list
 *  any of `preferCategories`. Used by the milestone prompt to sample a
 *  small, relevant subset — we don't want to dump the whole pool into the
 *  LLM context. */
export function pickThemes(
  all: CurrentAffairTheme[],
  opts: { count?: number; preferCategories?: string[] } = {},
): CurrentAffairTheme[] {
  const count = Math.max(1, Math.min(opts.count ?? 2, all.length));
  const prefer = new Set((opts.preferCategories ?? []).map((c) => c.toLowerCase()));

  const pool =
    prefer.size > 0
      ? all.filter((t) => t.categories.some((c) => prefer.has(c.toLowerCase())))
      : all;
  const effective = pool.length >= count ? pool : all;

  // Fisher-Yates-lite: shuffle a shallow copy, slice.
  const shuffled = [...effective];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

// ─── LLM generation ──────────────────────────────────────────────────────

const THEME_GENERATION_SYSTEM = `You generate kid-safe business "story hooks" for a simulation game for Indian kids age 10+.

Each hook is a short plausible thing happening "out there" in India right now that could affect a young founder's small business. It should feel timely and specific — like something a kid might actually hear their parents mention — without being literally-tied-to-real-news (no real brand names, no real people, no politics, no religion, no tragedy, no violence).

Good hook examples:
- "The monsoon hit Bangalore hard this week; a lot of weekend markets got rained out."
- "A new rule at most CBSE schools: kids have to bring steel bottles, no plastic."
- "Cricket season is starting — school teams forming, evening matches in parks."
- "A batch of cousins just discovered a cartoon series; everyone in class is drawing the characters."
- "Festival prep is starting — diyas, rangoli supplies, sweets — streets busier than usual."

NEVER:
- Name real brands, real people, or real news events
- Mention anything dark (crime, accidents, deaths, illness, politics, religion, protests)
- Mention money at scales beyond pocket change (no IPOs, no lakhs, no crores)
- Be preachy or suggest what the kid SHOULD do — hooks are neutral observations

Each hook carries 1–3 category tags from this list:
capital, growth, operations, people, risk, crisis

Respond ONLY with valid JSON in this exact shape:
{
  "themes": [
    {
      "label": "short 2-6 word label",
      "hook": "1-2 sentence plain-English observation, kid-safe",
      "categories": ["growth", "operations"]
    },
    ...
  ]
}

Return exactly 12 themes.`;

const THEME_GENERATION_USER = `Generate 12 fresh Indian-kid-relevant business story hooks for today. Mix moods: some are opportunities, some are mild complications, some are neutral shifts in the background. Cover different settings: school, neighbourhood, online, festivals, weather, seasons.`;

interface LlmThemeResponse {
  themes: CurrentAffairTheme[];
}

async function generateFreshThemes(): Promise<CurrentAffairTheme[]> {
  const opts = {
    systemPrompt: THEME_GENERATION_SYSTEM,
    userMessage: THEME_GENERATION_USER,
    temperature: 0.95,
    maxTokens: 1600,
  };

  let raw: LlmThemeResponse | null = null;
  try {
    raw = await generateJsonWithGroq<LlmThemeResponse>(opts);
  } catch (groqErr) {
    console.warn('[currentAffairs] Groq failed, trying Claude:', (groqErr as Error).message);
    raw = await generateJsonWithClaude<LlmThemeResponse>(opts);
  }

  if (!raw || !Array.isArray(raw.themes) || raw.themes.length === 0) {
    throw new Error('[currentAffairs] LLM returned no themes');
  }

  // Validate/normalize each theme so malformed entries don't crash the cache.
  const cleaned: CurrentAffairTheme[] = raw.themes
    .filter((t) => typeof t?.label === 'string' && typeof t?.hook === 'string')
    .map((t) => ({
      label: t.label.trim().slice(0, 80),
      hook: t.hook.trim().slice(0, 400),
      categories: Array.isArray(t.categories)
        ? t.categories.filter((c) => typeof c === 'string').slice(0, 3)
        : [],
    }));

  if (cleaned.length === 0) {
    throw new Error('[currentAffairs] all LLM themes malformed');
  }
  return cleaned;
}

// ─── Evergreen fallback pool ────────────────────────────────────────────

/** Hand-authored backup themes used when the daily cache is empty AND the
 *  LLM is unavailable. Kept small — the goal is just to keep milestone
 *  generation flowing, not to replace the freshness signal. */
const EVERGREEN_THEMES: CurrentAffairTheme[] = [
  {
    label: 'Exam week crunch',
    hook: 'Board exam pressure is high; most kids are spending less at school stalls after hours.',
    categories: ['growth', 'operations'],
  },
  {
    label: 'Summer holidays starting',
    hook: 'School\'s out in most states — cricket grounds and parks are busier, shopping malls quieter.',
    categories: ['growth', 'operations'],
  },
  {
    label: 'Monsoon begins',
    hook: 'Rain is picking up in most cities. Outdoor stalls are scrambling for tarps; indoor ones getting a boost.',
    categories: ['crisis', 'operations'],
  },
  {
    label: 'Festival season',
    hook: 'Festival prep is starting — families stocking up on sweets, decorations, new clothes.',
    categories: ['growth', 'capital'],
  },
  {
    label: 'New class, new crowd',
    hook: 'Fresh school year: new classmates, new interests. Old patterns that worked last term may not land now.',
    categories: ['growth', 'people'],
  },
  {
    label: 'Cricket season',
    hook: 'IPL-style tournaments everywhere at society level — kids queue for snacks and cold drinks near gully matches.',
    categories: ['growth'],
  },
  {
    label: 'Small-shop price hike',
    hook: 'Suppliers in the neighbourhood are quietly raising prices — sugar, milk, paper are all up 5-10%.',
    categories: ['capital', 'operations'],
  },
  {
    label: 'Phones taking over',
    hook: 'More kids watching reels on phones instead of playing outside — good for online stuff, tough for footfall.',
    categories: ['growth', 'risk'],
  },
];
