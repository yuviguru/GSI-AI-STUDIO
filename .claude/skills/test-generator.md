---
name: test-generator
description: Generate tests for components, hooks, API routes, and utilities. Uses kb-loader to understand the code and tech-standards for test patterns. Creates tests with Vitest.
---

# Test Generator

Generate tests for existing code.

## Usage

```
Input: "Create tests for useAiGeneration hook"
Target: hooks/useAiGeneration.ts
Output: hooks/useAiGeneration.spec.ts
```

## Process

1. **Load context** — kb-loader for target file
2. **Read source** — Parse the file to test
3. **Identify testables**: Public functions, edge cases, error conditions
4. **Generate tests** — Following Vitest patterns
5. **Include mocks** — For Firebase, AI APIs, fetch

## Test Patterns

### API Route Tests
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('POST /api/ai/story', () => {
  it('should generate a story with valid input', async () => { ... });
  it('should reject unsafe content', async () => { ... });
  it('should enforce rate limits', async () => { ... });
});
```

### Hook Tests (with React Testing Library)
```typescript
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';

describe('useSession', () => {
  it('should initialize with a session ID', () => { ... });
  it('should track creation count', () => { ... });
});
```

### Safety Filter Tests (100% coverage target)
```typescript
describe('filterInput', () => {
  it('should block profanity', () => { ... });
  it('should allow clean input', () => { ... });
  it('should handle edge cases', () => { ... });
});
```

## Coverage Priorities
1. Safety filters — 100% coverage (non-negotiable)
2. API routes — 80% coverage
3. Hooks — 70% coverage
4. Components — E2E only in Phase 1, skip unit tests
