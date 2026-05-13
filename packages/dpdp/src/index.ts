/**
 * @gsi/dpdp — DPDP Act 2023 consent + erasure pipeline.
 *
 * Every PII-touching path goes through `requireConsent()` before assembling
 * data. Erasure requests run through `processErasureRequest()` which cascades
 * deletes across all collections that store kid data.
 */

export * from './consentService';
export * from './dataErasure';
