---
task_id: ARCH-134
target_agent: auto-feature-engineer-finite
target_module: src/app/api/auth/route.ts
priority: medium
status: completed
---

# ARCH-134: Optional User Authentication & Favorites Cloud Sync

## Context

All user data (favorites, EQ presets, play history, settings) is stored exclusively in localStorage. If a user clears browser data or switches devices, everything is lost. ARCH-054 addresses this with JSON export/import, but that requires manual action.

Currently there are no user accounts, no session management, and no authentication beyond the CRON_SECRET on the cron sync endpoint. The app is designed as a zero-auth anonymous experience.

This card adds **optional** lightweight authentication so users who want cross-device sync can create an account, while anonymous usage remains the default.

## Directive

1. **Auth strategy** — Passwordless magic-link email authentication:
   - No passwords to manage or leak.
   - Send a login link via email (use Resend, Nodemailer, or similar).
   - Token stored in httpOnly cookie (not localStorage).
   - Session TTL: 30 days with sliding window.

2. **User model** — Add to SQLite schema (`src/lib/db/schema.ts`):
   - `users` table: `id` (UUID), `email` (unique), `created_at`.
   - `user_data` table: `user_id` (FK), `key` (string), `value` (JSON), `updated_at`.
   - Keys: `favorites`, `eq_presets`, `settings`, `play_history`.

3. **Sync API routes**:
   - `POST /api/auth/login` — Send magic link email.
   - `GET /api/auth/verify` — Verify magic link token, set session cookie.
   - `POST /api/auth/logout` — Clear session cookie.
   - `GET /api/sync/pull` — Fetch user data from server.
   - `POST /api/sync/push` — Upload user data to server.

4. **Client-side sync**:
   - On login: merge server data with local data (server wins on conflict by timestamp).
   - On change: debounced push (5s after last change, max 1 push/minute).
   - On load: pull if authenticated, merge with localStorage.
   - Offline: queue pushes, replay on reconnection (integrates with ARCH-132).

5. **Privacy**:
   - No tracking — auth is opt-in only.
   - Data deletion: "Delete my account" button removes all server data.
   - No third-party OAuth (avoids sharing user data with Google/GitHub).

6. **Migration**: ARCH-103 (Drizzle migrations) should be completed first to manage schema changes.

## Acceptance Criteria

- [ ] Magic-link login flow works end-to-end
- [ ] User data syncs between devices
- [ ] Merge logic handles conflicts (server timestamp wins)
- [ ] Anonymous usage works unchanged (no auth required)
- [ ] "Delete account" removes all server-side data
- [ ] Session cookie is httpOnly + Secure + SameSite=Lax
- [ ] Rate limit on login endpoint (max 5 emails/hour per address)
