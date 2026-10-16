# 🎧 SoundDeck

<div align="center">

**Local soundboard for Discord and other voice chat apps**

[![Website](https://img.shields.io/badge/website-sounddeck.stream-7c6ff7.svg)](https://sounddeck.stream)
[![Releases](https://img.shields.io/badge/releases-latest-blue.svg)](https://github.com/Stevehunn/sounddeck/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Stevehunn)

</div>

---

## 📦 Structure of this repository

This repo is a **monorepo** containing 3 sub-projects:

```
.
├── sounddeck/          ← 🎵 Main project (Electron app + API + website)
│   ├── (root)          ← Electron + React + Vite desktop app
│   ├── server/         ← Cloudflare Worker API + D1 database
│   ├── website/        ← Astro marketing site
│   └── scripts/        ← Build / release / license scripts
└── README.md           ← You are here
```

---

## 🚀 Quick links

- **📖 Full documentation** → [sounddeck/README.md](sounddeck/README.md)
- **🛠️ Developer guide** → [sounddeck/DOCS.md](sounddeck/DOCS.md)
- **🌍 Website** → [sounddeck.stream](https://sounddeck.stream)
- **📦 Latest release** → [GitHub Releases](https://github.com/Stevehunn/sounddeck/releases/latest)
- **💖 Sponsor** → [GitHub Sponsors](https://github.com/sponsors/Stevehunn)

---

## 🎯 What is SoundDeck?

SoundDeck is a **local soundboard for Discord** with:

- 🎛️ Multi-track audio editor (timeline, effects, undo/redo)
- 🎹 Playlist sequencer (delays, loop, shuffle)
- 🌐 YouTube / MyInstants import
- 🔊 Built-in mic + sounds mixer (Discord-ready)
- 🧩 Plugin system with `.sdplugin` files
- 🔄 Auto-update (electron-updater)
- 🌍 3 languages: 🇬🇧 English · 🇫🇷 Français · 🇪🇸 Español

**Free and open source (MIT).** Pro plugins unlocked forever with a one-time donation.

---

## 🚀 Getting started

```bash
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck/sounddeck

npm install
npm run dev
```

---

## 📄 License

MIT © 2026 Stevehunn

See [LICENSE](LICENSE) for the full text.