/**
 * Strip APP segments (APP0..APP15) from a JPEG buffer in place.
 *
 * APP1 holds EXIF, APP13 holds Photoshop IRBs, APP14 holds Adobe colour info.
 * Some image generators (e.g. Pollinations) inject the full prompt and tracking
 * payload as JSON inside an APP segment, which can balloon a 30KB JPEG to 100KB+.
 *
 * Stripping these is safe for browser display — only colour profiles in APP2
 * (ICC) and gamma in APP0 (JFIF) matter, and modern browsers tolerate their
 * absence with sRGB defaults. Pixel data lives in non-APP segments which we
 * preserve unchanged.
 *
 * Returns the original buffer if it isn't a JPEG (no SOI marker).
 */
export function stripJpegMetadata(buffer: Buffer): Buffer {
  if (buffer.length < 4) return buffer;
  // SOI marker — every valid JPEG starts with FFD8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;

  const out: number[] = [0xff, 0xd8];
  let i = 2;

  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xff) {
      // Stray byte — bail out and copy the rest verbatim
      for (let j = i; j < buffer.length; j++) out.push(buffer[j]!);
      break;
    }

    const marker = buffer[i + 1]!;

    // APPn segments are 0xE0..0xEF — skip
    if (marker >= 0xe0 && marker <= 0xef) {
      const len = ((buffer[i + 2]! << 8) | buffer[i + 3]!);
      if (len < 2 || i + 2 + len > buffer.length) {
        // Malformed — bail
        for (let j = i; j < buffer.length; j++) out.push(buffer[j]!);
        break;
      }
      i += 2 + len;
      continue;
    }

    // SOS (start of scan) at 0xDA — copy everything from here to EOI verbatim.
    // Entropy-coded data follows and contains 0xFF bytes that are not real
    // markers (escaped as FF00) — we must not parse further.
    if (marker === 0xda) {
      for (let j = i; j < buffer.length; j++) out.push(buffer[j]!);
      break;
    }

    // Standalone marker (no length) — RST0..RST7 (D0..D7), SOI (D8), EOI (D9)
    if (marker >= 0xd0 && marker <= 0xd9) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    // Default: marker with length — copy as-is
    const len = (buffer[i + 2]! << 8) | buffer[i + 3]!;
    if (len < 2 || i + 2 + len > buffer.length) {
      for (let j = i; j < buffer.length; j++) out.push(buffer[j]!);
      break;
    }
    for (let j = i; j < i + 2 + len; j++) out.push(buffer[j]!);
    i += 2 + len;
  }

  return Buffer.from(out);
}

/**
 * Decode a `data:image/...;base64,...` URI into raw bytes + content type.
 * Returns null for non-data URIs.
 */
export function decodeDataUri(
  uri: string,
): { contentType: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(uri);
  if (!match) return null;
  return {
    contentType: match[1]!,
    buffer: Buffer.from(match[2]!, 'base64'),
  };
}

export function encodeDataUri(contentType: string, buffer: Buffer): string {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
