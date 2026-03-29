---
task_id: ARCH-034
target_agent: auto-feature-engineer-finite
target_module: src/lib/sanitize.ts
priority: high
status: completed
---

# Add Input Sanitization Layer for API Routes

## Context

All API routes accept query parameters with minimal validation — most only call `.trim()`. The `/api/itunes` route passes user-supplied `term` directly to the iTunes API. The `/api/lyrics` route passes `artist` and `title` parameters to LrcLib. The `/api/proxy-stream` route accepts an arbitrary URL. While the proxy has SSRF protection for IP ranges, there is no validation of query parameter length, character sets, or injection patterns across any route.

Malicious payloads in query parameters could:
1. Trigger unexpected behavior in upstream APIs.
2. Cause ReDoS if any regex is applied to unsanitized input.
3. Inject control characters into ICY metadata displayed in the UI.
4. Overflow SQLite cache keys with extremely long strings.

## Directive

Create a sanitization utility at `src/lib/sanitize.ts`:

1. **`sanitizeSearchQuery(input: string): string`**:
   - Trim whitespace.
   - Limit to 200 characters max.
   - Strip control characters (U+0000–U+001F, U+007F–U+009F) except space.
   - Strip HTML tags (`<...>`).
   - Return the cleaned string.

2. **`sanitizeUrl(input: string): string | null`**:
   - Validate it parses as a URL.
   - Only allow `http:` and `https:` protocols.
   - Limit to 2048 characters.
   - Return the valid URL string or `null` if invalid.

3. **`sanitizeMetadata(input: string): string`**:
   - For ICY metadata and display strings.
   - Strip control characters.
   - Escape `<`, `>`, `&`, `"`, `'` to HTML entities.
   - Limit to 500 characters.

4. **Integration**: Update each API route to use the appropriate sanitizer on incoming query parameters:
   - `/api/itunes`: `sanitizeSearchQuery()` on `term` param.
   - `/api/lyrics`: `sanitizeSearchQuery()` on `artist` and `title` params.
   - `/api/artist-info`: `sanitizeSearchQuery()` on `artist` param.
   - `/api/concerts`: `sanitizeSearchQuery()` on `artistName` param.
   - `/api/proxy-stream`: `sanitizeUrl()` on `url` param.
   - `/api/icy-meta`: `sanitizeUrl()` on `url` param.

**Boundaries:**
- Do NOT install any npm packages (no DOMPurify needed — this is server-side).
- Do NOT change the response format or business logic of any route.
- Keep the sanitizer functions pure and well-typed.
- Reject requests with invalid/empty params after sanitization with a 400 response.

## Acceptance Criteria

- [ ] `src/lib/sanitize.ts` exists with all three functions exported.
- [ ] All 6 user-facing API routes use appropriate sanitizers.
- [ ] Control characters are stripped from search queries.
- [ ] URLs are validated for protocol and length.
- [ ] Metadata strings have HTML entities escaped.
- [ ] Invalid/empty params return 400 Bad Request.
- [ ] All existing Playwright tests pass.
- [ ] TypeScript compiles without errors.
