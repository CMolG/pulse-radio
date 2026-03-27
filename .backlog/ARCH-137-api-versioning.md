---
task_id: ARCH-137
target_agent: auto-optimizer-finite
target_module: src/app/api
priority: low
status: pending
---

# ARCH-137: API Route Versioning Strategy

## Context

All 7 API routes are unversioned (`/api/itunes`, not `/api/v1/itunes`). Response shapes have no version indicator. If a response schema changes, clients break immediately with no migration path.

Currently the API serves only the internal web app (no public API consumers), so this is preventative. However, as podcast (ARCH-115) and audiobook (ARCH-116) routes are added, the API surface grows and versioning becomes important for stability.

## Directive

1. **Version prefix** — Move all existing routes under `/api/v1/`:
   - `/api/v1/icy-meta`, `/api/v1/proxy-stream`, `/api/v1/itunes`, etc.
   - Keep `/api/cron/sync` unversioned (internal tooling, not user-facing).

2. **Redirect layer** — Add redirects from old paths to v1:
   - `/api/itunes` → `/api/v1/itunes` (301 permanent redirect).
   - Temporary: keep old paths working for 1 release cycle.

3. **Response envelope** — Add version to all API responses:
   ```json
   { "v": 1, "data": { ... } }
   ```
   Or use `X-API-Version: 1` response header (lighter weight).

4. **Deprecation process** — Document in `deploy/API-VERSIONING.md`:
   - How to deprecate an endpoint version.
   - Sunset header: `Sunset: <date>` on deprecated endpoints.
   - Migration guide template.

5. **Client update** — Update all client-side fetch calls to use `/api/v1/` paths.

## Acceptance Criteria

- [ ] All public API routes accessible under `/api/v1/`
- [ ] Old paths redirect to v1 (301)
- [ ] API version indicated in response (header or envelope)
- [ ] Deprecation process documented
- [ ] Client-side fetches updated to v1 paths
- [ ] No breaking changes to existing functionality
