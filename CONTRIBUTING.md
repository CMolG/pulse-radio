# Contributing to Pulse Radio

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/CMolG/pulse-radio.git
cd pulse-radio
npm install
cp .env.example .env.local   # See .env.example for variable docs
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Development Workflow

1. **Fork** the repository and create a feature branch
2. Make your changes
3. Write/update tests (Playwright for UI, Vitest for utilities)
4. Verify the build: `npm run build`
5. Run tests: `npx playwright test --project=mobile-chrome`
6. Run unit tests: `npm run test:unit`
7. Open a pull request against `main`

## Testing Requirements

- All Playwright E2E tests must pass before merge
- UI changes **must** be verified in mobile viewport (390×844)
- New features should include Playwright tests in `tests/`
- Utility/library code should include Vitest tests in `src/lib/__tests__/`

### Running Tests

```bash
# E2E tests (requires built app)
npm run build
npx next start &
npx playwright test --project=mobile-chrome

# Unit tests
npm run test:unit

# Watch mode
npm run test:unit:watch
```

## Code Style

- **TypeScript** strict mode — avoid `any` when possible
- **Tailwind CSS** for styling (no inline styles, no CSS modules)
- **Prettier** formats code on commit (see `.prettierrc`)
- **ESLint** catches issues (`npm run lint`)
- Pre-commit hooks run both automatically via Husky

### Key Conventions

- Single quotes, semicolons, trailing commas
- Touch targets ≥ 44px for mobile buttons
- Glass/blur effects use `rgba()` with alpha < 0.8
- No absolute-positioned popups inside scroll containers

## Architecture Overview

Pulse Radio is a single-page PWA for internet radio streaming.

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # Server-side API routes (proxy, iTunes, lyrics, etc.)
│   └── [countryCode]/    # Dynamic SSG country pages
├── components/radio/     # Main UI components
│   ├── RadioShell.tsx     # Central component (extraction in progress)
│   └── constants.ts      # Types, constants, configuration
├── hooks/                # React hooks (filters, timers, keyboard, etc.)
├── lib/                  # Utilities (cache, logging, validation, etc.)
│   ├── db/               # Drizzle ORM + SQLite schema
│   ├── i18n/             # Internationalization (17 languages)
│   └── services/         # Cache repository, server cache
├── context/              # React contexts (locale, theme)
└── public/               # Static assets, service worker, manifest
```

### Data Flow

1. **3-tier cache**: Memory (LRU) → SQLite → External API
2. **API routes** proxy external services (Radio Browser, iTunes, LrcLib)
3. **Client** fetches from local API routes (CSP-compliant)

## Agentic Workflow

This project uses AI agents for automated development:

- **`.backlog/`** contains Agentic Cards — structured task specifications
- **`AGENTS.md`** defines agent roles and capabilities
- **`flows/`** contains execution flow definitions

Cards follow a lifecycle: `pending` → `in_progress` → `completed`. Agents pick cards based on priority and dependency ordering defined in `.backlog/_EXECUTION-ORDER.md`.

Human contributors can create cards, modify them, or implement them directly. The system is designed for human-AI collaboration.

## Questions?

Open an issue or check existing cards in `.backlog/` for context on ongoing work.
