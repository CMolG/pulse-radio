---
task_id: ARCH-097
target_agent: auto-optimizer-finite
target_module: src/app/api/concerts/route.ts
priority: medium
status: pending
---

# Prevent Log Injection via User-Controlled Input

## Context

The concerts route interpolates user-supplied `artist` parameter directly into log lines:

```typescript
// concerts/route.ts ~lines 83, 98
console.error(`[concerts] artist lookup ${artistRes.status} for "${artist}": ${body.slice(0, 200)}`);
console.error(`[concerts] events ${res.status} for "${artist}" (id=${artistId}): ${body.slice(0, 200)}`);
```

An attacker can inject newlines and fake log entries:
```bash
curl '/api/concerts?artist=Band%0aERROR:%20database%20corrupted%0aadmin%20action%20completed'
```

This produces log entries that look like legitimate errors, poisoning log aggregators (Datadog, Splunk) and potentially triggering false alerts or masking real incidents.

> **Related:** ARCH-075 (Structured Logging) will replace `console.error` with structured JSON logging, which inherently prevents this. However, until ARCH-075 is implemented, this vulnerability exists.

## Directive

1. **Create a log-safe sanitizer** in `src/lib/sanitize.ts` (or extend from ARCH-092):
   ```typescript
   export function sanitizeForLog(input: string): string {
     return input
       .replace(/[\r\n]/g, ' ')     // Collapse newlines to spaces
       .replace(/[\x00-\x1f]/g, '') // Strip control characters
       .slice(0, 200);              // Limit length
   }
   ```

2. **Sanitize all user inputs** before logging across all API routes:
   ```typescript
   console.error(`[concerts] artist lookup ${status} for "${sanitizeForLog(artist)}": ...`);
   ```

3. **Audit all `console.log/warn/error` calls** in API routes for user-controlled interpolation:
   - `concerts/route.ts`: `artist` parameter.
   - `icy-meta/route.ts`: `streamUrl` parameter.
   - `proxy-stream/route.ts`: `url` parameter.
   - `itunes/route.ts`: `term` parameter.
   - `artist-info/route.ts`: `artist` parameter.
   - `lyrics/route.ts`: `artist` and `title` parameters.

4. **Apply `sanitizeForLog()`** to every user-supplied value before it appears in a log line.

**Boundaries:**
- Do NOT switch to structured logging in this card (that's ARCH-075).
- Only add sanitization to existing `console.*` calls.
- Keep the sanitizer simple — strip newlines and control characters.
- Do NOT truncate so aggressively that logs become useless.

## Acceptance Criteria

- [ ] `sanitizeForLog()` function strips newlines and control characters.
- [ ] All user-supplied values sanitized before appearing in log output.
- [ ] No log injection possible via any API route parameter.
- [ ] `npm run build` passes.
- [ ] Legitimate log messages still readable and useful.
