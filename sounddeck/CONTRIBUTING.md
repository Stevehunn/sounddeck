# 🤝 Contributing to SoundDeck

First off, thanks for taking the time to contribute! 🎉

This document explains how to contribute to SoundDeck: reporting bugs, proposing features, submitting pull requests, and coding conventions.

**🌍 Languages:** **English** · [Français](./CONTRIBUTING.fr.md) · [Español](./CONTRIBUTING.es.md)

---

## 📋 Table of contents

- [Code of Conduct](#-code-of-conduct)
- [How can I contribute?](#-how-can-i-contribute)
- [Development setup](#-development-setup)
- [Available scripts](#-available-scripts)
- [Project structure](#-project-structure)
- [Coding conventions](#-coding-conventions)
- [Code comments & JSDoc](#-code-comments--jsdoc)
- [Testing rules](#-testing-rules)
- [Git workflow](#-git-workflow)
- [Plugin development](#-plugin-development)
- [Internationalization](#-internationalization)
- [Support](#-support)
- [Pull Request process](#-pull-request-process)

---

## 📜 Code of Conduct

By participating in this project, you agree to be respectful and constructive. Harassment, discrimination, or toxic behavior will not be tolerated.

---

## 🎯 How can I contribute?

- 🐛 **Report bugs** — open an [issue](../../issues/new) with a clear description + reproduction steps
- 💡 **Suggest features** — open an issue with the `enhancement` label
- 📝 **Improve documentation** — fixes to README, guide, or inline comments
- 🌍 **Translate** — see the i18n section below
- 🧪 **Write tests** — we always welcome additional test coverage
- 💻 **Submit code** — bug fixes, new features, refactors
- 💖 **Support the project** — one-time donation unlocks all Pro plugins forever (see Support section)

---

## 🛠️ Development setup

### Prerequisites

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (optional, for trim + compression)
- **yt-dlp** (optional, for YouTube import)

### Initial setup

```bash
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck
npm install
npm run dev
```

---

## 📜 Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Run Electron + Vite in dev mode with HMR |
| `npm run build` | Production build (Vite + electron-builder) |
| `npm run release` | Build + publish to GitHub Releases (requires `GH_TOKEN`) |
| `npm run preview` | Preview the Vite build |
| `npm test` | Run tests in watch mode |
| `npm run test:coverage` | Tests + coverage report (HTML) |
| `npm run test:ci` | Tests + coverage (CI mode) |
| `npm run test:ui` | Vitest graphical UI |
| `npm run build:plugin` | Build a `.sdplugin` file |
| `npm run audit:i18n` | Audit missing translations |

---

## 📁 Project structure

```
sounddeck/
├── electron/              # Main process (Node.js)
│   ├── main.js
│   ├── preload.js
│   └── modules/           # IPC handlers, window/tray/shortcut managers
│
├── src/                   # Renderer (React)
│   ├── core/              # i18n, plugins engine, services, store
│   ├── features/          # Business pages (home, editor, sequencer…)
│   ├── plugins/           # Built-in plugins
│   ├── shared/            # Components, hooks, utils
│   └── test/              # Test setup + helpers
│
├── server/                # Cloudflare Worker API + D1 database
├── website/               # Astro marketing site
├── scripts/               # Utility scripts (release, licenses, plugins)
└── public/                # Static assets
```

**Aliases** (configured in `vite.config.js`):

| Alias | Path |
|---|---|
| `@` | `./src` |
| `@core` | `./src/core` |
| `@shared` | `./src/shared` |
| `@features` | `./src/features` |
| `@plugins` | `./src/plugins` |

---

## 🎨 Coding conventions

### General

- **Language**: code comments and identifiers in **English**; user-facing strings via `t('...')` (never hardcoded).
- **Formatting**: 2-space indentation, semicolons omitted (see `eslint.config.js`).
- **Linting**: run `npx eslint src electron server website --fix` before committing.

### React

- Function components only — no classes.
- Hooks at the top of the component, then effects, then handlers, then render.
- Memo components that re-render often (`Sidebar`, `SoundCard`, `PlaylistItem`).
- Props destructuring in the signature — never `props.x`.
- CSS: inline styles for local layout; `index.css` for globals; no CSS-in-JS libraries.

### Data-testid conventions

See `testids.md`. Quick recap:

- Format: `{domain}-{element}` in kebab-case
- Examples: `editor-play-button`, `sound-card-abc-123`, `options-search-input`
- Never use visible text or CSS classes in testids

### Imports order

```js
// 1. React / libs
import { useState } from 'react'
import { Howl } from 'howler'

// 2. Core (aliases)
import { useLanguage } from '@core/i18n/LanguageContext'
import { playSound } from '@core/services/AudioService'

// 3. Shared
import Toast from '@shared/components/ui/Toast'

// 4. Local (same folder / feature)
import SoundCard from './SoundCard'
```

---

## 📝 Code comments & JSDoc

### Language

- **All code comments and identifiers are in English.**
- User-facing strings go through `t('...')` (i18n) — never hardcoded.
- CHANGELOG, README, docs: keep their language (EN/FR/ES).

### JSDoc for exported functions

Every **exported** function (and any non-trivial internal function) must have a JSDoc block. This enables autocomplete in VS Code without TypeScript, and the `eslint-plugin-jsdoc` rules enforce consistency.

```js
/**
 * Short description of what the function does.
 *
 * Optional longer description with details about
 * edge cases, side effects, or behavior.
 *
 * @param {string} email - User email (will be lowercased and trimmed).
 * @param {string} password - Plaintext password (min 6 chars).
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.sendEmail=true] - Send verification email.
 * @returns {Promise<{ok: boolean, userId: string}>}
 *   `ok: true` on success, `userId` is the new user's UUID.
 * @throws {Error} If the DB insert fails.
 *
 * @example
 * const { ok, userId } = await createUser('a@b.c', 'secret')
 */
export async function createUser(email, password, options = {}) {
  // ...
}
```

### JSDoc for React components

```jsx
/**
 * Account panel showing the current user's tier and actions.
 *
 * @param {Object} props
 * @param {{email: string, tier: 'free'|'pro'|'dev'}} props.status
 * @param {() => void} props.onLogout - Called when the user confirms logout.
 * @param {() => void} props.onLoginClick - Opens the login modal.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
export default function AccountPanel({ status, onLogout, onLoginClick, addToast }) {
  // ...
}
```

### File header (optional, for complex modules)

```js
/**
 * @file Auto-updater module (electron-updater).
 *
 * Responsibilities:
 * - Check for updates on app boot (production only)
 * - Download + install updates from GitHub Releases
 * - Forward progress events to the renderer via IPC
 *
 * @see https://www.electron.build/auto-update
 */
```

### Inline comments

- `// Short inline note` for obvious stuff
- `// TODO(name): thing to do` for TODOs
- `// FIXME: bug description` for known issues
- ❌ Avoid obvious comments like `// increment i` or `// return result`

### Enforced by ESLint

The repo ships with `eslint-plugin-jsdoc`. Rules active on `electron/**/*.js` and `server/src/**/*.js`:

| Rule | Level |
|---|---|
| `jsdoc/require-jsdoc` (publicOnly) | warn |
| `jsdoc/require-param` | warn |
| `jsdoc/require-returns` | warn |
| `jsdoc/check-param-names` | error |
| `jsdoc/check-tag-names` | error |

If a warning appears, fix it before merging. Errors block the CI.

---

## 🧪 Testing rules

### Framework

- Vitest for unit + integration tests
- @testing-library/react for component tests
- jsdom for DOM-based tests

### Minimum requirements

| Rule | Requirement |
|---|---|
| Coverage on new code | ≥ 75% |
| Test location (frontend) | `src/test/**/*.test.jsx` |
| Test location (Electron) | `electron/modules/__tests__/*.test.js` |
| Test file naming | `*.test.js` or `*.test.jsx` |

### Running tests

```bash
npm test
npx vitest run src/test/features/editor/Editor.test.jsx
npm run test:coverage
```

### Writing a good test

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

describe('MyComponent', () => {
  it('should render the title', () => {
    render(<MyComponent />)
    expect(screen.getByTestId('my-component-title')).toBeInTheDocument()
  })
})
```

- Always mock `LanguageContext` if the component uses `t()`.
- Use `data-testid` for selectors, not text or classes.
- Test behaviors, not implementation details.
- Don't test third-party libraries.

---

## 🌿 Git workflow

### Branches

- `main` — stable, always deployable
- `feat/<scope>` — new feature
- `fix/<scope>` — bug fix
- `docs/<scope>` — documentation only
- `test/<scope>` — tests only
- `refactor/<scope>` — refactor without behavior change

### Commit conventions

Follow Conventional Commits:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.

Examples:

```
feat(sound-popup): add 8-position grid config
fix(audio): prevent memory leak on stopAllSounds
test(sequencer): add useSequencePlayer coverage
docs(readme): add Discord setup section
chore(deps): bump electron to 42.5.2
```

---

## 🔌 Plugin development

SoundDeck has a full plugin system for adding features without touching the core.

### `.sdplugin` format

A plugin is a ZIP archive containing:

```
my-plugin.sdplugin
├── plugin.json       # Manifest
├── index.js          # Entry point (ES module)
└── pages/
    └── Discover.jsx  # Optional React components
```

### Manifest (`plugin.json`)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "requires": ">=1.3.0",
  "pages": [
    {
      "id": "my-page",
      "labelKey": "myPageLabel",
      "icon": "ti-puzzle",
      "component": "pages/Discover.jsx",
      "group": "navigation"
    }
  ]
}
```

### Entry point (`index.js`)

```js
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [],

  async init(store, pluginManager) {
    // Setup on activation
  },

  async destroy() {
    // Cleanup
  }
}
```

### Installation

1. Run `npm run build:plugin -- my-plugin` → generates `my-plugin.sdplugin`
2. In the app: Options → Plugins → Install
3. Restart to apply

### Hooks available

- `beforePageRender` — before a page is rendered
- `onSoundPlay` — when a sound starts
- `onAppStart` — when the app boots
- `onProfileSwitch` — when the user switches profile

### Pro plugins

Some plugins require a Pro license (`licenseRequired: true` in their manifest). Pro licenses are unlocked with a one-time donation — contributors get lifetime access to all Pro plugins forever.

To test Pro plugins locally during development:

```bash
node scripts/sign-license.mjs --dev --tier pro
```

---

## 🌍 Internationalization

The app supports 3 languages: FR, EN, ES.

### Adding a translation key

1. Add the key in all 3 locale files under `src/core/i18n/locales/<lang>/<section>.js`
2. Run `npm run audit:i18n` to verify consistency
3. Use it via `const { t } = useLanguage(); t('myNewKey')`

### Adding a new language

1. Create `src/core/i18n/locales/<code>/` with the 15 files (copy from `fr/`)
2. Add the language in `src/core/i18n/constants.js`
3. Add the language in `electron/i18n.js` (for main process)
4. Run `npm run audit:i18n`

### Plugin translations

Plugins ship their own `i18n.js` at the root of the plugin folder:

```js
export default {
  fr: { myKey: 'Ma traduction' },
  en: { myKey: 'My translation' },
  es: { myKey: 'Mi traducción' }
}
```

They are automatically merged with core translations at startup.

---

## 💖 Support

SoundDeck is free and open-source (MIT). If you'd like to support development:

- One-time donation unlocks all Pro plugins forever — no subscription, no account
- Your license key is signed locally and works offline
- Keep your `.sdlicense` file safe (email, password manager, cloud) — you'll need it if you change PC

---

## 🚀 Pull Request process

1. Fork the repo and create a branch from `main`
2. Write your code + tests
3. Run locally:
   ```bash
   npm test
   npm run test:coverage
   npx eslint src electron server website --fix
   ```
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Push and open a PR against `main`
6. Fill the PR template (description, type, screenshots if UI change)
7. Wait for review

### What reviewers look for

- Tests pass + new code is covered
- No hardcoded strings (use `t()`)
- **JSDoc on new exported functions** (see [Code comments & JSDoc](#-code-comments--jsdoc))
- `data-testid` on new interactive elements
- No `console.log` left in production code (use `logger`)
- Small, focused PRs (one feature per PR)

### PR rejection criteria

- Breaking changes without discussion
- New dependency without justification
- Refactor of unrelated code
- No tests for new logic
- Coverage regression

---

## 🙏 Thank you

Every contribution, no matter how small, helps make SoundDeck better. If you have any questions, feel free to open a discussion or ping the maintainer.

**Happy hacking!** 🎧