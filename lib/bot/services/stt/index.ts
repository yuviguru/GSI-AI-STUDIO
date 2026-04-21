/** STT orchestrator — cascades free-tier Whisper providers.
 *
 *  Order: Groq (primary) → Hugging Face Inference → Replicate → null.
 *  Each provider returns null on rate-limit, error, or empty result, so the
 *  next one gets a try. Returns null when every provider has failed — callers
 *  should respond with a polite "type it instead" message rather than crashing.
 */

import { transcribeWithGroq } from './groq';
import { transcribeWithHuggingFace } from './hf';
import { transcribeWithReplicate } from './replicate';

export interface TranscriptionResult {
  text: string;
  provider: 'groq' | 'huggingface' | 'replicate';
}

export async function transcribeVoice(audio: Buffer): Promise<TranscriptionResult | null> {
  const groqText = await transcribeWithGroq(audio);
  if (groqText) return { text: groqText, provider: 'groq' };

  const hfText = await transcribeWithHuggingFace(audio);
  if (hfText) return { text: hfText, provider: 'huggingface' };

  const replicateText = await transcribeWithReplicate(audio);
  if (replicateText) return { text: replicateText, provider: 'replicate' };

  return null;
}
