---
task_id: ARCH-095
target_agent: auto-optimizer-finite
target_module: src/app/api
priority: medium
status: completed
---

# Sanitize Error Messages in API Responses (Information Disclosure)

## Context

Multiple API routes return raw `Error.message` strings in responses:

```typescript
// proxy-stream/route.ts ~line 149
const message = err instanceof Error ? err.message : 'Unknown error';
return new Response(JSON.stringify({ error: message }), { status: 502 });

// itunes/route.ts ~line 64
error: e instanceof Error ? e.message : 'Internal error',

// icy-meta/route.ts ~lines 164-165
const message = err instanceof Error ? err.message : 'Unknown error';
```

Exception messages can leak internal implementation details:
- `"getaddrinfo ENOTFOUND internal-service"` → reveals internal hostnames.
- `"ECONNREFUSED 127.0.0.1:5432"` → reveals database port/host.
- `"SQLITE_BUSY: database is locked"` → reveals database technology.

**PoC**: `curl '/api/proxy-stream?url=http://nonexistent.internal:8080'` → response leaks DNS resolution failure details.

## Directive

1. **Create a standardized error response helper** in `src/lib/api-errors.ts`:
   ```typescript
   export function safeErrorResponse(status: number, publicMessage: string, internalError?: unknown) {
     if (internalError && process.env.NODE_ENV !== 'production') {
       // In development, include full error for debugging
       return { error: publicMessage, debug: String(internalError) };
     }
     return { error: publicMessage };
   }
   ```

2. **Replace raw `err.message` usage** in all API routes:
   - `proxy-stream`: `{ error: 'Stream connection failed' }` (not the raw error).
   - `icy-meta`: `{ error: 'Metadata fetch failed' }`.
   - `itunes`: `{ error: 'Search request failed' }`.
   - `artist-info`: `{ error: 'Artist lookup failed' }`.
   - `concerts`: `{ error: 'Concert lookup failed' }`.

3. **Log the full error server-side** (for debugging) but never return it to the client:
   ```typescript
   console.error('[proxy-stream] Connection failed:', err);
   return new Response(JSON.stringify(safeErrorResponse(502, 'Stream connection failed')), ...);
   ```

**Boundaries:**
- Do NOT suppress errors entirely — log them server-side.
- Keep specific public messages per route (not generic "Internal error" everywhere).
- In development mode (`NODE_ENV !== 'production'`), still show full errors for debugging.

## Acceptance Criteria

- [ ] No API route returns raw `err.message` in production responses.
- [ ] Public error messages are generic but route-specific.
- [ ] Full errors logged server-side via `console.error`.
- [ ] Development mode still shows detailed errors.
- [ ] `npm run build` passes.
