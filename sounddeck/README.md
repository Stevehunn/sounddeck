<div align="center">

# 🎧 SoundDeck

**Local soundboard for Discord and other voice chat apps**

[![Version](https://img.shields.io/badge/version-1.4.12-blue.svg)](https://github.com/Stevehunn/sounddeck/releases)
[![Tests](https://img.shields.io/badge/tests-5384%20%E2%9C%85-success.svg)](#tests)
[![Coverage](https://img.shields.io/badge/coverage-77.5%25-yellowgreen.svg)](#tests)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Website](https://img.shields.io/badge/website-sounddeck.stream-7c6ff7.svg)](https://sounddeck.stream)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Stevehunn)

*A powerful, cross-platform, extensible soundboard.*

**🌍 Languages:** **English** · [Français](README.fr.md) · [Español](README.es.md)

</div>

---

## 🎯 What is SoundDeck?

SoundDeck is a **local soundboard for Discord** (and any other voice chat app) with:

- 🎛️ A **multi-track audio editor** (timeline, effects, undo/redo)
- 🎹 A **playlist sequencer** (custom delays, loop, shuffle)
- 🌐 **YouTube / MyInstants** import
- 🔊 A **built-in mic + sounds mixer** (Discord-ready, no VoiceMeeter required)
- 🧩 A **plugin system** (install from URL or `.sdplugin` file)
- 🌍 **3 languages**: English, French, Spanish

**Free and open source (MIT).** Pro plugins unlocked forever with a one-time donation.

[**Download →**](https://github.com/Stevehunn/sounddeck/releases/latest) · [**Website →**](https://sounddeck.stream) · [**Sponsor →**](https://github.com/sponsors/Stevehunn)

---

## 📦 Repository structure

This repo contains **3 sub-projects**:

```
sounddeck/
├── (root)          ← Desktop app (Electron + React + Vite)
├── server/         ← Cloudflare Worker API + D1 database
├── website/        ← Marketing website (Astro + Tailwind)
└── scripts/        ← Utility scripts (release, licenses, plugins)
```

| Sub-project | Tech | Deployment |
|---|---|---|
| **Desktop app** | Electron 42 + React 18 + Vite 8 | GitHub Releases |
| **API** | Cloudflare Workers + D1 | `api.sounddeck.stream` |
| **Website** | Astro 5 + Tailwind 4 | Cloudflare Pages (`sounddeck.stream`) |

---

## ✨ Features

### 🎵 Sound library

- Import via **drag & drop**, file dialog, or URL
- Organize with **profiles** (Gaming, Music, Memes…)
- **Favorites**, **tags**, instant search
- Automatic compression on import (optional, via ffmpeg)

### 🎛️ Audio editor

- Multi-track timeline with clips, fades, markers
- Audio effects: Volume, Fade In/Out, Speed, Echo, Reverb
- Loops per clip or global (with custom cycle count)
- Automatic volume normalization (Peak or RMS)
- Undo/Redo, snap, automatic crossfade
- Export final mix to MP3/WAV

### 🎹 Sequencer

- Build playlists of sounds with configurable delays
- Loop and shuffle playback
- Drag & drop reordering
- Keyboard navigation ← →

### ✂️ Trimmer

- Interactive waveform with selection handles
- Preview the selection before creating
- Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC

### 🌐 Discovery & Import

- **MyInstants**: search and import directly from thousands of sounds
- **YouTube**: audio download (via yt-dlp)
- **Spotify / SoundCloud**: partial support
- **Emoji picker** with customizable collections

### 🔊 Audio & Discord

- 🪄 **Quick setup wizard** — one-click Discord configuration (auto-detects CABLE Input, headphones, real mic)
- Built-in **mic + sounds mixer** (no VoiceMeeter needed for simple setups)
- Compatible with **VB-Cable** and **VoiceMeeter Banana**
- Monitoring (hear yourself in headphones)
- Mic noise reduction (AudioWorklet or filter)
- Low-latency mode for gaming

### 🧩 Extensions

- Full **plugin system** with `.sdplugin` files
- Built-in plugins: **YouTube**, **MyInstants**, **Emoji Discovery**
- Hooks (`beforePageRender`, `onSoundPlay`, `onAppStart`, `onProfileSwitch`)
- Semantic versioning with compatibility checks

### 🎨 Interface

- 3 themes: Dark, Light, Custom
- Editable sidebar (order, visibility, pinning)
- Interactive tutorials for each page
- Usage statistics
- **Multilingual**: 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español

### 💾 Backup

- Configurable auto-backup (interval, max count)
- Export/Import: JSON config, full archive, or sounds only
- OBS WebSocket synchronization
- Twitch alerts (follows, donations, subs)

### 🔄 Auto-update

- Built-in auto-updater (`electron-updater`)
- Update banner in sidebar when new version available
- One-click download + install
- Works offline until user clicks

### 💎 Pro plugins

Some plugins require a **Pro license**. Unlock all of them forever with a **one-time GitHub Sponsorship** (from $5).

- ✅ No subscription
- ✅ Works offline
- ✅ Valid forever on unlimited PCs

[**Sponsor on GitHub →**](https://github.com/sponsors/Stevehunn)

---

## 🚀 Installation

### For users

1. Download the latest version from [**Releases**](https://github.com/Stevehunn/sounddeck/releases/latest)
2. Run the installer (`.exe` on Windows)
3. Follow the interactive tutorial on first launch
4. (Optional) [Sponsor on GitHub](https://github.com/sponsors/Stevehunn) to unlock Pro plugins

### For developers

**Requirements:**

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (optional, for trimming + compression)
- **yt-dlp** (optional, for YouTube import)

```bash
# Clone
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck

# Install + run
npm install
npm run dev
```

> 📖 **Full developer documentation:** see [DOCS.md](DOCS.md).

---

## 🧪 Tests

The project uses **Vitest** for unit + integration tests.

| Metric | Value |
|---|---|
| **Total tests** | **5,384** ✅ |
| **Test files** | 240 |
| **Statements coverage** | 77.5 % |
| **Branches coverage** | 68.95 % |
| **Functions coverage** | 78.46 % |
| **Lines coverage** | 79.09 % |

```bash
npm test                # Watch mode
npm run test:coverage   # With coverage
npm run test:ci         # CI mode
```

---

## 🏗️ Architecture

```
sounddeck/
├── electron/                  # Electron main process
│   ├── main.js
│   ├── preload.js
│   └── modules/
│       ├── autoUpdater.js     # electron-updater
│       ├── fileHandlers.js
│       ├── shortcutManager.js
│       └── ...
│
├── src/                       # React renderer
│   ├── core/
│   │   ├── i18n/              # fr, en, es
│   │   ├── plugins/           # Plugin engine
│   │   ├── services/          # AudioService, AudioMixerService
│   │   └── store/             # Global state
│   ├── features/              # Editor, Sequencer, Trimmer, etc.
│   └── shared/                # Components, hooks, utils
│
├── server/                    # Cloudflare Worker + D1
│   ├── src/routes/            # login, signup, admin, etc.
│   ├── migrations/            # D1 SQL migrations
│   └── scripts/               # code.mjs, admin.mjs
│
├── website/                   # Astro marketing site
│   ├── src/pages/             # index, /en, /es, /admin
│   └── src/components/        # Hero, Features, FAQ, etc.
│
└── scripts/                   # Utility scripts
    ├── release.mjs
    ├── sign-license.mjs
    └── ...
```

**Architecture principles:**

- Strict separation: `electron/` (Node) vs `src/` (React/DOM)
- Context bridge: secure IPC via `preload.js`
- No `nodeIntegration` in the renderer
- Centralized services: all audio logic in `core/services/`
- Vite aliases: `@core`, `@shared`, `@features`, `@plugins`

---

## 📜 npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Runs Electron + Vite in dev mode (HMR) |
| `npm run build` | Production build (Vite + electron-builder) |
| `npm run release` | Build + publish to GitHub Releases |
| `npm test` | Runs tests in watch mode |
| `npm run test:coverage` | Tests + coverage report |
| `npm run test:ci` | Tests + coverage (CI mode) |
| `npm run test:ui` | Vitest graphical UI |
| `npm run build:plugin` | Build a `.sdplugin` file |
| `npm run audit:i18n` | Audit missing translations |

---

## 🔌 Plugin system

A plugin is a ZIP archive (`.sdplugin`) containing:

```
my-plugin.sdplugin
├── plugin.json      # Manifest (id, name, version, author, pages…)
├── index.js         # Entry point
└── pages/
    └── Discover.jsx # Optional React components
```

**Manifest (`plugin.json`):**

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "You",
  "requires": ">=1.3.0",
  "pages": [
    {
      "id": "my-page",
      "labelKey": "myPageLabel",
      "componentPath": "pages/Discover.jsx"
    }
  ]
}
```

**Entry point (`index.js`):**

```javascript
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [],

  async init(store, pluginManager) {
    pluginManager.addHook('onSoundPlay', (sound) => {
      console.log('Playing:', sound.name)
    })
  },

  async destroy() {}
}
```

**Install:** Options → Plugins → Install a plugin.

---

## 🎧 Discord setup

### 🪄 Quick setup wizard (recommended)

Starting with v1.4.12, SoundDeck ships with a **one-click Discord setup**:

1. Install **VB-Cable** and restart your PC
2. Open **Options → Audio → Quick setup**
3. Click **"Auto-setup for Discord"**
4. SoundDeck auto-selects:
   - Output → `CABLE Input`
   - Local output → your headphones (real device)
   - Microphone → your real mic
   - Enables mixer, playLocally, and noise suppression
5. Click **"Done"** on the Discord banner after configuring Discord manually (Input = `CABLE Output`)

### Manual mode (VB-Cable only)

1. Install **VB-Cable** from [vb-audio.com](https://vb-audio.com/Cable/)
2. Restart your PC
3. **Options → Audio**:
   - Enable **Mic + sounds mixer**
   - Select your microphone
   - Output: `CABLE Input (VB-Audio Virtual Cable)`
   - Enable **Play locally too** → select your headphones
4. **Discord → Voice & Video**:
   - Input device: `CABLE Output (VB-Audio Virtual Cable)`
   - Output device: your headphones
   - Disable: Noise Suppression, Echo Cancellation, Automatic Gain Control

### Advanced mode (VoiceMeeter Banana)

See the built-in **Discord Guide** (Guide page in the app).

---

## 🌍 Internationalization

The project supports **3 languages**: EN, FR, ES.

**Add a translation key:**

1. Add the key in all 3 locale files under `src/core/i18n/locales/<lang>/<section>.js`
2. Run `npm run audit:i18n` to verify

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Git workflow
- Code conventions
- Test rules (minimum 75 % coverage)
- PR process

**Before submitting a PR:**

```bash
npm test              # All tests green
npm run test:coverage # No coverage regression
npx eslint src electron --fix
```

---

## 📄 License

MIT © 2026 Stevehunn

See [LICENSE](LICENSE) for the full text.

---

## 🙏 Credits

- **[Electron](https://www.electronjs.org/)** — Desktop framework
- **[React](https://react.dev/)** — UI
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Vitest](https://vitest.dev/)** — Test framework
- **[Howler.js](https://howlerjs.com/)** — Audio playback
- **[Tone.js](https://tonejs.github.io/)** — Web Audio
- **[Astro](https://astro.build/)** — Website
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — API + D1
- **[Resend](https://resend.com/)** — Transactional emails
- **[Tabler Icons](https://tabler.io/icons)** — Icons
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — YouTube extraction
- **[ffmpeg](https://ffmpeg.org/)** — Audio processing
- **[VB-Audio](https://vb-audio.com/)** — Virtual audio cable

---

<div align="center">

**Made with ❤️ for the Discord community**

[Website](https://sounddeck.stream) · [Report a bug](https://github.com/Stevehunn/sounddeck/issues) · [Releases](https://github.com/Stevehunn/sounddeck/releases)

</div>