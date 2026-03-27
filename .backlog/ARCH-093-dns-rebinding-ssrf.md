---
task_id: ARCH-093
target_agent: auto-optimizer-finite
target_module: src/app/api/icy-meta/route.ts
priority: high
status: pending
---

# Harden SSRF Protection Against DNS Rebinding Attacks

## Context

The icy-meta route validates hostnames against private IP ranges before fetching, but is vulnerable to DNS rebinding:

```typescript
// icy-meta/route.ts ~lines 64-98
if (isPrivateHost(url.hostname))                    // Check at DNS resolution time
  return NextResponse.json(_ERR_PRIVATE_IP, ...);
// ...
const res = await fetch(streamUrl, { ... });        // Fetch happens LATER
if (res.url) {
  const finalUrl = new URL(res.url);
  if (isPrivateHost(finalUrl.hostname)) { ... }     // Post-redirect check
}
// If res.url is empty, private IP check is skipped!
```

**DNS Rebinding attack flow:**
1. Attacker registers `evil.com` with TTL=0.
2. Initial DNS → public IP (passes `isPrivateHost` check).
3. During `fetch()`, DNS re-resolves → `127.0.0.1` or `169.254.169.254`.
4. If `res.url` is empty (some HTTP libraries), the post-redirect check is skipped.
5. Attacker reads ICY metadata from internal services.

> **Related:** ARCH-021 blocks multicast addresses. This card hardens against DNS rebinding, a more sophisticated SSRF vector.

## Directive

1. **Resolve DNS before fetching** and validate the resolved IP:
   ```typescript
   import { lookup } from 'dns/promises';

   async function resolveAndValidate(hostname: string): Promise<string> {
     const { address } = await lookup(hostname);
     if (isPrivateIP(address)) {
       throw new Error('Resolved to private IP');
     }
     return address;
   }
   ```

2. **Extend `isPrivateHost()`** to also check resolved IPs, not just hostname strings:
   - Add checks for: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local/cloud metadata), `0.0.0.0`, `::1`, `fc00::/7`.

3. **Always validate final URL** — if `res.url` is falsy, treat it as suspicious and abort:
   ```typescript
   if (!res.url) {
     controller.abort();
     return NextResponse.json({ error: 'Redirect target unknown' }, { status: 400 });
   }
   ```

4. **Apply the same DNS pre-validation** to the proxy-stream route.

**Boundaries:**
- Do NOT use a DNS resolver library — use Node.js built-in `dns/promises`.
- Do NOT block legitimate CDN domains (only block when the resolved IP is private).
- Keep the protection async and fast (DNS lookup adds ~1-5ms latency).
- Do NOT change the fetch logic — only add pre-fetch validation.

## Acceptance Criteria

- [ ] DNS-resolved IP is validated against private ranges before fetch.
- [ ] `res.url` absence treated as suspicious and blocked.
- [ ] Cloud metadata endpoint (169.254.169.254) blocked.
- [ ] Both icy-meta and proxy-stream routes protected.
- [ ] `npm run build` passes.
- [ ] Legitimate station URLs still work.
