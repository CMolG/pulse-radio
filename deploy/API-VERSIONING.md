# API Versioning Strategy

## Overview

This document describes the API versioning strategy for Pulse Radio. All public-facing API endpoints are versioned to support backward compatibility and enable deprecation of older API versions.

## Version Indicators

Each API response includes a version header to help clients identify the API version:

```
X-API-Version: 1
```

## Current Routes

All public routes are accessible under `/api/v1/`:

- `/api/v1/analytics` — Event analytics tracking
- `/api/v1/artist-info` — Artist biographical information
- `/api/v1/concerts` — Upcoming concerts for an artist
- `/api/v1/health` — Health check endpoint
- `/api/v1/icy-meta` — ICY stream metadata extraction
- `/api/v1/icy-meta-stream` — ICY stream metadata with streaming
- `/api/v1/itunes` — iTunes search
- `/api/v1/itunes/lookup` — iTunes lookup by ID
- `/api/v1/lyrics` — Song lyrics search
- `/api/v1/now-playing` — Current now-playing data
- `/api/v1/now-playing/trending` — Trending now-playing data
- `/api/v1/proxy-stream` — Proxy stream requests
- `/api/v1/station-health` — Station health scoring

**Internal routes (not versioned):**
- `/api/cron/sync` — Internal cron job endpoint
- `/api/csp-report` — CSP violation reporting

## Legacy API Paths

Old API paths (without `/v1/`) are permanently redirected (301) to their v1 equivalents:

```
/api/itunes → /api/v1/itunes
/api/lyrics → /api/v1/lyrics
[... etc]
```

This ensures clients using the old paths continue to work, with the browser or HTTP client automatically following the redirect.

## Deprecation Process

### Timeline

1. **New Version Released**: Announce the new API version and deprecation date for the old version.
2. **Sunset Header**: Deprecated endpoints include a `Sunset` header with the planned removal date:
   ```
   Sunset: Sun, 15 Dec 2025 23:59:59 GMT
   ```
3. **Documentation**: Migration guides are published in this document and communicated to clients.
4. **Removal**: After the sunset date, the deprecated endpoint is removed and returns a 404 or 410 (Gone).

### Example: Deprecating `/api/v1/itunes`

If we introduce a new `/api/v2/` version and want to deprecate v1:

1. Update the route handler to include the sunset header:
   ```typescript
   response.headers.set('Sunset', 'Sun, 15 Dec 2025 23:59:59 GMT');
   response.headers.set('Deprecation', 'true');
   ```

2. Document the migration in this file.

3. On the sunset date, either remove the route or replace it with a 410 (Gone) response.

## Response Format

All versioned API responses include the `X-API-Version` header. The response body format remains unchanged to maintain backward compatibility:

```json
{
  "status": "ok",
  "data": { /* endpoint-specific data */ }
}
```

## Backward Compatibility

- **Version Header**: Always included to allow clients to detect API version.
- **Redirect Chains**: Avoid creating redirect chains (old → old → v1). Always redirect directly to v1.
- **Query Parameters**: Query parameters are preserved during redirects.
- **Request Headers**: All request headers are honored (e.g., `Content-Type`, `Authorization`).

## Future Versions

When introducing a new major API version (e.g., `/api/v2/`):

1. Create a new version directory with the new routes.
2. Add version headers to responses.
3. Document the breaking changes in a migration guide.
4. Keep v1 running for at least one release cycle, with a clear sunset date.
5. Update this document with the new version information.

## Client Integration

### Updated to v1

All client-side code has been updated to use `/api/v1/` paths. For new integrations, always use the versioned paths.

### Migration From Unversioned Paths

If you have legacy code using unversioned paths:

```typescript
// ❌ Old (still works via redirect)
fetch('/api/itunes?term=Beatles')

// ✅ New (recommended)
fetch('/api/v1/itunes?term=Beatles')
```

The old paths will continue to work with 301 redirects, but it's recommended to update your code to use the v1 paths directly for better performance.

## Monitoring

- **Response Headers**: All responses include `X-API-Version` for monitoring and analytics.
- **Redirect Usage**: Monitor 301 redirects to identify clients using legacy paths.
- **Error Rates**: Track 404/410 responses to identify clients using removed endpoints.
