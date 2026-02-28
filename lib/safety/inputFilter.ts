import { AppException } from '@/lib/api-utils';
import { BLOCKLIST_PATTERNS } from './blocklist';

/** Filter user input for safety before sending to AI */
export function filterInput(text: string): string {
  const lower = text.toLowerCase().trim();

  // Check blocklist patterns
  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(lower)) {
      throw new AppException(
        'UNSAFE_CONTENT',
        "Let's try a different idea! Think of something fun and creative.",
        400
      );
    }
  }

  // Check minimum meaningful content
  if (lower.length < 3) {
    throw new AppException('INVALID_INPUT', 'Tell us a bit more about your idea!', 400);
  }

  return text.trim();
}

/** Filter AI-generated output for safety */
export function filterOutput(text: string): string {
  // Check for PII patterns (phone, email, addresses)
  const piiPatterns = [
    /\b\d{10}\b/, // phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i, // email
    /\b\d{1,5}\s\w+\s(?:street|st|avenue|ave|road|rd|drive|dr)\b/i, // addresses
    /\b\d{4}\s?\d{4}\s?\d{4}\b/, // Aadhaar numbers (12 digits, optional spaces)
  ];

  let filtered = text;
  for (const pattern of piiPatterns) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }

  return filtered;
}

/** Validate image prompt for safety */
export function filterImagePrompt(prompt: string): string {
  const unsafe = [
    /\bgun\b/i, /\bweapon\b/i, /\bknife\b/i, /\bblood\b/i, /\bgore\b/i,
    /\bnude\b/i, /\bnaked\b/i, /\bsexy\b/i, /\bdrug\b/i, /\balcohol\b/i,
    /\bcigarette\b/i, /\bsmoking\b/i, /\bkill\b/i, /\bdeath\b/i,
  ];

  const lower = prompt.toLowerCase();
  for (const pattern of unsafe) {
    if (pattern.test(lower)) {
      throw new AppException(
        'UNSAFE_CONTENT',
        "Let's try a different image idea!",
        400
      );
    }
  }

  return prompt;
}
