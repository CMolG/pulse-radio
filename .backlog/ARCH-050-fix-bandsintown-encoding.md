---
task_id: ARCH-050
target_agent: auto-optimizer-finite
target_module: src/app/api/concerts/route.ts
priority: high
status: pending
---

# Fix Bandsintown Artist Name Double-Encoding Bug

## Context

In `/api/concerts/route.ts` (line ~46), the Bandsintown artist name encoding contains a bug:

```typescript
.replace(/%22/gi, '%27C')
```

This replaces URL-encoded double quotes (`%22`) with `%27C`, which is not a valid encoding — `%27` decodes to `'` (single quote) followed by literal `C`. The intent was likely to handle special characters in artist names for the Bandsintown API, but the replacement produces malformed URLs.

The same pattern may exist in the cron sync route (`/api/cron/sync/route.ts`) which also queries Bandsintown.

This causes concert lookups to silently fail for artists with quotes in their names (e.g., "Guns N' Roses", "Florence + The Machine").

## Directive

1. **Investigate the actual Bandsintown API encoding requirements**: The Bandsintown API likely requires artist names to be URL-encoded normally. Check if there's a specific character escaping rule.
2. **Fix the encoding**: Replace the faulty `%27C` substitution with proper URL encoding. Most likely, standard `encodeURIComponent()` is sufficient.
3. **Verify in cron sync**: Check if the same bug exists in `/api/cron/sync/route.ts` and fix it there too.
4. **Test with problematic artist names**: Verify that searches for artists with quotes, ampersands, and special characters work correctly.

**Boundaries:**
- Do NOT change any other logic in the concerts or cron routes.
- Do NOT modify the caching behavior.
- Only fix the encoding/URL construction.

## Acceptance Criteria

- [ ] Artist names with quotes (`'`, `"`) produce valid Bandsintown API URLs.
- [ ] Artist names with special characters (`&`, `+`, `/`) are properly encoded.
- [ ] Cron sync route has the same fix applied if the bug exists there.
- [ ] Concert lookups return results for artists like "Guns N' Roses".
- [ ] `npm run build` passes.
