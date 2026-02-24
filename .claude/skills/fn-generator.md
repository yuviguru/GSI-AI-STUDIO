---
name: fn-generator
description: Generate Next.js API route handlers from API contracts. Creates route.ts files with proper validation, rate limiting, safety filtering, and error handling. Replaces NestJS api-generator for serverless architecture.
---

# Function Generator

Generate Next.js API route handlers from API contracts.

## Usage

```
Input: "Generate the story generation endpoint"
Source: /docs/api-contracts.md#post-apiaistory
Output: app/api/ai/story/route.ts
```

## Process

1. **Read API contract** — From api-contracts.md
2. **Load context** — kb-loader for app/api/ directory
3. **Generate route handler** — Following serverless patterns
4. **Include safety pipeline** — Input filter → AI call → output filter
5. **Add rate limiting** — Check session/user limits

## Route Handler Template

```typescript
import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { someInputSchema } from '@/lib/validators';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const input = someInputSchema.parse(body);

    // 2. Rate limit check
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    // await checkRateLimit(sessionId);

    // 3. Safety filter input
    filterInput(input.premise ?? input.topic ?? '');

    // 4. Process (AI generation, DB operations, etc.)
    const result = await generateSomething(input);

    // 5. Safety filter output
    const safeResult = filterOutput(result);

    // 6. Return success
    return apiSuccess(safeResult, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Key Differences from REST APIs
- No controllers/services split — single route.ts file per endpoint
- Export named functions: GET, POST, PUT, DELETE, PATCH
- Use NextRequest/NextResponse (not Express req/res)
- Zod for validation (not class-validator)
- Firebase Admin SDK for server-side DB access
- No dependency injection — direct imports
