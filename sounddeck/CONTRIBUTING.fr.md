# 🤝 Contribuer à SoundDeck

Merci de prendre le temps de contribuer ! 🎉

Ce document explique comment contribuer à SoundDeck : signaler des bugs, proposer des fonctionnalités, soumettre des pull requests et respecter les conventions de code.

**🌍 Langues :** [English](./CONTRIBUTING.md) · **Français** · [Español](./CONTRIBUTING.es.md)

---

## 📋 Sommaire

- [Code de conduite](#-code-de-conduite)
- [Comment puis-je contribuer ?](#-comment-puis-je-contribuer)
- [Environnement de développement](#-environnement-de-développement)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure du projet](#-structure-du-projet)
- [Conventions de code](#-conventions-de-code)
- [Commentaires & JSDoc](#-commentaires--jsdoc)
- [Règles de test](#-règles-de-test)
- [Workflow Git](#-workflow-git)
- [Développement de plugins](#-développement-de-plugins)
- [Internationalisation](#-internationalisation)
- [Soutenir](#-soutenir)
- [Processus de Pull Request](#-processus-de-pull-request)

---

## 📜 Code de conduite

En participant à ce projet, vous vous engagez à être respectueux et constructif. Le harcèlement, la discrimination ou tout comportement toxique ne seront pas tolérés.

---

## 🎯 Comment puis-je contribuer ?

- 🐛 **Signaler des bugs** — ouvrez une issue avec une description claire + étapes de reproduction
- 💡 **Suggérer des fonctionnalités** — ouvrez une issue avec le label `enhancement`
- 📝 **Améliorer la documentation** — corrections du README, du guide ou des commentaires
- 🌍 **Traduire** — voir la section i18n ci-dessous
- 🧪 **Écrire des tests** — la couverture supplémentaire est toujours la bienvenue
- 💻 **Soumettre du code** — corrections, nouvelles fonctionnalités, refactorisations
- 💖 **Soutenir le projet** — un don unique débloque tous les plugins Pro à vie (voir section Soutenir)

---

## 🛠️ Environnement de développement

### Prérequis

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (optionnel, pour le rognage et la compression)
- **yt-dlp** (optionnel, pour l'import YouTube)

### Installation initiale

```bash
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck
npm install
npm run dev
```

---

## 📜 Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Lance Electron + Vite en dev avec HMR |
| `npm run build` | Build de production (Vite + electron-builder) |
| `npm run release` | Build + publication sur GitHub Releases (requiert `GH_TOKEN`) |
| `npm run preview` | Prévisualise le build Vite |
| `npm test` | Lance les tests en watch mode |
| `npm run test:coverage` | Tests + rapport de couverture (HTML) |
| `npm run test:ci` | Tests + couverture (mode CI) |
| `npm run test:ui` | UI graphique Vitest |
| `npm run build:plugin` | Build un plugin `.sdplugin` |
| `npm run audit:i18n` | Audit des traductions manquantes |

---

## 📁 Structure du projet

```
sounddeck/
├── electron/              # Processus principal (Node.js)
├── src/                   # Renderer (React)
│   ├── core/              # i18n, moteur de plugins, services, store
│   ├── features/          # Pages métier
│   ├── plugins/           # Plugins intégrés
│   ├── shared/            # Composants, hooks, utils
│   └── test/              # Config de test + helpers
│
├── server/                # API Cloudflare Worker + base D1
├── website/               # Site marketing Astro
├── scripts/               # Scripts utilitaires (release, licences, plugins)
└── public/                # Assets statiques
```

**Alias** : `@` → `./src`, `@core` → `./src/core`, `@shared` → `./src/shared`, `@features` → `./src/features`, `@plugins` → `./src/plugins`.

---

## 🎨 Conventions de code

### Général

- **Langue** : commentaires et identifiants en **anglais** ; chaînes visibles via `t('...')` (jamais en dur).
- **Formatage** : indentation 2 espaces, sans point-virgule (voir `eslint.config.js`).
- **Linting** : lancer `npx eslint src electron server website --fix` avant chaque commit.

### React

- Composants fonction uniquement.
- Hooks en haut, puis effects, puis handlers, puis render.
- Memo sur les composants qui re-render souvent.
- Destructuring des props dans la signature.
- CSS inline pour le layout local, `index.css` pour le global.

### Conventions `data-testid`

Format : `{domaine}-{element}` en kebab-case. Jamais de texte visible ni de classe CSS.

### Ordre des imports

1. React / libs
2. Core (`@core/...`)
3. Shared (`@shared/...`)
4. Local (`./...`)

---

## 📝 Commentaires & JSDoc

### Langue

- **Tous les commentaires et identifiants sont en anglais.**
- Les chaînes visibles passent par `t('...')` (i18n) — jamais en dur.
- CHANGELOG, README, docs : garder leur langue (EN/FR/ES).

### JSDoc pour les fonctions exportées

Chaque **fonction exportée** (et toute fonction interne non triviale) doit avoir un bloc JSDoc. Ça active l'autocomplete VS Code sans TypeScript, et les règles `eslint-plugin-jsdoc` vérifient la cohérence.

```js
/**
 * Description courte de ce que fait la fonction.
 *
 * Description plus longue optionnelle avec les cas limites,
 * effets de bord, ou le comportement.
 *
 * @param {string} email - Email utilisateur (sera lowercased + trimmed).
 * @param {string} password - Mot de passe en clair (min 6 chars).
 * @param {Object} [options] - Options optionnelles.
 * @param {boolean} [options.sendEmail=true] - Envoie l'email de vérification.
 * @returns {Promise<{ok: boolean, userId: string}>}
 *   `ok: true` en cas de succès, `userId` est l'UUID du nouvel utilisateur.
 * @throws {Error} Si l'insertion DB échoue.
 *
 * @example
 * const { ok, userId } = await createUser('a@b.c', 'secret')
 */
export async function createUser(email, password, options = {}) {
  // ...
}
```

### JSDoc pour les composants React

```jsx
/**
 * Panneau de compte affichant le tier et les actions de l'utilisateur.
 *
 * @param {Object} props
 * @param {{email: string, tier: 'free'|'pro'|'dev'}} props.status
 * @param {() => void} props.onLogout - Appelé quand l'utilisateur confirme la déconnexion.
 * @param {() => void} props.onLoginClick - Ouvre la modale de connexion.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
export default function AccountPanel({ status, onLogout, onLoginClick, addToast }) {
  // ...
}
```

### En-tête de fichier (optionnel, pour les modules complexes)

```js
/**
 * @file Module auto-updater (electron-updater).
 *
 * Responsabilités :
 * - Vérifie les mises à jour au démarrage (prod uniquement)
 * - Télécharge + installe depuis GitHub Releases
 * - Forward les events de progression au renderer via IPC
 *
 * @see https://www.electron.build/auto-update
 */
```

### Commentaires inline

- `// Note inline courte` pour les évidences
- `// TODO(nom): chose à faire` pour les TODO
- `// FIXME: description du bug` pour les bugs connus
- ❌ Éviter les commentaires évidents type `// incrémente i` ou `// retourne result`

### Vérifié par ESLint

Le repo embarque `eslint-plugin-jsdoc`. Règles actives sur `electron/**/*.js` et `server/src/**/*.js` :

| Règle | Niveau |
|---|---|
| `jsdoc/require-jsdoc` (publicOnly) | warn |
| `jsdoc/require-param` | warn |
| `jsdoc/require-returns` | warn |
| `jsdoc/check-param-names` | error |
| `jsdoc/check-tag-names` | error |

Si un warning apparaît, le corriger avant de merger. Les erreurs bloquent la CI.

---

## 🧪 Règles de test

- Vitest + @testing-library/react + jsdom
- Couverture minimum sur le nouveau code : 75 %
- Tests frontend : `src/test/**/*.test.jsx`
- Tests Electron : `electron/modules/__tests__/*.test.js`

Lancer :

```bash
npm test
npm run test:coverage
```

Toujours mocker `LanguageContext` si le composant utilise `t()`.

---

## 🌿 Workflow Git

Branches : `main`, `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `test/<scope>`, `refactor/<scope>`.

Commits : Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`, `build`).

Exemples :

```
feat(sound-popup): ajouter la config grille 8 positions
fix(audio): empêcher la fuite mémoire sur stopAllSounds
test(sequencer): ajouter la couverture useSequencePlayer
```

---

## 🔌 Développement de plugins

Un plugin est une archive ZIP contenant `plugin.json`, `index.js` et optionnellement `pages/`.

Manifest minimal :

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Votre nom",
  "requires": ">=1.3.0",
  "pages": []
}
```

Point d'entrée :

```js
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [],
  async init(store, pluginManager) {},
  async destroy() {}
}
```

Hooks disponibles : `beforePageRender`, `onSoundPlay`, `onAppStart`, `onProfileSwitch`.

### Plugins Pro

Certains plugins nécessitent une licence Pro (`licenseRequired: true`). Un don unique débloque tous les plugins Pro à vie.

Pour tester localement :

```bash
node scripts/sign-license.mjs --dev --tier pro
```

---

## 🌍 Internationalisation

3 langues : FR, EN, ES. Ajouter une clé = la mettre dans **les 3** fichiers de locale + `npm run audit:i18n`.

Les plugins embarquent leur propre `i18n.js` à leur racine.

---

## 💖 Soutenir

SoundDeck est gratuit et open-source (MIT). Un don unique débloque tous les plugins Pro à vie, sans abonnement, sans compte.

Conservez votre fichier `.sdlicense` (email, gestionnaire de mots de passe, cloud) — il vous sera nécessaire si vous changez de PC.

---

## 🚀 Processus de Pull Request

1. Fork + branche depuis `main`
2. Code + tests
3. `npm test` + `npm run test:coverage` + `npx eslint src electron server website --fix`
4. Mettre à jour `CHANGELOG.md` sous `[Unreleased]`
5. Push + ouvrir une PR contre `main`
6. Attendre la review

Ce que les reviewers regardent : tests passent, pas de chaîne en dur, **JSDoc sur les nouvelles fonctions exportées** (voir [Commentaires & JSDoc](#-commentaires--jsdoc)), `data-testid` sur les nouveaux éléments interactifs, pas de `console.log`.

Critères de rejet : breaking change sans discussion, nouvelle dépendance injustifiée, refacto hors sujet, pas de tests, régression de couverture.

---

## 🙏 Merci

Chaque contribution, aussi petite soit-elle, aide à améliorer SoundDeck. Bon hacking ! 🎧