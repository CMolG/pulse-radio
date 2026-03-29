---
task_id: ARCH-096
target_agent: auto-optimizer-finite
target_module: src/app/api/artist-info/route.ts
priority: medium
status: completed
---

# Enforce Response Body Size Limits (Not Just Headers)

## Context

The artist-info and itunes routes check `Content-Length` headers to prevent oversized responses, but this is insufficient:

```typescript
// artist-info/route.ts ~lines 26-28
const cl = res.headers.get('content-length');
if (cl && parseInt(cl, 10) > 2 * 1024 * 1024) {  // Only checks HEADER
  await res.body?.cancel().catch(_NOOP);
  return null;
}
return await res.json();  // No limit on actual bytes read
```

**Bypass vectors:**
1. `Transfer-Encoding: chunked` responses have no `Content-Length` → check is skipped entirely.
2. After HTTP redirects, the response body can differ from the initial `Content-Length`.
3. `Content-Encoding: gzip` — a 1MB compressed response can decompress to 100MB+.
4. `res.json()` reads the entire body into memory with no cap.

An attacker (or a malfunctioning external API) can cause server OOM by returning a massive response.

## Directive

1. **Create a size-limited response reader** in `src/lib/fetch-utils.ts`:
   ```typescript
   export async function readJsonWithLimit<T>(
     res: Response,
     maxBytes: number = 2 * 1024 * 1024
   ): Promise<T | null> {
     const reader = res.body?.getReader();
     if (!reader) return null;

     const chunks: Uint8Array[] = [];
     let totalBytes = 0;

     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       totalBytes += value.byteLength;
       if (totalBytes > maxBytes) {
         reader.cancel();
         return null; // Response too large
       }
       chunks.push(value);
     }

     const text = new TextDecoder().decode(Buffer.concat(chunks));
     return JSON.parse(text) as T;
   }
   ```

2. **Replace `res.json()` calls** in:
   - `artist-info/route.ts` → `readJsonWithLimit(res, 2_097_152)` (2MB).
   - `itunes/route.ts` → `readJsonWithLimit(res, 1_048_576)` (1MB).
   - `concerts/route.ts` → `readJsonWithLimit(res, 524_288)` (512KB).

3. **Remove the header-only `Content-Length` check** (redundant after body-level enforcement).

4. **Log oversized responses** for monitoring:
   ```typescript
   if (totalBytes > maxBytes) {
     console.warn(`[fetch] Response exceeded ${maxBytes} bytes from ${url}`);
     reader.cancel();
     return null;
   }
   ```

**Boundaries:**
- Do NOT change fetch timeout settings (those are separate from size limits).
- Keep the default limit at 2MB (sufficient for all expected API responses).
- Do NOT apply size limits to the proxy-stream route (it streams audio, not JSON).

## Acceptance Criteria

- [ ] `readJsonWithLimit()` utility enforces body-level size limits.
- [ ] All JSON-fetching API routes use body-level limiting (not just header checks).
- [ ] Chunked and compressed responses are properly limited.
- [ ] Oversized responses logged with URL context.
- [ ] `npm run build` passes.
