/**
 * AI Lab Foundation card catalog — the 8 launch cards covering the
 * minimum AI literacy kids need to understand what the platform's
 * agents are actually doing under the hood (decision L5).
 *
 * Static in-code catalog (no Firestore). Each card has:
 *   - kid-readable name + one-line summary
 *   - CBSE curriculum tag (Class 9/10 AI, Class 11/12 CT) so parents
 *     + teachers can map it to their syllabus
 *   - a prerequisite chain so the L2 "all visible but gated" model
 *     can surface "unlock by completing X first" cues
 *   - embedKind: which demo format the card uses — a curated HF
 *     Space (iframe), an in-browser Transformers.js demo, or an
 *     explainer-only card with links out
 *
 * Per decision L3, the iframe allowlist for HF Spaces is hardcoded
 * in `next.config.js`'s CSP. Adding a card that uses a new Space
 * means updating BOTH this file AND the CSP.
 */

export type CardId =
  | 'llm'
  | 'prompt'
  | 'token'
  | 'temperature'
  | 'hallucination'
  | 'tool_use'
  | 'agent'
  | 'embedding';

export type CbseStrand = 'AI-9' | 'AI-10' | 'CT-11' | 'CT-12';

export type EmbedKind =
  | { type: 'hf_space'; src: string; height: number }
  | { type: 'transformers_js_demo'; demoId: 'sentiment' | 'translation' }
  | { type: 'explainer_only' };

export interface FoundationCard {
  id: CardId;
  emoji: string;
  /** Kid-facing card title. */
  name: string;
  /** One-liner shown on the /learn index grid. */
  summary: string;
  /** 180-220 word plain-English explainer shown on the detail page. */
  explainer: string;
  /** Which CBSE strand(s) this card maps to — parents/teachers like
   *  seeing the syllabus anchor. */
  cbse: ReadonlyArray<CbseStrand>;
  /** IDs that must be "visited" before this one unlocks. Empty for
   *  day-1 cards. Gating is soft — visited state stored in
   *  localStorage, backend unaware. */
  prerequisites: ReadonlyArray<CardId>;
  /** Demo format (iframe / in-browser / explainer-only). */
  embed: EmbedKind;
  /** Tooltip shown on hover in the Team tab + agent Trace panel when
   *  the matching concept is referenced (e.g. "prompt" tooltip links
   *  to this card). */
  tooltip: string;
}

