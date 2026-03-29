<!--
     Copyright (c) 2026 Carlos Molina Galindo.
     Open source project: Pulse Radio.
     Created by Carlos Molina Galindo (CMolG on GitHub).
-->

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" alt="Apache 2.0 License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

# 📻 Pulse Radio

> A modern, feature-rich internet radio player built with Next.js 16 and React 19. Stream 40,000+ stations with real-time lyrics, audio visualizers, a 5-band equalizer, podcast support, and audiobooks — all in your browser.

<p align="center">
  <strong>
    <a href="#-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-contributing">Contributing</a> •
    <a href="#-roadmap">Roadmap</a>
  </strong>
</p>

---

## ✨ Features

### 🎵 Core Playback
- **40,000+ stations** from [Radio Browser API](https://www.radio-browser.info/) — browse by genre, country, trending, or local
- **ICY metadata extraction** — real-time "Now Playing" track info from stream headers
- **Station queue** — queue up stations and move between them seamlessly
- **Stall recovery** — automatic retry logic when streams buffer or drop
- **Media Session API** — OS-level controls (lock screen, headphone buttons, media keys)
- **Wake Lock** — prevents screen from sleeping during playback
- **Sleep timer** — auto-stop playback after a configurable duration

### 🎨 Visual Experience
- **Album artwork** — automatic lookup via iTunes Search API with strict Jaro-distance matching and graceful fallback
- **Audio visualizers** — ferrofluid, spiral, and circular renderers using Web Audio FFT analysis
- **Audio-reactive background** — dynamic background that pulses with the music (works with or without audio effects enabled — uses a synthesized ambient pulse as fallback)
- **Theater mode** — immersive full-screen playback with parallax album art background
- **Concert ticker** — animated scrolling banner showing upcoming Bandsintown shows in theater mode
- **Liquid Glass UI** — Aerolab-inspired liquid glass buttons with SVG distortion filter, specular lighting, and frosted tint layers on play controls and language selector
- **Glassmorphism UI** — macOS-inspired dark theme with frosted glass surfaces

### 🎛️ Audio Control
- **5-band parametric equalizer** — Low (60Hz), Lo-Mid (230Hz), Mid (910Hz), Hi-Mid (3.6kHz), High (14kHz)
- **8 built-in presets** — Flat, Bass Boost, Treble, V-Shape, Vocal, Rock, Electronic, Acoustic
- **Custom presets** — save and name your own EQ configurations
- **Persistent EQ preset** — selected preset name persists across sessions
- **Seamless effects toggle** — enable/disable audio enhancements without stream interruption (always-proxy architecture)
- **Volume control** with mute toggle

### 📝 Lyrics
- **Synced lyrics** (LRC format) with auto-scrolling and highlighted current line
- **Plain text lyrics** fallback when synced version unavailable
- **Realtime STT lyrics sync** — on-device speech recognition aligns lyrics in real time when timestamps are unavailable
- **Local caching** for instant re-display on revisit
- Powered by [LrcLib API](https://lrclib.net/)

### 🌍 Internationalization
- **Multi-language UI** — locale-aware routing via `[countryCode]` segments
- **Language selector** — switch UI language in-app
- **Country-based defaults** — auto-detects preferred stations and language from locale

### 📚 Library Management
- **Favorites** — star stations for quick access
- **Favorite songs** — bookmark tracks you love
- **Recent stations** — last 15 played stations
- **Play history** — up to 100 entries with artist, track, and artwork
- **Artist detail modal** — view artist biography, upcoming Bandsintown concerts, and lyrics from history/favorites
- **Social share** — share current station or track via Web Share API (or clipboard fallback) from cards, detail modals, theater mode, and the now-playing bar
- **Uniform card layout** — all cards share the same height with station name anchored at the bottom
- **Group by artist/album** — horizontal scrollable thumbnail row for grouped tracks

### 📱 Responsive Design
- Adapts from desktop (sidebar + main) to tablet and mobile layouts
- Touch-friendly controls throughout
- **Mobile lyrics reel** — swipeable lyrics experience on small screens
- **Single-row genre/country chips** — horizontally scrollable with a dropdown to access all genres and countries
- **Desktop stats modal** — floating centered dialog instead of bottom sheet on desktop viewports
- **Dev API console** — in-browser scrollable log of all ICY, iTunes, Lyrics, and Bandsintown API requests (development mode only, visible in theater mode)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/CMolG/pulse-radio.git
cd pulse-radio

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start listening.

### Production Build

```bash
npm run build
npm start
```

### Environment Setup

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (prod) | Secures `/api/cron/sync` endpoint. Generate with `openssl rand -hex 32` |
| `BANDSINTOWN_APP_ID` | No | Bandsintown API key for concert data. Falls back to demo key |
| `NODE_ENV` | Auto | Set by Next.js (`development` / `production` / `test`) |

## 🏗️ Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── [countryCode]/            # Locale-aware routing
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── head.tsx
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── proxy-stream/         # CORS proxy for audio streams
│   │   ├── icy-meta/             # ICY metadata extraction endpoint
│   │   ├── itunes/               # Album artwork lookup proxy
│   │   ├── artist-info/          # Artist biography/info proxy
│   │   ├── concerts/             # Bandsintown concert data proxy
│   │   ├── lyrics/               # Lyrics fetching endpoint
│   │   ├── health/               # Health check endpoint
│   │   ├── analytics/            # Analytics endpoint
│   │   ├── cron/                 # Scheduled sync jobs
│   │   └── station-health/       # Station reliability scoring
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Home page → <Radio />
│   ├── sitemap.ts                # Dynamic sitemap generation
│   ├── ServiceWorkerRegistrar.tsx
│   └── globals.css               # Tailwind + theme variables
│
├── components/radio/             # Main radio player
│   ├── RadioShell.tsx            # Top-level container & layout
│   ├── components/               # UI subcomponents
│   │   ├── StationCard.tsx       # Station list item
│   │   ├── NowPlayingBar.tsx     # Bottom playback bar
│   │   ├── NowPlayingHero.tsx    # Main "now playing" display
│   │   ├── BrowseView.tsx        # Genre/country browser
│   │   ├── EqPanel.tsx           # Equalizer interface
│   │   ├── LyricsPanel.tsx       # Lyrics display
│   │   ├── MobileLyricsReel.tsx  # Mobile lyrics experience
│   │   ├── LanguageSelector.tsx  # UI language switcher
│   │   ├── KeyboardShortcutsHelp.tsx
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── TheaterView.tsx       # Full-screen theater mode
│   ├── hooks/                    # Custom React hooks
│   │   ├── useRadio.ts           # Core playback engine
│   │   ├── useEqualizer.ts       # Web Audio API EQ chain
│   │   ├── useStationMeta.ts     # ICY metadata polling
│   │   ├── useLyrics.ts          # Lyrics fetching & caching
│   │   ├── useRealtimeLyricsSync.ts  # STT-based realtime lyrics sync
│   │   ├── useFavorites.ts       # Favorite stations (localStorage)
│   │   ├── useFavoriteSongs.ts   # Favorite songs (localStorage)
│   │   ├── useRecent.ts          # Recent stations
│   │   ├── useHistory.ts         # Play history tracker
│   │   ├── useMediaSession.ts    # Browser media session
│   │   ├── useStationQueue.ts    # Station queue management
│   │   ├── useSleepTimer.ts      # Auto-stop sleep timer
│   │   ├── useWakeLock.ts        # Screen wake lock
│   │   ├── usePlaybackPosition.ts
│   │   ├── useArtistInfo.ts      # Artist biography lookup
│   │   ├── useAudioReactiveBackground.ts
│   │   └── useParallaxBg.ts
│   ├── services/                 # External API clients
│   │   ├── radioApi.ts           # Radio Browser API
│   │   ├── lyricsApi.ts          # LrcLib API
│   │   ├── lyricsAligner.ts      # Incremental lyrics alignment
│   │   ├── realtimeSpeechRecognition.ts  # STT engine wrapper
│   │   ├── realtimeLyricsTypes.ts
│   │   ├── archiveApi.ts         # Internet Archive API
│   │   ├── librivoxApi.ts        # LibriVox API
│   │   └── podcastApi.ts         # Podcast RSS parsing
│   ├── types.ts                  # TypeScript type definitions
│   ├── constants.ts              # Genres, EQ presets, storage keys
│   ├── lrcParser.ts              # LRC lyrics format parser
│   └── lyricsUtils.ts            # Lyrics utility functions
│
├── context/
│   └── LocaleContext.tsx         # i18n locale provider
│
└── lib/                          # Shared utilities
    ├── audio-visualizer/         # Canvas-based visualizations
    │   ├── useAudioAnalyser.ts   # FFT frequency analysis hook
    │   ├── useAlbumArt.ts        # iTunes artwork with Jaro-distance matching
    │   ├── FerrofluidRenderer.tsx
    │   ├── SpiralRenderer.tsx
    │   └── CircularRenderer.tsx
    ├── i18n/                     # Internationalization
    │   ├── locales.ts            # Supported locales
    │   ├── messages.ts           # Translation strings
    │   ├── countries.ts          # Country metadata
    │   ├── countryChips.ts       # Country filter chips
    │   ├── countryDefaults.ts    # Per-country defaults
    │   ├── languageMap.ts        # Language → locale mapping
    │   └── localeStorage.ts      # Locale persistence
    ├── playbackStore.ts          # Zustand global state
    └── storageUtils.ts           # localStorage helpers
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 with React 19 & React Compiler |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Animation | Motion (Framer Motion) 12 |
| Audio | Web Audio API (biquad filters, FFT analysis) |
| Speech | Web Speech API (SpeechRecognition) |
| Icons | Lucide React |

### External APIs

| API | Purpose |
|-----|---------|
| [Radio Browser](https://www.radio-browser.info/) | Station discovery (40K+ stations) |
| [LrcLib](https://lrclib.net/) | Synced & plain text lyrics |
| [iTunes Search](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | Album artwork lookup |
| [Bandsintown](https://www.bandsintown.com/) | Upcoming concert/tour dates |

## 🤝 Contributing

We welcome contributions of all kinds! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide covering setup, testing, code style, and architecture.

### Quick Start

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Make** your changes
4. **Test** locally: `npm run build && npx playwright test --project=mobile-chrome`
5. **Lint**: `npm run lint`
6. **Commit** with a descriptive message: `git commit -m "feat: add sleep timer"`
7. **Push** to your fork: `git push origin feat/my-feature`
8. **Open** a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no code change
refactor: Code change that neither fixes a bug nor adds a feature
perf:     Performance improvement
test:     Adding or updating tests
chore:    Build process or tooling changes
```

### Good First Issues

Look for issues labeled [`good first issue`](../../labels/good%20first%20issue) — these are beginner-friendly tasks that are a great starting point.

### Development Tips

- The CORS proxy (`/api/proxy-stream`) is required because browsers block cross-origin audio streams for Web Audio API analysis
- ICY metadata is extracted server-side since browsers can't read ICY headers directly
- The equalizer uses a chain of `BiquadFilterNode`s in a Web Audio graph
- Lyrics are cached in `localStorage` to avoid redundant API calls
- The realtime STT engine resets its restart counter on every successful recognition result; `MAX_RESTARTS` means consecutive failures, not total restarts

## 🗺️ Roadmap

- [x] Sleep timer
- [x] Keyboard shortcuts
- [x] i18n / localization
- [x] Realtime STT lyrics sync
- [x] Station queue
- [x] Bandsintown concert integration (theater mode ticker + artist detail modal)
- [x] Audio-reactive background (with analyser fallback)
- [x] Persistent EQ preset selection
- [x] Always-proxy audio pipeline (no stream interruptions)
- [x] Liquid Glass UI (Aerolab-style buttons)
- [x] Social share (Web Share API + clipboard fallback)
- [x] Dev API console (development mode)
- [ ] Podcast support (search & RSS playback)
- [ ] Audiobook support (LibriVox + Internet Archive)
- [ ] Station search with fuzzy matching
- [ ] Chromecast / AirPlay support
- [ ] Shared playlists

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ and way too many radio stations</sub>
</p>
