# Changelog

All notable changes to **SoundDeck** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.14] — 2026-11-18

### Fixed

#### 🖥️ Windows auto-start

- **"Lancer au démarrage" now actually registers SoundDeck with Windows** — previous versions only persisted `launchAtStartup` to the store, but never called `app.setLoginItemSettings`, so the `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entry was never created. The checkbox was a silent no-op. SoundDeck now registers and unregisters itself correctly.
- **"Démarrer en arrière-plan" now works at auto-start** — the startup entry is written with the `--hidden` argument. At boot, `process.argv.includes('--hidden')` forces the main window to stay hidden in the tray, regardless of the `startMinimized` preference state. Manual launches (double-click, Start menu) are unaffected and continue to respect the `startMinimized` toggle.
- **Electron idempotence bug workaround** — `app.setLoginItemSettings` is a no-op on Windows when called with the same `openAtLogin: true` but different `args`; the registry keeps the old (empty) `args`. The fix forces a `false → true` cycle to guarantee `--hidden` is written on existing installations.
- **Boot-time registry sync** — on every launch, the registry entry is reconciled with the stored `launchAtStartup` preference. Fixes stale entries created by older versions that only saved the preference.
- **Startup diagnostic logs** — added `🔎 [boot]`, `🔐 [boot]` and `🪟 [window]` console logs to trace auto-start behavior in production builds (`argv`, `wasAutoStarted`, `shouldStartMinimized`, `app.getLoginItemSettings()`).

### Added

#### 🎛️ Options → Advanced

- **"Démarrer en arrière-plan" toggle** — previously only available from the system tray menu, now also exposed in the standard Options page (`Options → Avancé`).
- **"Lancer au démarrage" toggle** — same, now accessible outside the tray.
- **FR / EN / ES translations** for the new labels (`optionsStartMinimizedDesc`) and toast messages (`toastStartMinimizedEnabled/Disabled`, `toastLaunchAtStartupEnabled/Disabled`).

### Changed

- **`electron/main.js`** — new `applyLaunchAtStartup()` helper, used by both the tray menu and the boot-time sync. Unregisters then re-registers the login item to force the `--hidden` argument. Two new diagnostic `console.log` blocks.
- **`electron/modules/storeHandlers.js`** — `set-launch-at-startup` IPC handler now calls `app.setLoginItemSettings` (gated by `app.isPackaged`), and returns `true` for consistency with the other handlers.
- **`src/core/store/hooks/useSettings.js`** — `updateLaunchAtStartup` now triggers the `set-launch-at-startup` IPC in addition to persisting the preference. Accepts an optional `{ skipIpc: true }` flag used during hydration.
- **`src/core/store/index.js`** — hydrates `launchAtStartup` with `{ skipIpc: true }` to avoid a redundant registry call at boot (the sync already happens in `main.js`).
- **`src/features/options/sections/AdvancedSection.jsx`** — renders the two new toggles at the top of the section, before the compression settings.

### Known issues

- **Legacy `shell:startup` shortcut** — if an older manual shortcut to `SoundDeck.exe --hidden` still exists in `shell:startup`, it will launch SoundDeck hidden at every boot regardless of the in-app toggles. This shortcut must be deleted manually; the app now uses the registry (`setLoginItemSettings`) exclusively.

---

## [1.4.13] — 2026-11-10

### Added

#### 💎 Pro trial (3 months)

- **Automatic 3-month Pro trial** — when a new user signs up and verifies their email, a 3-month Pro subscription is automatically granted.
- **Trial expiry rule** — Pro is valid for the **verification month + the 3 following months**, ending at `23:59:59 UTC` on the last day of the 3rd following month. Example: verified on 2026-10-29 → Pro until 2027-01-31 23:59:59 UTC.
- **Trial tracking** — the user record now stores `tier_expires_at`; expired trials silently fall back to `free` on the next login check (`downgradeIfExpired`).
- **Lifetime Pro for donors, redeem codes, admins** — `tier_expires_at = NULL` for these paths, preserving the current "Pro forever" behavior.
- **Trial notification popups** — activation notice, reminders at 1 month / 1 week / 1 day before expiry, and an end-of-trial notice. Driven by the new `TrialNotificationService` + `useTrialNotifications` hook (mounted in `App.jsx`).
- **Trial countdown banner** in Options → Support (AccountPanel shows remaining days for active trials).

#### 👤 Account creation flow

- **Signup form** — inline validation, password strength indicator, terms acceptance.
- **Email verification** — verification link valid for 24 hours, `handleVerifyEmail` + `buildSuccessPage` in `server/src/routes/signup.js`.
- **Welcome email + verification reminder** — sent on signup; reminder after 48 hours if unverified.
- **Pro upgrade email** — `sendProUpgradeEmail` (`server/src/lib/email.js`) sent automatically once the email is verified, to confirm the trial start.

#### 🗄️ Database

- **Migration `0006_user_trial.sql`** — adds `tier_expires_at` column with an index for fast expiry checks.

### Changed

- **`server/src/lib/db.js`** — `markEmailVerified`, `createUser`, `listUsers` updated to handle `tier_expires_at`; two new helper functions for trial computation and expiry checks.
- **`server/src/lib/license.js`** — `buildLicensePayload` and `generateLicenseToken` now include `expiresAt` (`null` for lifetime Pro, ISO date for trials).
- **`server/src/routes/login.js`** — calls `downgradeIfExpired` before issuing the token; token now carries `expiresAt`.
- **`server/src/routes/signup.js`** — verification now triggers the Pro trial grant + `sendProUpgradeEmail`.
- **`server/src/routes/github-webhook.js`** — fix for the "existing user upgrade" path (no longer resets `tier_expires_at` to `NULL` for an already-Pro user who was on trial).
- **`src/core/plugins/PluginManager/licenseManager.js`** — checks token expiry and returns an enriched license object (`tier`, `expiresAt`, `expired`, `neverExpires`).
- **`src/core/services/LicenseService.js`** — exposes `expiresAt`, `expiredAt` and `neverExpires`; plugins with `licenseRequired: true` now respect the trial expiry.
- **`src/features/auth/AccountPanel.jsx`** — distinguishes Free / Trial Pro / Lifetime Pro / Dev tiers; shows trial countdown and an upgrade CTA.
- **`src/App.jsx`** — mounts the `useTrialNotifications` hook.
- **i18n** — 9 new keys × 3 languages (`trialStarted`, `trialEndsIn`, `trialExpired`, `trialUpgradeCta`, etc.).

### Fixed

- **`server/src/routes/github-webhook.js`** — upgrading an existing Free user to Pro via GitHub Sponsors no longer touches `tier_expires_at` when they were not on trial.

### Tests

- **5621 / 5621** passing.
- `computeTrialExpiresAt` — 7 unit tests including January 2026, October 2026, leap year edge cases.
- `npm run audit:i18n` — **2106** keys × 3 languages, fully synced.
- Migration `0006_user_trial.sql` — verified locally.

### Security

- **Trial grants are server-side only** — the client cannot extend `tier_expires_at`.
- **Signed license tokens carry `expiresAt`** — the client validates expiry on every plugin load; a modified token would break the Ed25519 signature.
- **Donors / redeem codes / admins** — `tier_expires_at = NULL`, lifetime Pro preserved.

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

#### 🧹 Editor refactor (Session 4)

- **35 files refactored** in `src/features/editor/components/` — full `@file` headers, JSDoc on every exported function, comments in English, i18n policy applied (`t()` for components, `tr()` for props).
  - `Clip/` (5), `Track/` (3), `Timeline/` (11), `Toolbar/` (3), `Modals/` (7), `Markers/` (2), `EffectsPanel/` (1), `MasterVolume/` (1), `ClipActionsMenu` (1), `ActionOverlay` (1).
- **`Editor.jsx`** split into 8 focused hooks under `contexts/hooks/`:
  `useEditorCore`, `useEditorTracks`, `useEditorClips`, `useEditorEffects`, `useEditorLoops`, `useEditorMarkers`, `useEditorOverlay`, `useEditorAudioPlayback`.

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
- **ESLint** — 0 warnings on the entire `src/features/editor/components/` tree.

### Fixed

- **`handleListCodes`** — D1 `.all()` returns `{ results, meta }`, not an array — fixed the codes table on the admin panel
- **`AccountPanel`** — Free tier was incorrectly displayed as "Pro"
- **`login.js`** — Unverified emails can no longer log in
- **`errorHandler` debounce** — Guard now uses `!== null` instead of a truthy check, preventing duplicate `storeSet` calls when the timer id is `0`.
- **`ImportFileModal`** — Unsupported-format message now goes through `tr()`.
- **`MarkerItem`** — Avoids a crash when `editorSplitInstructions` is missing (`formatWithName` helper).
- **`MasterVolume`** — Peak-meter overlay restored to `linear-gradient` to match the original visual and keep the test selector valid.
- **i18n `editor.js`** — Added 11 missing keys (markers panel, effects panel, auto-preview tooltips, param labels) across EN/FR/ES.
- **`i18nLocaleTestFactory`** — Collision threshold bumped from 60 → 100 (Session 4 additions; V2 cleanup planned).

### Tests

- **5621 / 5621** passing across **249 files**.

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

[1.4.14]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.14
[1.4.13]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.13
[1.4.12]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.12
[1.4.0]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.4.0
[1.3.0]: https://github.com/Stevehunn/sounddeck/releases/tag/v1.3.0