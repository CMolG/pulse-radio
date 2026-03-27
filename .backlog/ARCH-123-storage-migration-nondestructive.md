---
task_id: ARCH-123
target_agent: auto-optimizer-finite
target_module: src/lib/storageUtils.ts
priority: medium
status: pending
---

# ARCH-123: Non-Destructive Storage Schema Migration

## Context

`storageUtils.ts` implements schema versioning (`STORAGE_SCHEMA_VERSION = '1'`), but when the version changes, it **deletes all managed localStorage keys** (lines 46-57). This means a schema version bump from `'1'` to `'2'` instantly destroys:

- All favorite stations
- All favorite songs
- Play history (up to 100 entries)
- EQ presets and audio settings
- Language preference
- Volume level
- Onboarding state

For a user who has curated their favorites over months, this is a devastating data loss event. The migration should transform data, not nuke it.

## Directive

1. **Implement a migration registry**:
   ```typescript
   type MigrationFn = (key: string, rawValue: string) => string;

   const MIGRATIONS: Record<string, MigrationFn[]> = {
     '1→2': [
       // Example: rename a field in favorites
       (key, raw) => {
         if (key !== 'radio-favorites') return raw;
         const parsed = JSON.parse(raw);
         return JSON.stringify(parsed.map((s: any) => ({ ...s, uuid: s.id ?? s.uuid })));
       },
     ],
   };
   ```

2. **Sequential migration application**:
   - On startup, read `STORAGE_SCHEMA_VERSION` from localStorage.
   - If it differs from the code's expected version, apply all intermediate migrations in order (e.g., `1→2`, then `2→3` if needed).
   - For each managed key, run the migration functions in sequence.
   - After all migrations succeed, update the stored schema version.

3. **Rollback safety**:
   - Before applying migrations, snapshot all managed keys into a temporary backup key (`radio-migration-backup`).
   - If any migration function throws, restore from the backup and leave the schema version unchanged.
   - Delete the backup key after successful migration.

4. **No-op migrations**: If a version bump doesn't affect a particular key's format, the migration function for that key is a no-op (return `raw` unchanged). This is preferable to skipping — it documents that the key was considered.

5. **Logging**: Log each migration step: `[Pulse Radio] Migrating storage from v1 → v2: key "radio-favorites" migrated successfully`.

## Acceptance Criteria

- [ ] Schema version bump does NOT delete user data
- [ ] Migration functions transform data in-place
- [ ] Sequential migrations apply (v1→v2→v3 if applicable)
- [ ] Failed migrations roll back from backup
- [ ] Backup key is cleaned up after success
- [ ] Migration is logged for debugging
- [ ] Existing data survives a version bump (manual test: set data, bump version, reload, verify data intact)
