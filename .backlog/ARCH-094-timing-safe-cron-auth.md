---
task_id: ARCH-094
target_agent: auto-optimizer-finite
target_module: src/app/api/cron/sync/route.ts
priority: medium
status: completed
---

# Use Timing-Safe Comparison for CRON_SECRET Authentication

## Context

The cron sync endpoint compares the `CRON_SECRET` using JavaScript's `!==` operator:

```typescript
// cron/sync/route.ts ~line 106
if (auth !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Standard string comparison (`!==`) is vulnerable to timing attacks — the comparison short-circuits on the first differing byte, allowing an attacker to measure response time differences and brute-force the secret character-by-character.

While practical exploitation requires high-precision timing and many requests, the fix is trivial and eliminates the attack surface entirely.

## Directive

1. **Use `crypto.timingSafeEqual`** for the comparison:
   ```typescript
   import { timingSafeEqual } from 'crypto';

   function safeCompare(a: string, b: string): boolean {
     if (a.length !== b.length) return false;
     return timingSafeEqual(Buffer.from(a), Buffer.from(b));
   }
   ```

2. **Replace the comparison** in the cron sync route:
   ```typescript
   if (!safeCompare(auth ?? '', `Bearer ${CRON_SECRET}`)) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

3. **Add rate limiting note**: Even with timing-safe comparison, the endpoint should be rate-limited (covered by ARCH-032). Add a comment referencing ARCH-032.

**Boundaries:**
- Do NOT change the authentication scheme (Bearer token is fine).
- Do NOT add additional auth mechanisms (OAuth, JWT, etc.).
- Use Node.js built-in `crypto.timingSafeEqual` — no external libraries.

## Acceptance Criteria

- [ ] `CRON_SECRET` compared using `crypto.timingSafeEqual`.
- [ ] Length check before timing-safe comparison (prevents length oracle).
- [ ] `npm run build` passes.
- [ ] Cron endpoint still authenticates correctly with valid secret.
