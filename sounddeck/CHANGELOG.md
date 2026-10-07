# Changelog

All notable changes to SoundDeck are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Pro plugin infrastructure — license verification via Ed25519 signature (offline, no server)
- Support section in Options — one-time donation unlocks all Pro plugins forever
- License activation UI — paste a license key or import a `.sdlicense` file
- `.sdlicense` receipt format for portable licenses

### Changed

- Sound popup: `hideDelay` increased from 4000ms → 6000ms for previews
- Sound popup: renderer-side auto-hide delay now 4500ms (was 2500ms)
- Sidebar: now shows a live list of currently playing sounds (multi-sound support)
- AudioService: `soundCache` supports array of Howls (virtual device + local monitoring)
- AudioService: `pauseSound` / `resumeSound` handle 3 modes (mixer / howler-virtual / howler-default)
- AudioService: Range requests supported in `protocolHandler` for accurate `seek()`

### Fixed

- AudioService: memory leak when stopping multiple sounds simultaneously
- AudioService: `setSinkId` errors no longer crash playback
- Sequencer: `useSequencePlayer` correctly unregisters external playback on stop
- Emoji picker: ZWJ sequences, keycaps, regional flags now validated correctly
- Sidebar: prevent unnecessary re-renders with signature-based memoization
- Tray: language updates propagate without restart

### Testing

- 5,519 tests across 244 files
- Coverage: 77.4% statements / 69.0% branches / 78.0% functions / 79.0% lines
- New tests: SoundPopupService, SoundPopupConfigModal, SoundPopupWindow, VolumePanel, ContextMenuPortal, AudioMixerService, EmojiService, MyInstants plugins, YouTube plugins, Emoji plugins
- Cross-language test ensures FR / EN / ES have identical key sets

---

## [1.3.0] — 2026-01-XX

### Added

- Advanced audio editor with multi-track timeline, clips, fades, and markers
- Sequencer with playlist support, delays, and loop mode
- Trimmer with interactive waveform and selection handles
- MyInstants discovery — search and import from thousands of sounds
- YouTube import via yt-dlp (audio download + trim)
- Spotify / SoundCloud partial support
- Emoji picker with categories
- Emoji Discovery plugin — browse and add emojis by category
- Plugin system with `.sdplugin` format
- Custom themes editor with live preview (Midnight Blue, Forest, Ember, Pastel Light)
- Editable sidebar — reorder, hide, pin items
- Interactive tutorials for each page
- Usage statistics page
- OBS WebSocket integration for record/stream control
- Twitch alerts (follows, donations, subs)
- Multi-language: FR / EN / ES

### Changed

- Migrated from Context API to hooks-based store
- Consolidated audio services into AudioService + AudioMixerService

### Fixed

- Various bugs in the editor timeline
- Discord setup documentation clarified

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
- Drag & drop import
- Basic playback

---

## Legend

- Added — new features
- Changed — changes in existing functionality
- Deprecated — soon-to-be removed features
- Removed — now removed features
- Fixed — bug fixes
- Security — vulnerabilities

---

[Unreleased]: https://github.com/SteveHun/sounddeck/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/SteveHun/sounddeck/releases/tag/v1.3.0
[1.2.0]: https://github.com/SteveHun/sounddeck/releases/tag/v1.2.0
[1.1.0]: https://github.com/SteveHun/sounddeck/releases/tag/v1.1.0
[1.0.0]: https://github.com/SteveHun/sounddeck/releases/tag/v1.0.0