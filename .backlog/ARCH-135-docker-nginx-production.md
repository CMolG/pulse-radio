---
task_id: ARCH-135
target_agent: auto-feature-engineer-finite
target_module: Dockerfile
priority: medium
status: pending
---

# ARCH-135: Docker & Reverse Proxy Production Configuration

## Context

The app runs on a VPS via PM2 (ARCH-084 will formalize that), but there's no containerization and no reverse proxy configuration template. Deployment is ad-hoc — no reproducible build, no port management, no SSL termination config documented.

For teams deploying Pulse Radio, a Docker image + nginx config template significantly reduces setup friction.

## Directive

1. **Dockerfile** — Create a multi-stage production Dockerfile:
   - Stage 1 (`deps`): Install dependencies with `npm ci --omit=dev`.
   - Stage 2 (`build`): Run `next build` with standalone output.
   - Stage 3 (`runner`): Alpine-based, copy standalone output + `public/` + `static/`.
   - Non-root user (`nextjs:nodejs`).
   - Expose port 3000.
   - Health check: `curl -f http://localhost:3000/ || exit 1`.
   - Labels: maintainer, version, description.

2. **docker-compose.yml** — Production stack:
   - `app` service: builds from Dockerfile, maps port 3000.
   - Volume mount for `.data/` (SQLite persistence).
   - Environment variables from `.env` file.
   - Restart policy: `unless-stopped`.
   - Memory limit: 512MB.

3. **nginx config template** — Create `deploy/nginx.conf`:
   - Reverse proxy to `localhost:3000`.
   - SSL termination with Let's Encrypt (certbot paths).
   - Gzip compression for text/JS/CSS/JSON.
   - Proxy WebSocket upgrade headers (for future SSE/WebSocket features).
   - Static asset caching: `Cache-Control: public, max-age=31536000, immutable` for `/_next/static/`.
   - Rate limiting zone: 10 req/s per IP with burst 20.
   - Security headers (complement ARCH-031 for nginx layer).

4. **.dockerignore** — Exclude `node_modules/`, `.git/`, `test-results/`, `.data/`.

5. **Documentation** — Add deployment section to README or create `deploy/README.md`.

## Acceptance Criteria

- [ ] `docker build -t pulse-radio .` succeeds
- [ ] `docker-compose up` starts the app on port 3000
- [ ] SQLite data persists across container restarts (volume mount)
- [ ] nginx config serves the app over HTTPS
- [ ] Static assets cached with immutable headers
- [ ] Container runs as non-root user
- [ ] Health check endpoint responds
