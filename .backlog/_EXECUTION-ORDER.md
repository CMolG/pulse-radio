---
type: execution-order
generated_by: auto-architect
iteration: 14
total_cards: 120
---

# Pulse Radio Backlog — Execution Order

## Dependency Graph

14 blocking dependencies identified:

| Card | Depends On | Reason |
|------|-----------|--------|
| ARCH-021 | ARCH-024 | Uses extracted SSRF utility |
| ARCH-022 | ARCH-001 | Targets BrowseView (must exist first) |
| ARCH-029 | ARCH-001, ARCH-006 | Shared primitives from extracted views |
| ARCH-076 | ARCH-073 | Reuses Zod from cache validation |
| ARCH-083 | ARCH-033 | Needs health endpoint for deploy verification |
| ARCH-085 | ARCH-075 | Uses structured logging infrastructure |
| ARCH-097 | ARCH-075 | Replaces console.error with logger |
| ARCH-100 | ARCH-001 | Search bar lives in BrowseView (must be extracted first) |
| ARCH-104 | ARCH-031 | SSE endpoint needs security headers middleware |
| ARCH-112 | ARCH-003 | Stats dashboard uses extracted stats view pattern |
| ARCH-114 | ARCH-103 | Health table requires Drizzle migrations for schema changes |
| ARCH-115 | ARCH-024 | Podcast feed fetcher needs SSRF validation utility |
| ARCH-116 | ARCH-024 | Audiobook API routes need SSRF validation utility |
| ARCH-117 | ARCH-100 | Deep-linkable URLs build on station search resolution |

## Wave 1 — No Dependencies (106 cards, fully parallel)

### Critical (14)
ARCH-001, 002, 003, 004, 005, 017, 031, 032, 042, 060, 061, 073, 079, 101

### High (34)
ARCH-006, 007, 008, 009, 010, 018, 019, 024, 027, 033, 034, 035, 036,
043, 044, 050, 054, 062, 063, 066, 069, 074, 075, 080, 087, 088, 092,
093, 098, 099, 102, 103, 107, 108, 110, 111

### Medium (51)
ARCH-011, 012, 013, 014, 015, 016, 020, 028, 037, 038, 039, 040, 041,
045, 046, 047, 048, 051, 052, 053, 055, 056, 057, 058, 064, 065, 067,
068, 070, 071, 072, 077, 078, 081, 082, 084, 089, 090, 091, 094, 095,
096, 105, 106, 109, 113, 118, 119

### Low (7)
ARCH-023, 025, 026, 030, 049, 059, 086, 120

## Wave 2 — Depends on Wave 1 (14 cards)

| Card | Priority | Blocked By |
|------|----------|------------|
| ARCH-083 | critical | ARCH-033 |
| ARCH-076 | high | ARCH-073 |
| ARCH-100 | high | ARCH-001 |
| ARCH-115 | high | ARCH-024 |
| ARCH-116 | high | ARCH-024 |
| ARCH-021 | medium | ARCH-024 |
| ARCH-022 | medium | ARCH-001 |
| ARCH-029 | medium | ARCH-001, ARCH-006 |
| ARCH-085 | medium | ARCH-075 |
| ARCH-097 | medium | ARCH-075 |
| ARCH-104 | medium | ARCH-031 |
| ARCH-112 | medium | ARCH-003 |
| ARCH-114 | medium | ARCH-103 |
| ARCH-117 | medium | ARCH-100 |

## Recommended Execution Strategy

1. **Start Wave 1** with max parallelism across all available agents
2. **Critical path**: ARCH-001, ARCH-003, ARCH-024, ARCH-031, ARCH-033, ARCH-073, ARCH-075, ARCH-103 (unblock Wave 2)
3. **Highest impact new cards**: ARCH-101 (iOS audio), ARCH-115/116 (podcast+audiobook — features falsely claimed in README)
4. **Wave 2 auto-starts** as blocking cards complete
5. **Estimated total**: 16-20 iteration cycles at full parallelism
