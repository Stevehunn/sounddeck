<div align="center">

# 🎧 SoundDeck

**Local soundboard for Discord and other voice chat apps**

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](#)
[![Tests](https://img.shields.io/badge/tests-5384%20%E2%9C%85-success.svg)](#tests)
[![Coverage](https://img.shields.io/badge/coverage-77.5%25-yellowgreen.svg)](#tests)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/SteveHun)

*A powerful, cross-platform, extensible soundboard.*

**🌍 Languages:** **English** · [Français](README.fr.md) · [Español](README.es.md)

</div>

---

## ✨ Features

### 🎵 Sound library
- Import via **drag & drop**, file dialog, or URL
- Organize with **profiles** (Gaming, Music, Memes…)
- **Favorites**, **tags**, instant search
- **Drag & drop** reordering
- Automatic compression on import (optional, via ffmpeg)

### 🎛️ Audio editor
- Multi-track timeline with **clips**, **fades**, **markers**
- **Audio effects**: Volume, Fade In/Out, Speed, Echo, Reverb
- **Loops** per clip or global (with custom cycle count)
- Automatic **volume normalization** (Peak or RMS)
- **Undo/Redo**, snap, automatic crossfade
- **Export** final mix to MP3/WAV

### 🎹 Sequencer
- Build **playlists** of sounds with configurable delays
- **Loop** and shuffle playback
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
- Built-in **mic + sounds mixer** (no VoiceMeeter needed for simple setups)
- Compatible with **VB-Cable** and **VoiceMeeter Banana**
- **Monitoring** (hear yourself in headphones)
- Mic **noise reduction** (AudioWorklet or filter)
- **Low-latency** mode for gaming
- Fine input/output device selection

### 🧩 Extensions
- Full **plugin system** with installation from URL or `.sdplugin` file
- Built-in plugins: **YouTube**, **MyInstants**, **Emoji Discovery**
- Hooks (beforePageRender, onSoundPlay, onAppStart…)
- Semantic versioning with compatibility checks

### 🎨 Interface
- 3 themes: **Dark**, **Light**, **Custom** (with editor)
- **Editable sidebar** (order, visibility, pinning)
- **Interactive tutorials** for each page
- Usage **statistics**
- **Multilingual**: 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español
- Global + per-sound keyboard shortcuts

### 💾 Backup
- Configurable **auto-backup** (interval, max count)
- Export/Import: JSON config, full archive, or sounds only
- **OBS WebSocket** synchronization
- **Twitch** alerts (follows, donations, subs)

### 💎 Pro plugins

Some plugins require a **Pro license**. Unlock all of them forever with a **one-time GitHub Sponsorship** (from $5).

-  No subscription
-  Works offline
-  Valid forever on unlimited PCs

[**Sponsor on GitHub →**](https://github.com/sponsors/SteveHun)

---

## 🚀 Installation

### For users

1. Download the latest version from [Releases](../../releases)
2. Run the installer (`.exe` on Windows)
3. Follow the interactive tutorial on first launch
4. (Optional) Sponsor on [GitHub Sponsors](https://github.com/sponsors/SteveHun) to unlock Pro plugins

### For developers

**Requirements**:
- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (optional, for trimming and compression)
- **yt-dlp** (optional, for YouTube import)

```bash
# 1. Clone the repo
git clone https://github.com/<user>/sounddeck.git
cd sounddeck

# 2. Install dependencies
npm install

# 3. Run in dev (Electron + Vite HMR)
npm run dev

# 4. Production build
npm run build
```

---

## 📜 npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Runs Electron + Vite in dev mode with HMR |
| `npm run build` | Production build (Vite + electron-builder) |
| `npm run preview` | Previews the Vite build |
| `npm test` | Runs tests in watch mode |
| `npm run test:watch` | Explicit watch mode |
| `npm run test:ui` | Vitest graphical UI |
| `npm run test:coverage` | Tests + coverage report |
| `npm run test:ci` | Tests + coverage (CI mode, exit on fail) |
| `npm run build:plugin` | Build a plugin (utility script) |
| `npm run audit:i18n` | Audit missing translations |

---

## 🧪 Tests

The project uses **[Vitest](https://vitest.dev/)** for unit and integration tests.

### Current state

| Metric | Value |
|---|---|
| **Total tests** | **5,384** ✅ |
| **Test files** | 240 |
| **Statements coverage** | 77.5 % |
| **Branches coverage** | 68.95 % |
| **Functions coverage** | 78.46 % |
| **Lines coverage** | 79.09 % |

### Running tests

```bash
# All tests (frontend + electron)
npm test

# With coverage
npm run test:coverage

# A specific file
npx vitest src/test/core/services/AudioService.test.jsx

# A folder
npx vitest src/test/features/editor
```

### Test structure

```
src/test/                  # Frontend tests (React)
├── components/            # Shared components
├── core/
│   ├── i18n/              # Translations (fr/en/es)
│   ├── plugins/           # Plugin system
│   ├── services/          # AudioService, AudioMixer, EmojiService
│   └── store/             # Global state (hooks)
├── features/              # Tests per feature (editor, home, options…)
├── hooks/                 # Shared hooks
├── plugins/               # Plugin tests
└── utils/                 # Utilities (format, logger, etc.)

electron/modules/__tests__/ # Electron main process tests (Node)
```

---

## 🏗️ Architecture

```
sounddeck/
├── electron/                  # Electron main process
│   ├── main.js                # Entry point, IPC, lifecycle
│   ├── preload.js             # Secure context bridge
│   ├── store.js               # electron-store wrapper
│   ├── i18n.js                # Main process translations
│   └── modules/               # IPC modules
│       ├── fileHandlers.js    # Dialogs, file import/export
│       ├── storeHandlers.js   # Persistence
│       ├── projectHandlers.js # Editor projects
│       ├── windowManager.js   # Main window
│       ├── trayManager.js     # System tray
│       ├── shortcutManager.js # Global shortcuts
│       ├── protocolHandler.js # sounddeck-local:// protocol
│       ├── diagnostic.js      # Logs and diagnostics
│       └── ipcHandlers.js     # Miscellaneous handlers
│
├── src/                       # React application
│   ├── App.jsx                # Root component
│   ├── main.jsx               # React entry point
│   │
│   ├── core/                  # Application core
│   │   ├── i18n/              # Internationalization
│   │   │   ├── locales/       # fr, en, es (15 files each)
│   │   │   ├── LanguageContext.jsx
│   │   │   └── constants.js
│   │   ├── plugins/           # Plugin system
│   │   │   ├── PluginManager/ # Manager + loader + cache
│   │   │   ├── PluginContext.jsx
│   │   │   └── hooks/
│   │   ├── services/          # Business services
│   │   │   ├── AudioService.js        # Sound playback (Howler)
│   │   │   ├── AudioMixerService.js   # Mic + sounds mixer (Web Audio)
│   │   │   └── EmojiService.js        # Emoji management
│   │   └── store/             # Global state (React hooks)
│   │       ├── index.js       # Main useStore()
│   │       ├── hooks/         # useSounds, useProfiles, useMixer…
│   │       └── utils/         # normalizePath, volumeUtils, constants
│   │
│   ├── features/              # Business modules
│   │   ├── editor/            # Audio editor (timeline, effects…)
│   │   ├── home/              # Main page (library)
│   │   ├── options/           # Settings
│   │   ├── presentation/      # Presentation mode
│   │   ├── sequencer/         # Playlist sequencer
│   │   ├── stats/             # Statistics
│   │   ├── trimmer/           # Trimmer
│   │   ├── welcome/           # Welcome screen
│   │   └── emoji/             # My emojis page
│   │
│   ├── plugins/               # Built-in plugins
│   │   ├── youtube/           # YouTube import
│   │   ├── myinstants/        # MyInstants discovery
│   │   └── emoji/             # Emoji discovery
│   │
│   ├── shared/                # Shared code
│   │   ├── components/        # Reusable components
│   │   │   ├── audio/         # Waveform, SoundCard, AudioTrimmer
│   │   │   ├── modals/        # ConfirmModal, FeedbackModal…
│   │   │   ├── navigation/    # Sidebar, SidebarEditor
│   │   │   ├── settings/      # BackupSettings, OBSControl, etc.
│   │   │   └── ui/            # Toast, ThemeToggle, Tutorial…
│   │   ├── constants/         # Constants (pages, emojis, navigation)
│   │   ├── contexts/          # NetworkContext
│   │   ├── hooks/             # useConfirm, useEmojis, etc.
│   │   └── utils/             # Pure utilities (format, logger, audio)
│   │
│   └── test/                  # Test configuration and utilities
│       ├── setup.js           # Vitest setup (jsdom, mocks)
│       ├── setup-electron.js  # Vitest setup for Electron
│       └── utils/             # Helpers (fixtures, mockElectronAPI…)
│
├── public/                    # Static assets
├── package.json
├── vite.config.js
└── eslint.config.js
```

### Architecture principles

- **Strict separation**: `electron/` (Node) vs `src/` (React/DOM)
- **Context Bridge**: secure IPC communication via `preload.js`
- **No `nodeIntegration`** in the renderer
- **Centralized services**: all audio logic in `core/services/`
- **Business hooks**: each feature exposes its reusable hooks
- **Vite aliases**: `@core`, `@shared`, `@features`, `@plugins`

---

## 🔌 Plugin system

### `.sdplugin` format

A plugin is a ZIP archive containing:

```
my-plugin.sdplugin
├── plugin.json      # Manifest (id, name, version, author, pages…)
├── index.js         # Entry point
└── pages/
    └── Discover.jsx # Optional React components
```

### `plugin.json` manifest

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

### Plugin API

```javascript
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [...],

  async init(store, pluginManager) {
    // Setup on activation
    pluginManager.addHook('onSoundPlay', (sound) => {
      console.log('Playing:', sound.name)
    })
  },

  async destroy() {
    // Cleanup
  }
}
```

### Installation

1. **Options → Plugins → Install a plugin**
2. Paste a URL or pick a `.sdplugin` file
3. Restart the app to apply

---

## 🎧 Discord setup

### Simple mode (VB-Cable only) — Recommended

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

The project supports **3 languages**: FR, EN, ES.

### Adding a language

1. Create `src/core/i18n/locales/<code>/` with the 15 files (`common.js`, `editor.js`, etc.)
2. Add the language in `src/core/i18n/constants.js`
3. Run `npm run audit:i18n` to check consistency

### Translation file structure

```javascript
// src/core/i18n/locales/fr/common.js
export default {
  add: 'Ajouter',
  cancel: 'Annuler',
  profileManagerConfirmMessage: 'Retirer {count} son(s) du profil "{name}" ?',
  // ...
}
```

Supported placeholders: `{name}` (named), `{0}` (positional).

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Git workflow
- Code conventions
- Test rules (minimum 75 % coverage)
- PR process

**Before submitting a PR**:
```bash
npm test              # All tests green
npm run test:coverage # No coverage regression
```

---

## 📄 License

MIT © 2026 SteveHun

See [LICENSE](LICENSE) for the full text.

---

## 🙏 Credits

- **[Electron](https://www.electronjs.org/)** — Desktop framework
- **[React](https://react.dev/)** — UI
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Vitest](https://vitest.dev/)** — Test framework
- **[Howler.js](https://howlerjs.com/)** — Audio playback
- **[Tone.js](https://tonejs.github.io/)** — Web Audio
- **[Tabler Icons](https://tabler.io/icons)** — Icons
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — YouTube extraction
- **[ffmpeg](https://ffmpeg.org/)** — Audio processing
- **[VB-Audio](https://vb-audio.com/)** — Virtual audio cable

---

<div align="center">

**Made with ❤️ for the Discord community**

[Report a bug](../../issues) · [Suggest an idea](../../issues) · [See releases](../../releases)

</div>