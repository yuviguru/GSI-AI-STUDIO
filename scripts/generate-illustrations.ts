/**
 * Illustration generator.
 *
 * Reads scripts/illustration-manifest.ts, calls the project's image cascade
 * (lib/ai/imageProvider — Pixazo → Replicate SDXL → Pollinations), pipes the
 * result through the safety filter, and writes each asset to public/illustrations/.
 *
 * Usage:
 *   pnpm tsx scripts/generate-illustrations.ts                  # all missing
 *   pnpm tsx scripts/generate-illustrations.ts --force          # all (overwrite)
 *   pnpm tsx scripts/generate-illustrations.ts --slot=studios/books   # single slot
 *
 * Idempotent by default (skips files that already exist). Run locally with
 * provider env vars set, then commit the resulting public/illustrations/**.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getImageProvider } from '../lib/ai/imageProvider';
import { filterImagePrompt } from '@gsi/safety';
import {
  ILLUSTRATION_MANIFEST,
  STYLE_PREFIX,
  type IllustrationEntry,
} from './illustration-manifest';

const PUBLIC_ROOT = path.resolve(process.cwd(), 'public/illustrations');

interface CliFlags {
  force: boolean;
  slot: string | null;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { force: false, slot: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--force') flags.force = true;
    else if (arg.startsWith('--slot=')) flags.slot = arg.slice('--slot='.length);
  }
  return flags;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
}

async function generateOne(entry: IllustrationEntry): Promise<void> {
  const dest = path.join(PUBLIC_ROOT, entry.filename);
  const fullPrompt = `${STYLE_PREFIX} ${entry.prompt}`;

  // filterImagePrompt throws AppException if unsafe — keep behavior consistent with runtime AI calls.
  filterImagePrompt(fullPrompt);

  const { imageFunction, providerName } = getImageProvider();
  console.log(`  ↳ provider=${providerName} size=${entry.size}`);

  const url = await imageFunction({
    prompt: fullPrompt,
    style: 'cartoon',
    width: entry.size,
    height: entry.size,
  });

  if (!url) throw new Error(`Provider returned no URL for ${entry.slot}`);

  await downloadToFile(url, dest);
  console.log(`  ✓ ${entry.filename}`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  const entries = flags.slot
    ? ILLUSTRATION_MANIFEST.filter((e) => e.slot === flags.slot)
    : ILLUSTRATION_MANIFEST;

  if (entries.length === 0) {
    console.error(`No manifest entries match slot="${flags.slot}".`);
    process.exit(1);
  }

  console.log(`Generating ${entries.length} illustration(s)…`);
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    const dest = path.join(PUBLIC_ROOT, entry.filename);
    if (!flags.force && (await exists(dest))) {
      console.log(`· skip ${entry.filename} (exists)`);
      skipped++;
      continue;
    }

    console.log(`→ ${entry.slot}`);
    try {
      await generateOne(entry);
    } catch (err) {
      failed++;
      console.error(
        `  ✗ ${entry.slot} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    `\nDone. generated=${entries.length - skipped - failed} skipped=${skipped} failed=${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
