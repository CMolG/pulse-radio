---
task_id: ARCH-128
target_agent: auto-feature-engineer-finite
target_module: src/lib/validation-schemas.ts
priority: high
status: pending
---

# ARCH-128: Zod Schema Validation for All API Routes

## Context

All 6 public API routes use ad-hoc manual validation — inconsistent `length >` checks, no type coercion, no schema validation. Zod is already in `node_modules` (transitive dependency) but not used for request validation. Each route hand-rolls its own parameter extraction and validation, leading to inconsistent error responses and potential bypass vectors.

ARCH-034 (input sanitization) covers XSS/injection sanitization but not structured schema validation. This card provides the validation layer that ARCH-034's sanitization sits on top of.

## Directive

1. **Create validation schemas** — `src/lib/validation-schemas.ts`:
   ```
   icyMetaSchema:    { url: z.string().url().max(2048) }
   proxyStreamSchema: { url: z.string().url().max(2048) }
   artistInfoSchema: { artist: z.string().min(1).max(200).trim() }
   lyricsSchema:     { artist: z.string().min(1).max(300), title: z.string().min(1).max(300), duration: z.coerce.number().positive().optional() }
   concertsSchema:   { artist: z.string().min(1).max(200).trim() }
   itunesSchema:     { term: z.string().min(1).max(200), media: z.enum(['music','podcast']).optional() }
   ```

2. **Create validation helper** — `src/lib/validate-request.ts`:
   - Accept a Zod schema + `URLSearchParams`.
   - Return `{ success: true, data }` or `{ success: false, error: Response }`.
   - On failure, return 400 with `{ error: "Validation failed", details: zodErrors }`.
   - Consistent JSON error shape across all routes.

3. **Apply to all API routes**:
   - Replace manual validation in each `route.ts` with `validateRequest(schema, searchParams)`.
   - Preserve existing SSRF checks (those are separate from schema validation).
   - Keep timeout/abort logic unchanged.

4. **Add Zod as explicit dependency** if it's only transitive — `npm install zod`.

## Acceptance Criteria

- [ ] All 6 public API routes use Zod schema validation
- [ ] Consistent 400 error response shape across all routes
- [ ] Type coercion works (e.g., `duration` string → number)
- [ ] Max length enforced on all string inputs
- [ ] URL format validated on url-accepting routes
- [ ] Existing SSRF checks preserved (not replaced)
- [ ] No breaking changes to successful response format
