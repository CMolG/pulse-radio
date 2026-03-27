---
type: execution-order
generated_by: auto-architect
iteration: 17
total_cards: 133
---

# Pulse Radio Backlog — Execution Order

## Dependency Graph

18 blocking dependencies identified:

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
| ARCH-125 | ARCH-115 | Podcast UI requires podcast API routes |
| ARCH-126 | ARCH-116 | Audiobook UI requires audiobook API routes |
| ARCH-131 | ARCH-031 | CSP policy goes into the security headers middleware |
| ARCH-130 | ARCH-128 | Retry utility should use validated request types |

## Wave 1 — No Dependencies (112 cards, fully parallel)

### Critical (14)
ARCH-001, 002, 003, 004, 005, 017, 031, 032, 042, 060, 061, 073, 079, 101

### High (40)
ARCH-006, 007, 008, 009, 010, 018, 019, 024, 027, 033, 034, 035, 036,
043, 044, 050, 054, 062, 063, 066, 069, 074, 075, 080, 087, 088, 091,
092, 093, 098, 099, 102, 103, 107, 108, 110, 111, 127, 128, 129, 132

### Medium (54)
ARCH-011, 012, 013, 014, 015, 016, 020, 028, 037, 038, 039, 040, 041,
045, 046, 047, 048, 051, 052, 053, 055, 056, 057, 058, 064, 065, 067,
068, 070, 071, 072, 077, 078, 081, 082, 084, 089, 090, 094, 095,
096, 105, 106, 109, 113, 118, 119, 123, 124, 133

### Low (9)
ARCH-023, 025, 026, 030, 049, 059, 086, 120, 121, 122

## Wave 2 — Depends on Wave 1 (16 cards)

| Card | Priority | Blocked By |
|------|----------|------------|
| ARCH-083 | critical | ARCH-033 |
| ARCH-131 | critical | ARCH-031 |
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
| ARCH-130 | medium | ARCH-128 |

## Wave 3 — Depends on Wave 2 (2 cards)

| Card | Priority | Blocked By |
|------|----------|------------|
| ARCH-125 | high | ARCH-115 (podcast API) |
| ARCH-126 | high | ARCH-116 (audiobook API) |

## Iteration 17 Changes

- **ARCH-127** (NEW): Bundle analysis & tree-shaking audit — deduplicate icon libs, remove dead deps
- **ARCH-128** (NEW): Zod schema validation for all API routes — replace ad-hoc validation
- **ARCH-129** (NEW): Structured error reporting & classification — error pipeline with context
- **ARCH-130** (NEW): Unified timeout & retry policy — standardize fetch resilience (depends on ARCH-128)
- **ARCH-131** (NEW): CSP fine-tuning for audio streaming & external APIs (depends on ARCH-031)
- **ARCH-132** (NEW): Network resilience & reconnection handling — offline/online state management
- **ARCH-133** (NEW): Font loading optimization & FOUT prevention — display:swap + subsetting

## Recommended Execution Strategy

1. **Start Wave 1** with max parallelism across all available agents
2. **Critical path**: ARCH-001, ARCH-003, ARCH-024, ARCH-031, ARCH-033, ARCH-073, ARCH-075, ARCH-103, ARCH-128 (unblock Wave 2)
3. **Highest impact new cards**: ARCH-127 (bundle savings), ARCH-128 (API security), ARCH-131 (CSP), ARCH-132 (offline UX)
4. **Wave 2 auto-starts** as blocking cards complete
5. **Wave 3** (ARCH-125, ARCH-126) starts after respective Wave 2 APIs ship
6. **Estimated total**: 18-22 iteration cycles at full parallelism
