---
task_id: ARCH-092
target_agent: auto-optimizer-finite
target_module: src/app/api/proxy-stream/route.ts
priority: high
status: completed
---

# Sanitize ICY Response Headers to Prevent Header Injection

## Context

The proxy-stream route forwards ICY headers from upstream radio servers directly into HTTP response headers without CRLF validation:

```typescript
// proxy-stream/route.ts ~lines 130-131
if (icyBr) responseHeaders['X-Stream-Bitrate'] = icyBr;      // NO VALIDATION
if (icyName) responseHeaders['X-Stream-Name'] = icyName;      // NO VALIDATION
```

An attacker controlling an upstream radio server can inject arbitrary headers via CRLF sequences:
```
icy-name: "Station\r\nSet-Cookie: admin=true"
```

This enables cookie injection, cache poisoning, and potential XSS if clients render headers as HTML.

Similarly, the icy-meta route returns ICY metadata values (`icyName`, `icyGenre`) unsanitized in JSON responses (~lines 106-116). While React's JSX escaping protects against XSS today, this is a latent vulnerability if rendering changes.

## Directive

1. **Create a header sanitization utility** in `src/lib/sanitize.ts`:
   ```typescript
   export function sanitizeHeaderValue(value: string): string {
     return value.replace(/[\r\n\x00]/g, '').trim();
   }

   export function sanitizeTextContent(value: string): string {
     return value
       .replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
       .trim();
   }
   ```

2. **Sanitize all ICY headers** before placing them in response headers:
   ```typescript
   if (icyBr) responseHeaders['X-Stream-Bitrate'] = sanitizeHeaderValue(icyBr);
   if (icyName) responseHeaders['X-Stream-Name'] = sanitizeHeaderValue(icyName);
   ```

3. **Sanitize ICY metadata** in the icy-meta route response JSON:
   - Strip control characters from `icyName`, `icyGenre`, `streamTitle`.
   - Limit string length to reasonable maximums (e.g., 500 chars).

4. **Audit all other response header assignments** in API routes for the same pattern.

**Boundaries:**
- Do NOT block stations with unusual ICY headers — just sanitize them.
- Do NOT change how the client renders metadata — only fix the API layer.
- Keep sanitization lightweight (no external libraries).

## Acceptance Criteria

- [ ] `sanitizeHeaderValue()` strips CRLF and null bytes.
- [ ] All ICY header values sanitized before inclusion in response headers.
- [ ] ICY metadata in JSON responses has control characters stripped.
- [ ] No header injection possible via malicious upstream servers.
- [ ] `npm run build` passes.
