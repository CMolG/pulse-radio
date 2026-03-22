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

> A modern, feature-rich internet radio player built with Next.js 16 and React 19. Stream 40,000+ stations with real-time lyrics, audio visualizers, and a 5-band equalizer — all in your browser.

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
- **Stall recovery** — automatic retry logic when streams buffer or drop
- **Media Session API** — OS-level controls (lock screen, headphone buttons, media keys)

### 🎨 Visual Experience
- **Album artwork** — automatic lookup via iTunes Search API
- **Audio visualizers** — ferrofluid, spiral, and circular renderers using Web Audio FFT analysis
- **Theater mode** — immersive full-screen playback with parallax album art background
- **Glassmorphism UI** — macOS-inspired dark theme with frosted glass surfaces

### 🎛️ Audio Control
- **5-band parametric equalizer** — Low (60Hz), Lo-Mid (230Hz), Mid (910Hz), Hi-Mid (3.6kHz), High (14kHz)
- **8 built-in presets** — Flat, Bass Boost, Treble, V-Shape, Vocal, Rock, Electronic, Acoustic
- **Custom presets** — save and name your own EQ configurations
- **Volume control** with mute toggle

### 📝 Lyrics
- **Synced lyrics** (LRC format) with auto-scrolling and highlighted current line
- **Plain text lyrics** fallback when synced version unavailable
- **Local caching** for instant re-display on revisit
- Powered by [LrcLib API](https://lrclib.net/)

### 📚 Library Management
- **Favorites** — star stations for quick access
- **Recent stations** — last 15 played stations
- **Play history** — up to 100 entries with artist, track, and artwork

### 📱 Responsive Design
- Adapts from desktop (sidebar + main) to tablet and mobile layouts
- Touch-friendly controls throughout

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

## 🏗️ Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── proxy-stream/         # CORS proxy for audio streams
│   │   ├── icy-meta/             # ICY metadata extraction endpoint
│   │   └── itunes/               # Album artwork lookup proxy
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Home page → <Radio />
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
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── TheaterView.tsx       # Full-screen theater mode
│   ├── hooks/                    # Custom React hooks
│   │   ├── useRadio.ts           # Core playback engine
│   │   ├── useEqualizer.ts       # Web Audio API EQ chain
│   │   ├── useStationMeta.ts     # ICY metadata polling
│   │   ├── useLyrics.ts          # Lyrics fetching & caching
│   │   ├── useFavorites.ts       # Favorite stations (localStorage)
│   │   ├── useRecent.ts          # Recent stations
│   │   ├── useHistory.ts         # Play history tracker
│   │   └── useMediaSession.ts    # Browser media session
│   ├── services/                 # External API clients
│   │   ├── radioApi.ts           # Radio Browser API
│   │   ├── lyricsApi.ts          # LrcLib API
│   │   └── genreApi.ts           # Genre description API
│   ├── types.ts                  # TypeScript type definitions
│   ├── constants.ts              # Genres, EQ presets, storage keys
│   └── lrcParser.ts              # LRC lyrics format parser
│
└── lib/                          # Shared utilities
    ├── audio-visualizer/         # Canvas-based visualizations
    │   ├── useAudioAnalyser.ts   # FFT frequency analysis hook
    │   ├── FerrofluidRenderer.tsx
    │   ├── SpiralRenderer.tsx
    │   └── CircularRenderer.tsx
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
| Icons | Lucide React |

### External APIs

| API | Purpose |
|-----|---------|
| [Radio Browser](https://www.radio-browser.info/) | Station discovery (40K+ stations) |
| [LrcLib](https://lrclib.net/) | Synced & plain text lyrics |
| [iTunes Search](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | Album artwork lookup |
| [BinaryJazz](https://binaryjazz.us/genrenator-api/) | Random genre descriptions |

## 🤝 Contributing

We welcome contributions of all kinds! Whether it's a bug fix, new feature, documentation improvement, or design suggestion — every contribution matters.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Make** your changes
4. **Test** locally: `npm run dev` and verify in browser
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

## 🗺️ Roadmap

- [ ] Station search with fuzzy matching
- [ ] Sleep timer
- [ ] Keyboard shortcuts
- [ ] Chromecast / AirPlay support
- [ ] Podcast support
- [ ] Shared playlists
- [ ] i18n / localization

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ and way too many radio stations</sub>
</p>
