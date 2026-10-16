# Changelog

All notable changes to **SoundDeck** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.12] — 2026-10-16

### Added

#### 🌐 Marketing website

- **New website** at [sounddeck.stream](https://sounddeck.stream) — Astro 5 + Tailwind 4, deployed on Cloudflare Pages
  - 3 languages: EN (default), FR, ES
  - Sections: Hero (3D floating screenshot), Features, Showcase, HowItWorks, ProPlugins, FAQ
  - Scroll reveal animations (blur + stagger + directional slide)
  - SEO: Open Graph meta tags, sitemap, robots.txt, security headers

#### 🛠️ Admin dashboard (web)

- **Admin panel** at [sounddeck.stream/admin/](https://sounddeck.stream/admin/) — full management UI
  - Secure login with `ADMIN_TOKEN` (sessionStorage)
  - Stats: users, Pro accounts, Free accounts, active codes, used codes
  - Users table with "Reset password" button
  - Codes table with Copy / Revoke buttons
  - Buttons: "Create user" and "Generate code"
  - `noindex, nofollow` + excluded from `robots.txt`

#### 🔐 User authentication

- **Public signup** at `/signup` — anyone can create a free account
  - Email verification required before login
  - Verification link valid for 24 hours
  - Tier `free` by default
- **Email verification** at `/verify-email?token=X` — HTML confirmation page
- **Forgot password** at `/forgot-password` — sends reset link by email
- **Reset password page** at `/reset-password?token=X` — HTML form (server-rendered)
- **Reset password submit** at `POST /reset-password`
- **Resend verification** at `POST /resend-verification` — for users who lost the email

#### 🔧 Admin API endpoints

- `POST /admin/create-user` — Create a user directly (bypass signup, verified)
- `POST /admin/reset-password` — Reset a user's password by email
- `GET /admin/list-users` — List all users

#### 🖥️ Admin CLI

- **`server/scripts/admin.mjs`** — CLI for managing users:
  - `list-users` — Show all users
  - `create-user --email X --password Y --tier pro` — Create a user
  - `reset-password --email X --password Y` — Reset a password

#### 🔄 Auto-update

- **`electron-updater`** integration — in-app update download + install
  - Auto-check 5 seconds after launch (production only)
  - Update banner in sidebar with progress
  - One-click "Download" → "Install and restart"
  - Fallback to GitHub Releases page if update fails
- **`scripts/release.mjs`** — Automated release pipeline:
  - Builds Vite + electron-builder
  - Renames `SoundDeck Setup X.Y.Z.exe` → `SoundDeck-Setup-X.Y.Z.exe` (required for auto-update)
  - Creates GitHub release via API
  - Uploads `.exe`, `.exe.blockmap`, `latest.yml`
  - Marks as "Latest" automatically
- **`useAutoUpdater` hook** — React hook for the sidebar banner
- **New preload methods** — `updateCheck`, `updateDownload`, `updateInstall`, `updateOpenGithub`

#### 💎 Pro / Free tiers

- **3 tiers now supported**: `free`, `pro`, `dev`
- **Free accounts** can use the app with limited features (no Pro plugins)
- **Upgrade banner** in Options → Support for free accounts
- **Account panel** now correctly displays Free tier (was incorrectly shown as Pro)

#### 🪄 Quick Discord setup wizard

- **One-click Discord configuration** in Options → Audio
  - Auto-detects `CABLE Input`, real headphones, real microphone (ignores Windows aliases)
  - Configures output device, local output, microphone, mixer, playLocally, noise suppression
- **Discord setup reminder banner** with persistent "Done" button (localStorage)
- Skipped if `CABLE Input` is missing (explicit error toast)

#### 🗄️ Database migrations

- `0004_users_email_verified.sql` — Add `email_verified`, `verify_token`, `verify_token_expires` columns
- `0005_password_resets.sql` — New `password_resets` table for password reset tokens

### Changed

- **`server/src/index.js`** — Added 7 new routes (signup, verify, forgot, reset, admin)
- **`server/src/routes/login.js`** — Now blocks unverified emails (`403 email_not_verified`)
- **`electron/main.js`** — Now stores `appVersion` in electron-store at boot
- **`electron/preload.js`** — Added 9 update-related IPC methods
- **`src/shared/components/navigation/Sidebar.jsx`** — Uses `useAutoUpdater` instead of `useUpdateChecker`
- **`src/features/auth/LoginModal.jsx`** — 4 sub-modes: normal, forgot, forgot-sent, signup, signup-sent
- **`src/features/auth/AccountPanel.jsx`** — Distinguishes Free vs Pro vs Dev tiers
- **`src/features/options/sections/SupportSection.jsx`** — Shows AccountPanel for connected users regardless of tier
- **`package.json`** — Added `electron-updater` dependency, `release` script, GitHub publish config
- **`README.md`** — Rewritten with new features (auto-update, admin panel, quick setup)
- **`CONTRIBUTING.md`** — Fixed encoding issues (emojis)

### Fixed

- **`handleListCodes`** — D1 `.all()` returns `{ results, meta }`, not an array — fixed the codes table on the admin panel
- **`AccountPanel`** — Free tier was incorrectly displayed as "Pro"
- **`login.js`** — Unverified emails can no longer log in

### Security

- **Email verification required** before first login
- **Password reset tokens** expire after 1 hour, single-use
- **Password reset page** is HTML (no React app), served directly by the worker
- **Admin panel** uses `noindex, nofollow` + `robots.txt` exclusion
- **`ADMIN_TOKEN`** still protected by constant-time comparison
- **`GH_TOKEN`** now required for `npm run release` (never committed)

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

[1.4.12]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.12
[1.4.0]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.0
[1.3.0]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.3.0