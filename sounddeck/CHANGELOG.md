# Changelog

All notable changes to **SoundDeck** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Marketing website** at [sounddeck.stream](https://sounddeck.stream) — Astro + Tailwind, deployed on Cloudflare Pages
  - 3 languages: FR (default), EN, ES
  - Scroll reveal animations with blur + stagger + directional slide
  - Sections: Hero (3D floating screenshot), Features, Showcase, HowItWorks, ProPlugins, FAQ
  - Design aligned with the app (#7C6FF7 accent, Inter, dark theme)
  - SEO: Open Graph meta tags, sitemap, robots.txt, security headers

---

## [1.4.0] — 2026-10-09

### Added

- **Pro plugin infrastructure** — Ed25519-signed licenses, verified offline
- **GitHub Sponsors integration** — one-time sponsorship unlocks all Pro plugins forever
- **Redeem codes** — 14-char codes (SDCK-XXXX-XXXX-XXXX) with configurable expiry
- **Support section** in Options — donate link + code activation
- **About section** in Options — version, license, source code
- **Login/Account UI** — sign-in modal, account panel with tier badge
- **Cloudflare Worker backend** — login, redeem, admin endpoints
- **D1 database** — users, payments, redeem_codes, audit_log
- **Resend integration** — automatic welcome emails
- **Admin CLI** — `code.mjs generate|list|revoke` for managing redeem codes
- **Quick audio setup** — one-click Discord configuration in Options → Audio - Auto-detects CABLE Input, real headphones, real microphone (ignores Windows aliases) 
- Configures output device, local output, microphone, mixer, playLocally, and noise suppression in a single action 
- Discord setup reminder banner with persistent "Done" button (localStorage) 
- Skipped if CABLE Input is missing (explicit error toast)
- **i18n**: Spanish fully supported for all new features

### Changed

- Sound popup: `hideDelay` increased from 4000ms → 6000ms for previews
- Sound popup: renderer-side auto-hide delay now 4500ms (was 2500ms)
- Sidebar: live list of currently playing sounds (multi-sound support)
- AudioService: `soundCache` supports arrays of Howls
- AudioService: `pauseSound` / `resumeSound` handle 3 modes
- AudioService: Range requests supported for accurate `seek()`
- `PluginManager`: license check before loading plugins with `licenseRequired: true`

### Fixed

- AudioService: memory leak when stopping multiple sounds simultaneously
- AudioService: `setSinkId` errors no longer crash playback
- Sequencer: `useSequencePlayer` correctly unregisters external playback
- Emoji picker: ZWJ sequences, keycaps, regional flags validated correctly
- Sidebar: prevent unnecessary re-renders with signature-based memoization
- Tray: language updates propagate without restart

### Security

- All license tokens signed with Ed25519 (private key never leaves the operator's machine)
- Passwords hashed with PBKDF2-SHA256 (100k iterations — Cloudflare Workers limit)
- Stripe webhook signature verification (HMAC-SHA256, constant-time comparison)
- Admin endpoints protected by bearer token with constant-time comparison

---

## [1.3.0] — 2026-01-XX

### Added

- Advanced audio editor with multi-track timeline
- Sequencer with playlist support, delays, and loop mode
- Trimmer with interactive waveform
- MyInstants discovery
- YouTube import via yt-dlp
- Spotify / SoundCloud partial support
- Emoji picker with categories
- Emoji Discovery plugin
- Plugin system with `.sdplugin` format
- Custom themes editor
- Editable sidebar
- Interactive tutorials
- Usage statistics page
- OBS WebSocket integration
- Twitch alerts
- Multi-language: FR / EN / ES

---

## [1.2.0] — 2025-XX-XX

### Added

- Initial support for VB-Cable and VoiceMeeter Banana
- Monitoring (self-hear) in headphones
- Mic noise reduction (AudioWorklet + filter)
- Low-latency mode
- Sound normalization (Peak / RMS)

---

## [1.1.0] — 2025-XX-XX

### Added

- Profiles system
- Favorites
- Tags
- Global shortcuts
- System tray

---

## [1.0.0] — 2025-XX-XX

### Added

- Initial release
- Local soundboard for Discord

---

[1.4.0]: https://github.com/Stevehunn/Soundboard/releases/tag/v1.4.0
[1.3.0]: https://github.com/Stevehunn/Soundboard/releases/tag/v1.3.0