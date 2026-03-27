---
task_id: ARCH-048
target_agent: auto-reducer-finite
target_module: README.md
priority: medium
status: completed
---

# Remove Unimplemented Podcast & Audiobook Claims from README

## Context

The README.md claims several features that do not exist in the codebase:

1. **"Podcast support"** — The README says "Podcast search & playback — browse and stream podcasts via RSS feeds". In reality, the only podcast-related code is a `media=podcast` query parameter in the iTunes API route. There is:
   - No podcast search UI
   - No RSS feed parsing
   - No episode listing
   - No podcast playback controls
   - No progress tracking

2. **"LibriVox audiobooks"** — The README claims "free public domain audiobooks". There is zero audiobook code, no LibriVox API integration, and no audiobook UI.

3. **"Internet Archive audio"** — Referenced as a data source but not integrated.

4. **"Open Library metadata"** — Referenced but not integrated.

These claims misrepresent the project's capabilities and could mislead contributors or users.

## Directive

1. **Remove or qualify podcast/audiobook claims**: 
   - Remove "Podcast search & playback" from the feature list.
   - Remove "LibriVox audiobooks" from the feature list.
   - Remove "Internet Archive" and "Open Library" from the external APIs list.
   - Optionally, move these to a "Planned Features" or "Roadmap" section with a clear "not yet implemented" qualifier.

2. **Keep accurate claims**:
   - iTunes Search API integration is real (for music artwork matching) — keep that.
   - Radio Browser API is real — keep that.

3. **Audit other README claims**: Verify that every feature listed in the README actually exists in code. Flag any other discrepancies.

**Boundaries:**
- Do NOT add features or code — only fix documentation accuracy.
- Do NOT rewrite the entire README — make surgical edits to remove/qualify false claims.
- Preserve the README's existing structure and formatting.

## Acceptance Criteria

- [ ] No README feature claims for unimplemented functionality.
- [ ] Podcast/audiobook features moved to "Roadmap" or removed entirely.
- [ ] External API list only includes actually-integrated services.
- [ ] All remaining feature claims verified against actual code.
- [ ] README remains well-formatted and readable.