export const FOUNDATION_CARDS: readonly FoundationCard[] = [
  {
    id: 'llm',
    emoji: '🧠',
    name: 'What is an LLM?',
    summary: 'The brain behind most AI agents — a Large Language Model.',
    explainer:
      "An LLM — Large Language Model — is a computer program trained to notice patterns in language. " +
      "You give it words, and it tries to predict what word should come next, kind of like autocomplete but much better at long answers. " +
      "Your Design Agent uses an LLM called Claude. Your Marketing Agent uses the same one. " +
      "LLMs are the 'brain' behind the whole agent system. They're good at writing, explaining, and brainstorming — but they don't know new things that happened after they were trained, and they can make mistakes. " +
      "In Kid CEO every time an agent 'thinks', a real LLM call is firing in the background and costing the business a little bit of money. " +
      "You can see the exact LLM call, its cost, and how long it took by opening the WorkflowTrace panel after any agent run.",
    cbse: ['AI-9', 'AI-10'],
    prerequisites: [],
    embed: { type: 'explainer_only' },
    tooltip: 'A Large Language Model — the AI brain behind every agent in Kid CEO.',
  },
  {
    id: 'prompt',
    emoji: '💬',
    name: 'What is a prompt?',
    summary: 'The instructions you give an AI to make it do what you want.',
    explainer:
      "A prompt is the instructions you give an LLM. It's the whole chunk of text the agent sends — " +
      "including a 'system prompt' that sets the agent's role (\"You are a kid-friendly designer…\") and a 'user message' with the kid's actual request. " +
      "Writing a good prompt is a real skill. Specific beats vague. Examples beat abstract rules. Constraints (like 'reply in JSON' or '3 candidates only') force the model to stay on task. " +
      "In Kid CEO, every time you fill in a briefing form, those MC picks + free-text field get turned into a prompt for your agent. " +
      "You can see the exact prompt that was sent by opening the Trace panel after a run and tapping any step. " +
      "At the Scale phase you'll unlock the Workflow Builder, where you can write your own prompts directly.",
    cbse: ['AI-9', 'AI-10', 'CT-11'],
    prerequisites: ['llm'],
    embed: { type: 'explainer_only' },
    tooltip: 'The instructions the agent sends to its LLM — you shape it through the briefing form.',
  },
  {
    id: 'token',
    emoji: '🔢',
    name: 'What is a token?',
    summary: 'How LLMs chop up text into pieces they can work with.',
    explainer:
      "LLMs don't read whole words at a time. They chop text into 'tokens' — pieces roughly 4 characters long, often chunks of words. " +
      "The word 'unstoppable' might be 3 tokens: 'un', 'stop', 'pable'. Short everyday words are usually one token; rare words or long ones get split. " +
      "Why does this matter? Because LLMs are priced per token: each input token costs something, each output token costs something. A longer prompt = more input tokens = more ₹. " +
      "In Kid CEO you'll see token counts in the Trace panel — kids who run the math notice that making the prompt more specific (cheaper per attempt) can beat letting the LLM ramble (more output tokens, more ₹). " +
      "This is one reason your regeneration cost scales up: each re-roll is a fresh prompt+response pair, each one adding tokens to the bill.",
    cbse: ['AI-10', 'CT-11'],
    prerequisites: ['llm', 'prompt'],
    embed: { type: 'explainer_only' },
    tooltip: 'A chunk of text the LLM bills by — usually ~4 characters. More tokens = more ₹.',
  },
  {
    id: 'temperature',
    emoji: '🌡',
    name: 'What is temperature?',
    summary: 'A dial that makes the LLM safer or more surprising.',
    explainer:
      "When an LLM picks the next token, there are always a few reasonable options. 'Temperature' is a dial from 0 to 1+ that says how much randomness to allow. " +
      "Temperature 0 = always pick the most likely next token. Same input = same output every time. Boring but predictable. " +
      "Temperature 1 = pick randomly, weighted by probability. Creative but sometimes off-topic. " +
      "Your agents run at around temperature 0.7-0.85 — warm enough to give you three different logos for the same brief, cold enough to stay on task. " +
      "In Kid CEO the re-roll sometimes 'nudges' temperature up a tiny bit on each retry. That's why the second attempt often feels more adventurous than the first. " +
      "Temperature isn't a 'smarter' dial — it's just a 'more surprising' dial. Higher isn't always better.",
    cbse: ['AI-10', 'CT-11'],
    prerequisites: ['llm'],
    embed: { type: 'explainer_only' },
    tooltip: 'Controls how creative/random the LLM gets. Your agents run around 0.7-0.85.',
  },
  {
    id: 'hallucination',
    emoji: '👻',
    name: 'What is a hallucination?',
    summary: 'When an LLM confidently makes something up.',
    explainer:
      "LLMs don't know what's true — they know what's likely. That means sometimes they produce answers that sound confident but are completely made up. " +
      "This is called a 'hallucination'. The LLM doesn't know it's making things up. It's just finishing a pattern. " +
      "For kid-run businesses this matters: if you ask an LLM 'what does a lemonade stand in Bengaluru charge?' it might make up a number that isn't real. " +
      "That's why the Finance Agent combines the LLM's guess with a deterministic break-even calculator (pure math, never hallucinated). The LLM suggests a price, the calculator checks if it actually makes money. " +
      "Tip: for anything about real people, real prices, or real events, always double-check what an LLM tells you. " +
      "For creative tasks (logos, mottos, ideas) hallucination is actually fine — it's just imagination with no consequences.",
    cbse: ['AI-9', 'AI-10'],
    prerequisites: ['llm'],
    embed: { type: 'explainer_only' },
    tooltip: 'When an LLM confidently makes something up. Always double-check facts.',
  },
  {
    id: 'tool_use',
    emoji: '🛠',
    name: 'What is tool use?',
    summary: 'When an AI calls out to other programs to get things done.',
    explainer:
      "An LLM on its own is just text-in, text-out. But modern AI agents can 'use tools' — they decide when they need a calculator, a web search, or an image generator, and call out to that program. " +
      "This is exactly what your agents do. Your Design Agent uses TWO tools: Claude (for text) and Flux Schnell (for images). Your Finance Agent uses Claude PLUS a deterministic break-even calculator. " +
      "The Trace panel shows each tool call as its own row — you can see Claude, Flux, and break-even side by side with different costs (₹5, ₹8, ₹0). " +
      "Tool use is what makes agents practical. A 'smart' LLM alone can't generate an image. But an LLM that knows when to call Flux can ship you a real logo. " +
      "At the Scale phase you'll be able to wire up your own tool chains in the Workflow Builder.",
    cbse: ['AI-10', 'CT-11', 'CT-12'],
    prerequisites: ['llm'],
    embed: { type: 'explainer_only' },
    tooltip: 'When an AI agent calls out to other programs (calculators, image makers) to get work done.',
  },
  {
    id: 'agent',
    emoji: '🤖',
    name: 'What is an agent?',
    summary: 'An AI that takes goals, picks tools, and delivers results.',
    explainer:
      "An AI 'agent' is an LLM wrapped in enough plumbing that it can take a goal and do several steps on its own — usually picking tools along the way. " +
      "Your Design Agent is an agent. Your Marketing Agent is an agent. They each: " +
      "(1) read your brief, " +
      "(2) plan a sequence of tool calls, " +
      "(3) run those calls, " +
      "(4) combine the results into something you can use. " +
      "The real world is moving toward agents running more and more of a business. In Kid CEO you're learning what it feels like to BE the CEO of those agents — briefing them, overseeing their output, catching their mistakes. " +
      "This is also the real job of a human founder as their business grows: not doing everything, but hiring, directing, and reviewing people (or agents) who do.",
    cbse: ['AI-10', 'CT-11', 'CT-12'],
    prerequisites: ['llm', 'prompt', 'tool_use'],
    embed: { type: 'explainer_only' },
    tooltip: 'An AI that takes a goal, picks tools, and delivers a result — like your Design Agent.',
  },
  {
    id: 'embedding',
    emoji: '🧭',
    name: 'What is an embedding?',
    summary: "How AIs 'understand' similarity between pieces of text.",
    explainer:
      "An embedding is a long list of numbers that represents a piece of text or an image. Similar things get similar number lists — 'dog' and 'puppy' embeddings are close together; 'dog' and 'algebra' are far apart. " +
      "This is how computers 'understand' similarity without understanding meaning the way you do. " +
      "Embeddings power a lot of AI features: finding related articles, recommending similar products, filtering spam, connecting a user's question to the right help article. " +
      "A close cousin of embeddings is sentiment classification — given a sentence, is the feeling positive, negative, or neutral? Try the demo below. It runs entirely on your device with ₹0 cost.",
    cbse: ['AI-10', 'CT-12'],
    prerequisites: ['llm'],
    embed: { type: 'transformers_js_demo', demoId: 'sentiment' },
    tooltip: "How AIs measure similarity — turning text into numbers and comparing distances.",
  },
];

export function getCard(id: CardId): FoundationCard | null {
  return FOUNDATION_CARDS.find((c) => c.id === id) ?? null;
}

export function cardIsUnlocked(id: CardId, visitedIds: ReadonlySet<CardId>): boolean {
  const card = getCard(id);
  if (!card) return false;
  return card.prerequisites.every((pre) => visitedIds.has(pre));
}
