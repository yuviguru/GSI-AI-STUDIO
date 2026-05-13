const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8000';
const SAFETY_APPEND = ', child-friendly, colorful illustration, safe for children, cartoon style';
const NEGATIVE_PROMPT =
  'violence, weapons, blood, scary, realistic human faces, nudity, nsfw, dark, horror';
const POLL_INTERVAL = 2_000;
const MAX_WAIT = 120_000;
const MAX_PROMPT_LENGTH = 200;

interface ImageOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
}

/**
 * Generate an image using a local ComfyUI instance with FLUX.1 Schnell GGUF.
 * Returns a base64 data URI for immediate browser display.
 */
export async function generateImageLocal({
  prompt,
  style = 'cartoon',
  width = 512,
  height = 512,
  }: ImageOptions): Promise<string> {
  const trimmedPrompt = prompt.length > MAX_PROMPT_LENGTH
    ? prompt.slice(0, MAX_PROMPT_LENGTH).replace(/\s\S*$/, '')
    : prompt;

  const safePrompt = `${style} style illustration: ${trimmedPrompt}${SAFETY_APPEND}`;
  const seed = Math.floor(Math.random() * 1_000_000);

  const workflow = buildWorkflow(safePrompt, seed, width, height);

  try {
    // 1. Queue prompt
    const clientId = `gsi-studio-${Date.now()}`;
    const queueRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });

    if (!queueRes.ok) {
      const errText = await queueRes.text().catch(() => '');
      console.error(`[ComfyUI] Queue failed (${queueRes.status}):`, errText);
      return fallbackDataUri(width, height);
    }

    const { prompt_id } = await queueRes.json();
    console.log(`[ComfyUI] Queued prompt ${prompt_id}`);

    // 2. Poll for completion
    const imageInfo = await pollForCompletion(prompt_id);
    if (!imageInfo) return fallbackDataUri(width, height);

    // 3. Fetch image and return as base64
    const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}&type=output`;
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.error(`[ComfyUI] Failed to fetch image (${imageRes.status})`);
      return fallbackDataUri(width, height);
    }

    const buffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error('[ComfyUI] Generation failed:', err instanceof Error ? err.message : err);
    return fallbackDataUri(width, height);
  }
}

/** Poll ComfyUI /history endpoint until the prompt completes or times out */
async function pollForCompletion(
  promptId: string
): Promise<{ filename: string; subfolder: string } | null> {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT) {
    await sleep(POLL_INTERVAL);

    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
      if (!res.ok) continue;

      const history = await res.json();
      const entry = history[promptId];
      if (!entry) continue;

      const status = entry.status?.status_str;

      if (status === 'success') {
        // Find the SaveImage output node
        const outputs = entry.outputs;
        for (const nodeId of Object.keys(outputs)) {
          const images = outputs[nodeId]?.images;
          if (images?.length) {
            return { filename: images[0].filename, subfolder: images[0].subfolder || '' };
          }
        }
        console.error('[ComfyUI] Success but no image found in outputs');
        return null;
      }

      if (status === 'error') {
        const messages = entry.status?.messages || [];
        for (const msg of messages) {
          if (msg[0] === 'execution_error') {
            console.error('[ComfyUI] Execution error:', msg[1]?.exception_message);
          }
        }
        return null;
      }
    } catch {
      // ComfyUI may not be ready yet, keep polling
    }
  }

  console.error(`[ComfyUI] Timed out after ${MAX_WAIT / 1000}s`);
  return null;
}

/** Build the ComfyUI workflow for FLUX.1 Schnell GGUF */
function buildWorkflow(prompt: string, seed: number, width: number, height: number) {
  return {
    '1': {
      class_type: 'UnetLoaderGGUF',
      inputs: { unet_name: 'flux1-schnell-Q4_K_S.gguf' },
    },
    '2': {
      class_type: 'DualCLIPLoader',
      inputs: {
        clip_name1: 'clip_l.safetensors',
        clip_name2: 't5xxl_fp8_e4m3fn.safetensors',
        type: 'flux',
        device: 'cpu',
      },
    },
    '3': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'ae.safetensors' },
    },
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: prompt },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['2', 0], text: NEGATIVE_PROMPT },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    '6': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['4', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
        seed,
        steps: 4,
        cfg: 1.0,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1.0,
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['6', 0], vae: ['3', 0] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'gsi_story', images: ['8', 0] },
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simple SVG fallback as data URI */
function fallbackDataUri(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f3e8ff"/><stop offset="100%" style="stop-color:#fef3c7"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <text x="50%" y="45%" text-anchor="middle" font-size="48" fill="#a78bfa">📖</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#9ca3af">Use your imagination!</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
