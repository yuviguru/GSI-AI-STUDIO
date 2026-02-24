import Replicate from 'replicate';

let client: Replicate | null = null;

function getClient(): Replicate {
  if (!client) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('REPLICATE_API_TOKEN not set');
    client = new Replicate({ auth: token });
  }
  return client;
}

const SAFETY_APPEND = ', child-friendly, colorful illustration, safe for children, cartoon style';
const NEGATIVE_PROMPT =
  'violence, weapons, blood, scary, realistic human faces, nudity, nsfw, dark, horror';

interface ImageOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
}

export async function generateImage({
  prompt,
  style = 'cartoon',
  width = 768,
  height = 768,
}: ImageOptions): Promise<string> {
  const replicate = getClient();

  const safePrompt = `${style} style illustration: ${prompt}${SAFETY_APPEND}`;

  const output = await replicate.run('stability-ai/sdxl:latest', {
    input: {
      prompt: safePrompt,
      negative_prompt: NEGATIVE_PROMPT,
      width,
      height,
      num_outputs: 1,
      guidance_scale: 7.5,
      num_inference_steps: 30,
    },
  });

  // Replicate returns array of URLs
  const urls = output as string[];
  if (!urls?.[0]) throw new Error('No image generated');

  return urls[0];
}
