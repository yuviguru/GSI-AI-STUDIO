import type { BeatTheAiCategory, BeatTheAiPrompt } from '@/types/beatTheAi.types';

// ─── Prompt Bank ────────────────────────────────────────────

const STORY_SPRINT_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a short story about an auto-rickshaw that can fly', theme: 'Transportation', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a cricket ball that grants wishes', theme: 'Sports & Magic', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about finding a treasure map inside a samosa', theme: 'Food & Adventure', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a monsoon rain that turns everything colorful', theme: 'Nature', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a school where the homework does itself', theme: 'School', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a Diwali firecracker that opens a portal', theme: 'Festival', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a robot that learns to dance Bharatanatyam', theme: 'Dance & Technology', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a chai stall on the moon', theme: 'Space', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a lost puppy in a Rajasthani palace', theme: 'Animals', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a kid who can talk to trees', theme: 'Nature', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a magic school tiffin box', theme: 'School', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a time machine hidden in a library', theme: 'Time Travel', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a Holi celebration where colors come alive', theme: 'Festival', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a gully cricket match with unexpected twist', theme: 'Sports', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a talking parrot who solves mysteries', theme: 'Mystery', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about ISRO launching a rocket to a candy planet', theme: 'Space', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a grandmother with a secret superpower', theme: 'Family', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a train journey where something magical happens', theme: 'Travel', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a mango tree that grows gadgets', theme: 'Nature & Tech', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a friendship between a kid and a cloud', theme: 'Friendship', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a rangoli pattern that comes alive', theme: 'Art', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
];

const QUIZ_WHIZ_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Create 3 quiz questions about Indian space missions and ISRO', theme: 'Space & ISRO', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about amazing facts of the human body', theme: 'Biology', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian wildlife and national parks', theme: 'Wildlife', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about the solar system', theme: 'Astronomy', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian freedom fighters', theme: 'History', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about oceans and marine life', theme: 'Ocean', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian inventions and scientists', theme: 'Science', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about how everyday technology works', theme: 'Technology', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian festivals and traditions', theme: 'Culture', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about weather and climate', theme: 'Geography', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about cricket rules and records', theme: 'Cricket', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about dinosaurs and fossils', theme: 'Paleontology', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian states and their capitals', theme: 'Geography', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about how AI and robots work', theme: 'AI & Robotics', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian classical music and instruments', theme: 'Music', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about volcanoes and earthquakes', theme: 'Geology', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about Indian food and spices', theme: 'Food', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about famous world landmarks', theme: 'World', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
  { text: 'Create 3 quiz questions about the Indian constitution and democracy', theme: 'Civics', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: true },
  { text: 'Create 3 quiz questions about insects and their superpowers', theme: 'Entomology', timeLimit: 240, category: 'quiz_whiz', isIndiaThemed: false },
];

const CAPTION_BATTLE_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a witty caption for: A cat sitting on a laptop during an important Zoom meeting', theme: 'Pets & Work', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: An auto-rickshaw overtaking a sports car', theme: 'Traffic', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A kid explaining AI to their grandparent', theme: 'Technology', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A crow stealing a samosa from a street vendor', theme: 'Street Life', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A robot trying to eat ice cream', theme: 'Robots', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: Two friends fighting over the last piece of pizza', theme: 'Friendship', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A cow casually walking through a shopping mall', theme: 'India Life', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A teacher catching a student sleeping in class', theme: 'School', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A monkey stealing sunglasses at a tourist spot', theme: 'Animals', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A kid who just failed a test but is smiling', theme: 'School', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A Mumbai local train during rush hour', theme: 'Travel', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A dog wearing sunglasses at the beach', theme: 'Pets', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A cricketer hitting a six into a chai stall', theme: 'Cricket', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: An alien visiting Earth for the first time', theme: 'Sci-Fi', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: Someone trying to fold a fitted bedsheet', theme: 'Daily Life', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A street food vendor with a 5-star Michelin rating', theme: 'Food', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A squirrel doing parkour on power lines', theme: 'Animals', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A student carrying the world\'s heaviest school bag', theme: 'School', timeLimit: 90, category: 'caption_battle', isIndiaThemed: true },
  { text: 'Write a witty caption for: A fish looking surprised at a sushi restaurant', theme: 'Humor', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
  { text: 'Write a witty caption for: A grandmother beating everyone at a video game', theme: 'Family', timeLimit: 90, category: 'caption_battle', isIndiaThemed: false },
];

const RHYME_TIME_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a 4-line rhyming poem about monsoon rain', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a lazy Sunday', theme: 'Daily Life', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about chai and biscuits', theme: 'Food', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about the moon', theme: 'Space', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about school friends', theme: 'Friendship', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a Diwali night', theme: 'Festival', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a butterfly', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a train whistle at night', theme: 'Travel', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about ice cream melting in summer', theme: 'Seasons', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about flying kites on Makar Sankranti', theme: 'Festival', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a dream you had', theme: 'Imagination', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about mangoes in summer', theme: 'Seasons', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a secret hideout', theme: 'Adventure', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about the first day of school', theme: 'School', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a grandmother\'s stories', theme: 'Family', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a rainy cricket match', theme: 'Sports', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about the color orange', theme: 'Colors', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a river flowing through hills', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about bedtime', theme: 'Daily Life', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a peacock dancing', theme: 'Wildlife', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
];

export const ALL_PROMPTS: BeatTheAiPrompt[] = [
  ...STORY_SPRINT_PROMPTS,
  ...QUIZ_WHIZ_PROMPTS,
  ...CAPTION_BATTLE_PROMPTS,
  ...RHYME_TIME_PROMPTS,
];

const RECENT_KEY_PREFIX = 'gsi-btai-recent-';
const MAX_RECENT = 5;

/** Get a random prompt for a category, avoiding recent repeats */
export function getRandomPrompt(category: BeatTheAiCategory): BeatTheAiPrompt {
  const pool = ALL_PROMPTS.filter((p) => p.category === category);
  if (pool.length === 0) throw new Error(`No prompts for category: ${category}`);

  // Get recent prompt texts to avoid repeats (server-side: skip localStorage)
  let recentTexts: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${RECENT_KEY_PREFIX}${category}`);
      recentTexts = stored ? JSON.parse(stored) : [];
    } catch {
      recentTexts = [];
    }
  }

  // Filter out recent prompts
  const available = pool.filter((p) => !recentTexts.includes(p.text));
  const candidates = available.length > 0 ? available : pool;

  // Pick random (candidates always has at least 1 element since pool is non-empty)
  const picked = candidates[Math.floor(Math.random() * candidates.length)] as BeatTheAiPrompt;

  // Track recent (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const updated = [picked.text, ...recentTexts].slice(0, MAX_RECENT);
      localStorage.setItem(`${RECENT_KEY_PREFIX}${category}`, JSON.stringify(updated));
    } catch {
      // localStorage unavailable, skip
    }
  }

  return picked;
}
