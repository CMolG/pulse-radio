---
task_id: ARCH-103
target_agent: auto-feature-engineer-finite
target_module: src/lib/db/
priority: high
status: completed
---

# ARCH-103: Implement Drizzle Schema Migrations

## Context

The project uses Drizzle ORM with `drizzle-kit` installed as a dev dependency, but **no migrations have been set up**. The schema is defined inline in `src/lib/db/schema.ts` and tables are created via `CREATE TABLE IF NOT EXISTS` on first access. This is fragile — any schema change (adding a column, renaming a table, adding an index) requires manually deleting the database or writing ad-hoc SQL. As the caching layer evolves (ARCH-074 proposes indexes, ARCH-073 proposes schema validation), a proper migration system is essential.

## Directive

1. **Generate initial migration snapshot**:
   - Run `npx drizzle-kit generate` to produce the initial migration from the existing schema.
   - Store migrations in `drizzle/` directory (already configured in `drizzle.config.ts`).

2. **Add migration runner**:
   - In `src/lib/db/index.ts`, after the database connection is established, call `drizzle.migrate()` (or the Drizzle equivalent for SQLite) to apply pending migrations.
   - This must run **before** any queries — add it to the singleton initialization.

3. **Add npm scripts**:
   - `"db:generate": "drizzle-kit generate"` — generate migration from schema changes
   - `"db:migrate": "drizzle-kit migrate"` — apply migrations
   - `"db:studio": "drizzle-kit studio"` — launch Drizzle Studio for inspection

4. **Remove `CREATE TABLE IF NOT EXISTS`** from the runtime code once migrations handle table creation.

5. **Document the workflow** in a comment at the top of `src/lib/db/index.ts`: "Schema changes → run `npm run db:generate` → commit migration → deploy."

## Acceptance Criteria

- [ ] `drizzle/` directory contains the initial migration SQL file
- [ ] Migrations run automatically on app startup
- [ ] `npm run db:generate` produces a new migration file when schema changes
- [ ] Removing the database file and restarting the app recreates all tables via migrations
- [ ] No `CREATE TABLE IF NOT EXISTS` in runtime code
- [ ] Database preserves existing data when a new migration is applied (non-destructive)
