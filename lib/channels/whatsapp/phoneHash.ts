/**
 * One-way phone-number hash for storage.
 *
 * Phone numbers are PII (DPDP 2023 in India treats them as sensitive personal
 * data). We never index by raw phone in any persistent store — only by
 * SHA-256(phone || PEPPER). Lookup remains O(1) because hashing is
 * deterministic; reverse lookup is infeasible without the pepper.
 *
 * The pepper MUST be a stable, server-side-only secret. Rotate only when
 * intentionally invalidating all stored hashes (which would orphan rate-limit
 * + bot-session state — done as part of a planned migration, not casually).
 */

import crypto from 'crypto';

let cachedPepper: string | null = null;

function getPepper(): string {
  if (cachedPepper) return cachedPepper;
  const pepper = process.env.PHONE_HASH_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      'PHONE_HASH_PEPPER must be set to a long, stable random secret (>=16 chars). ' +
        'See .env.example.',
    );
  }
  cachedPepper = pepper;
  return pepper;
}

/**
 * Hash a phone number to a stable hex digest.
 *
 * Idempotent: same input → same output across processes/regions/restarts as
 * long as PHONE_HASH_PEPPER stays the same.
 */
export function hashPhoneNumber(rawPhone: string): string {
  // Normalize: strip everything except digits so different formats of the
  // same number ("+91 78901 23456" vs "917890123456") hash identically.
  const normalized = rawPhone.replace(/\D+/g, '');
  return crypto.createHmac('sha256', getPepper()).update(normalized).digest('hex');
}
