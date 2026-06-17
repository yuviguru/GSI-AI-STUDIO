/**
 * Emotion direction for book illustrations (BOOK-012).
 *
 * The #1 reason AI book art feels "off" is wrong facial emotion: a fierce
 * villain comes out smiling because the prompt only described what the
 * character was DOING, never the expression on their face — and image models
 * default kid-book characters to cheerful smiles. This module is the single
 * source of truth for turning an emotion into EXPLICIT facial/body direction
 * (with active counter-bias against the default smile) and for tuning the
 * quality suffix so a tense/dark scene isn't forced "vibrant + cheerful".
 *
 * Pure + dependency-free so it's shared by the LLM prompt builders (book
 * generation), the scene-image route (kid redraws), and the editor UI (the
 * emotion chips).
 */

export type EmotionMoodTone = 'bright' | 'neutral' | 'dark';

export interface EmotionPreset {
  key: string;
  /** Kid-facing chip. */
  emoji: string;
  label: string;
  /** Explicit facial + body direction injected verbatim into the image prompt. */
  face: string;
  /** Drives the mood-aware quality suffix. */
  moodTone: EmotionMoodTone;
}

/** The emotion vocabulary shown to kids AND emitted by the book-draft LLM.
 *  Keep this list small and unambiguous — it's a kid-facing chip row. */
export const EMOTION_PRESETS: readonly EmotionPreset[] = [
  { key: 'happy', emoji: '😊', label: 'Happy', face: 'a warm, genuine smile with bright eyes', moodTone: 'bright' },
  { key: 'excited', emoji: '🤩', label: 'Excited', face: 'a thrilled wide-eyed grin, eyebrows raised, full of energy', moodTone: 'bright' },
  { key: 'curious', emoji: '🤔', label: 'Curious', face: 'a thoughtful, inquisitive look, head tilted slightly', moodTone: 'neutral' },
  { key: 'surprised', emoji: '😲', label: 'Surprised', face: 'eyebrows raised high, wide eyes and mouth agape in surprise', moodTone: 'neutral' },
  { key: 'brave', emoji: '💪', label: 'Brave', face: 'a determined, confident expression, jaw set, standing tall and fearless', moodTone: 'neutral' },
  { key: 'sad', emoji: '😢', label: 'Sad', face: 'a downturned mouth, glistening teary eyes and drooping, dejected posture', moodTone: 'dark' },
  { key: 'scared', emoji: '😱', label: 'Scared', face: 'wide fearful eyes, mouth open, shoulders tense and recoiling in fear', moodTone: 'dark' },
  { key: 'angry', emoji: '😠', label: 'Angry', face: 'a fierce, furious scowl with narrowed eyes and a clenched jaw — serious and threatening, definitely NOT smiling', moodTone: 'dark' },
] as const;

const BY_KEY = new Map(EMOTION_PRESETS.map((p) => [p.key, p]));

/** Comma-joined key list for embedding in LLM instructions. */
export const EMOTION_KEY_LIST = EMOTION_PRESETS.map((p) => p.key).join(', ');

export function getEmotionPreset(key: string | null | undefined): EmotionPreset | null {
  if (!key) return null;
  return BY_KEY.get(key.trim().toLowerCase()) ?? null;
}

/**
 * Explicit facial/body direction for one character. Returns '' when there's no
 * emotion. Unknown free-text emotions are echoed (so an LLM word like
 * "anticipation" still reaches the model) but without the engineered
 * counter-bias a preset carries.
 */
export function renderEmotionDirection(
  characterName: string,
  emotion: string | null | undefined,
): string {
  const raw = (emotion ?? '').trim();
  if (!raw) return '';
  const preset = getEmotionPreset(raw);
  const name = characterName.trim() || 'the character';
  return `${name}'s facial expression: ${preset ? preset.face : raw}`;
}

/**
 * Worst-case mood across a scene's emotions. Any dark emotion makes the whole
 * scene dark (a single furious villain should darken the lighting); otherwise
 * bright if anything is bright, else neutral.
 */
export function sceneMoodFromEmotions(
  emotions: Array<string | null | undefined>,
): EmotionMoodTone {
  let hasBright = false;
  for (const e of emotions) {
    const preset = getEmotionPreset(e);
    if (!preset) continue;
    if (preset.moodTone === 'dark') return 'dark';
    if (preset.moodTone === 'bright') hasBright = true;
  }
  return hasBright ? 'bright' : 'neutral';
}

/** Quality words shared by all moods — no colour or cheer bias. */
const QUALITY_BASE =
  "professional children's book illustration, award-winning storybook art, highly detailed, cinematic composition, beautiful lighting, premium publishing quality, full-page illustration, masterpiece";

/**
 * Mood-aware quality suffix. The old fixed suffix always pushed "vibrant
 * colors, expressive characters" — which actively fights a dark/tense scene
 * (a vengeful witch rendered in cheerful candy colours). Dark scenes get
 * dramatic/moody language instead; bright scenes keep the vibrant push.
 */
export function moodAwareQualitySuffix(mood: EmotionMoodTone): string {
  switch (mood) {
    case 'dark':
      return `${QUALITY_BASE}, dramatic moody lighting, deep rich shadows, tense atmosphere, emotionally expressive faces`;
    case 'bright':
      return `${QUALITY_BASE}, vibrant colors, warm cheerful lighting, expressive characters`;
    default:
      return `${QUALITY_BASE}, expressive characters, balanced natural colors`;
  }
}

/**
 * Cheap, dependency-free guess at the dominant emotion of a page from its
 * text. Used as the INSTANT default for the editor's emotion chips (and as a
 * fallback when the LLM suggestion is slow/unavailable). Order matters —
 * stronger/darker emotions win over generic positive ones so a revenge scene
 * isn't tagged "happy" because it contains the word "smiled".
 */
const EMOTION_KEYWORDS: ReadonlyArray<{ key: string; words: RegExp }> = [
  { key: 'angry', words: /\b(angr|anger|furious|fury|rage|raging|revenge|reveng|vengean|vengef|scowl|snarl|growl|seethe|wrath|hate|hatred)\w*/i },
  { key: 'scared', words: /\b(scared|afraid|fear|terrif|frighten|trembl|shiver|panic|horror|dread|petrified)\w*/i },
  { key: 'sad', words: /\b(sad|cried|crying|cries|tears|teary|sob|wept|weep|sorrow|lonely|grief|heartbroken|miserable)\w*/i },
  { key: 'surprised', words: /\b(surprised|suddenly|gasp|shocked|astonish|stunned|unexpected|out of nowhere)\w*/i },
  { key: 'excited', words: /\b(excited|exciting|thrilled|amazing|hooray|cheered|cheering|leapt|leaped|can'?t wait|couldn'?t wait)\w*/i },
  { key: 'brave', words: /\b(brave|bravely|courage|bold|boldly|determined|stood tall|faced|dared|fearless|fought)\w*/i },
  { key: 'curious', words: /\b(wonder|curious|mysterious|strange|secret|explore|searched|searching|peered|investigat)\w*/i },
  { key: 'happy', words: /\b(happy|happily|smiled|smiling|laughed|laughing|joy|joyful|delight|grinned|glad|cheerful)\w*/i },
];

export function emotionFromTextHeuristic(text: string | null | undefined): string {
  const t = (text ?? '').trim();
  if (!t) return 'curious';
  for (const { key, words } of EMOTION_KEYWORDS) {
    if (words.test(t)) return key;
  }
  return 'curious';
}
