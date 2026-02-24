# INFRA-004: Content Safety Test Suite

## Description
Build comprehensive tests for the content safety pipeline. Child safety is the #1 priority — the safety filter must have 100% test coverage before any studio goes live. This includes input blocklist, output filtering, image prompt safety, and AI system prompt enforcement.

## Requires KB Updates
- None

## Subtasks

### [TEST] Input filter unit tests
**Target**: `lib/safety/inputFilter.spec.ts`
**Action**: Create
**Requirements**:
- Test every blocklist category (violence, sexual, substances, self-harm, hate, PII)
- Test edge cases: mixed case, leet speak, Unicode substitution
- Test clean input passes through
- Test minimum length validation
- Test that AppException is thrown with correct code

### [TEST] Blocklist pattern tests
**Target**: `lib/safety/blocklist.spec.ts`
**Action**: Create
**Requirements**:
- Test each regex pattern matches expected phrases
- Test patterns don't have false positives on common words
- E.g., "grape" shouldn't be blocked, "cocaine" should
- Document any known false positives for future tuning

### [TEST] Image prompt filter tests
**Target**: `lib/safety/imageFilter.spec.ts`
**Action**: Create
**Requirements**:
- Test unsafe image keywords are blocked
- Test safe prompts pass through
- Test that safety append string is always added
- Test negative prompt is always included

### [TEST] Output filter tests
**Target**: `lib/safety/outputFilter.spec.ts`
**Action**: Create
**Requirements**:
- Test PII redaction (phone numbers, emails, addresses)
- Test output with clean content passes through
- Test Aadhaar number patterns are caught

### [TEST] Claude prompt safety integration test
**Target**: `lib/ai/prompts/storyPrompt.spec.ts`
**Action**: Create
**Requirements**:
- Verify system prompt includes all safety rules
- Verify user prompt builder sanitizes input
- Test that output JSON schema is valid

## Acceptance Criteria
- [ ] 100% test coverage on lib/safety/ directory
- [ ] All blocklist categories tested
- [ ] No false positives on common child-friendly words
- [ ] PII patterns tested (Indian phone, email, Aadhaar)
- [ ] Tests run in under 5 seconds
- [ ] CI-ready (can be added to GitHub Actions)
