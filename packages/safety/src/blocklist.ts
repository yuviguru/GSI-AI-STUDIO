/**
 * Content blocklist for child safety.
 * These patterns are checked against user input BEFORE sending to AI.
 * Keep this list curated — false positives are better than missed unsafe content.
 */
export const BLOCKLIST_PATTERNS: RegExp[] = [
  // Violence
  /\b(?:kill|murder|assassin|torture|shoot|stab)\b/i,
  /\b(?:bomb|explosion|terrorist|attack|warfare)\b/i,

  // Sexual content
  /\b(?:sex|porn|nude|naked|erotic|nsfw)\b/i,
  /\b(?:xxx|18\+|adult content)\b/i,

  // Substances
  /\b(?:cocaine|heroin|meth|marijuana|weed|drugs)\b/i,
  /\b(?:drunk|alcohol|beer|wine|vodka|whiskey)\b/i,

  // Self-harm
  /\b(?:suicide|self.?harm|cut myself|end my life)\b/i,

  // Hate speech
  /\b(?:racist|hate speech|supremac)\b/i,

  // Personal info requests
  /\b(?:phone number|home address|credit card|social security)\b/i,
  /\b(?:password|bank account|aadhaar)\b/i,
];
