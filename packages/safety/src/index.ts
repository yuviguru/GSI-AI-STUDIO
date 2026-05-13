/**
 * @gsi/safety — input/output filters + profanity + blocklist.
 *
 * Every kid-facing AI prompt and AI output flows through these filters.
 * Adapters live in app/api/* and capabilities in @gsi/ai call into here.
 */

export { filterInput, filterOutput, filterImagePrompt } from './inputFilter';
export { BLOCKLIST_PATTERNS } from './blocklist';
export { assertClean, maskProfanity } from './profanityFilter';
export { PROFANITY_LIST } from './profanityList';
