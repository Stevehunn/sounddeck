<div align="center">

# 🎧 SoundDeck

**Soundboard local pour Discord et autres applications de chat vocal**

[![Version](https://img.shields.io/badge/version-1.4.12-blue.svg)](https://github.com/Stevehunn/sounddeck/releases)
[![Tests](https://img.shields.io/badge/tests-5384%20%E2%9C%85-success.svg)](#tests)
[![Coverage](https://img.shields.io/badge/coverage-77.5%25-yellowgreen.svg)](#tests)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Website](https://img.shields.io/badge/website-sounddeck.stream-7c6ff7.svg)](https://sounddeck.stream)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Stevehunn)

*Un soundboard puissant, multiplateforme et extensible.*

**🌍 Langues :** [English](README.md) · **Français** · [Español](README.es.md)

</div>

---

## 🎯 C'est quoi SoundDeck ?

SoundDeck est un **soundboard local pour Discord** (et toute autre app de chat vocal) avec :

- 🎛️ Un **éditeur audio multi-piste** (timeline, effets, undo/redo)
- 🎹 Un **séquenceur de playlists** (délais personnalisés, boucle, shuffle)
- 🌐 Import **YouTube / MyInstants**
- 🔊 Un **mixeur micro + sons** intégré (Discord-ready, pas besoin de VoiceMeeter)
- 🧩 Un **système de plugins** (installation depuis URL ou `.sdplugin`)
- 🌍 **3 langues** : anglais, français, espagnol

**Gratuit et open source (MIT).** Les plugins Pro se débloquent à vie avec un don unique.

[**Télécharger →**](https://github.com/Stevehunn/sounddeck/releases/latest) · [**Site web →**](https://sounddeck.stream) · [**Sponsoriser →**](https://github.com/sponsors/Stevehunn)

---

## 📦 Structure du repo

Ce repo contient **3 sous-projets** :

```
sounddeck/
├── (racine)        ← App desktop (Electron + React + Vite)
├── server/         ← API Cloudflare Worker + base D1
├── website/        ← Site marketing (Astro + Tailwind)
└── scripts/        ← Scripts utilitaires (release, licences, plugins)
```

| Sous-projet | Tech | Déploiement |
|---|---|---|
| **App desktop** | Electron 42 + React 18 + Vite 8 | GitHub Releases |
| **API** | Cloudflare Workers + D1 | `api.sounddeck.stream` |
| **Site web** | Astro 5 + Tailwind 4 | Cloudflare Pages (`sounddeck.stream`) |

---

## ✨ Fonctionnalités

### 🎵 Bibliothèque de sons

- Import par **glisser-déposer**, dialog fichier ou URL
- Organisation par **profils** (Gaming, Musique, Memes…)
- **Favoris**, **tags**, recherche instantanée
- Compression automatique à l'import (optionnelle, via ffmpeg)

### 🎛️ Éditeur audio

- Timeline multi-pistes avec clips, fades, marqueurs
- Effets : Volume, Fade In/Out, Vitesse, Écho, Réverbération
- Boucles par clip ou globales (nombre de cycles personnalisable)
- Normalisation automatique du volume (Peak ou RMS)
- Undo/Redo, snap, crossfade automatique
- Export mixage final en MP3/WAV

### 🎹 Séquenceur

- Playlists de sons avec délais configurables
- Boucle et lecture aléatoire
- Réorganisation par drag & drop
- Navigation clavier ← →

### ✂️ Rogneur

- Waveform interactive avec poignées de sélection
- Écoute de la sélection avant création
- Formats : MP3, WAV, OGG, FLAC, M4A, AAC

### 🌐 Découverte & Import

- **MyInstants** : recherche et import direct depuis des milliers de sons
- **YouTube** : téléchargement audio (via yt-dlp)
- **Spotify / SoundCloud** : support partiel
- **Emoji picker** avec collections personnalisables

### 🔊 Audio & Discord

- 🪄 **Assistant de configuration rapide** — config Discord en un clic (détection auto CABLE Input, casque, micro)
- **Mixeur micro + sons** intégré (pas besoin de VoiceMeeter dans les cas simples)
- Compatible **VB-Cable** et **VoiceMeeter Banana**
- Monitoring (s'entendre dans le casque)
- Réduction de bruit micro (AudioWorklet ou filtre)
- Mode basse latence pour le gaming

### 🧩 Extensions

- **Système de plugins** complet avec `.sdplugin`
- Plugins intégrés : **YouTube**, **MyInstants**, **Emoji Discovery**
- Hooks (`beforePageRender`, `onSoundPlay`, `onAppStart`, `onProfileSwitch`)
- Versionning sémantique avec compatibilité

### 🎨 Interface

- 3 thèmes : Sombre, Clair, Personnalisé
- Sidebar éditable (ordre, visibilité, épinglage)
- Tutoriels interactifs pour chaque page
- Statistiques d'utilisation
- **Multilingue** : 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español

### 💾 Sauvegarde

- Auto-backup configurable (intervalle, nombre max)
- Export/Import : config JSON, archive complète, ou sons uniquement
- Synchronisation avec **OBS WebSocket**
- Alertes **Twitch** (follows, dons, subs)

### 🔄 Mise à jour automatique

- Auto-updater intégré (`electron-updater`)
- Banner de mise à jour dans la sidebar
- Téléchargement + installation en un clic
- Fonctionne hors-ligne jusqu'au clic de l'utilisateur

### 💎 Plugins Pro

Certains plugins nécessitent une **licence Pro**. Débloque-les tous **à vie** avec un **don unique de 5 € ou plus sur GitHub Sponsors**.

- ✅ Pas d'abonnement
- ✅ Fonctionne hors-ligne
- ✅ Valable à vie sur un nombre illimité de PC

[**Sponsoriser sur GitHub →**](https://github.com/sponsors/Stevehunn)

---

## 🚀 Installation

### Pour les utilisateurs

1. Télécharger la dernière version depuis [**Releases**](https://github.com/Stevehunn/sounddeck/releases/latest)
2. Lancer l'installateur (`.exe` sur Windows)
3. Suivre le tutoriel interactif au premier lancement
4. (Optionnel) [Sponsoriser sur GitHub](https://github.com/sponsors/Stevehunn) pour débloquer les plugins Pro

### Pour les développeurs

**Prérequis :**

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (optionnel, pour le rognage + compression)
- **yt-dlp** (optionnel, pour l'import YouTube)

```bash
# Cloner
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck

# Installer + lancer
npm install
npm run dev
```

> 📖 **Documentation développeur complète :** voir [DOCS.md](DOCS.md).

---

## 🧪 Tests

Le projet utilise **Vitest** pour les tests unitaires + d'intégration.

| Métrique | Valeur |
|---|---|
| **Tests totaux** | **5 384** ✅ |
| **Fichiers de test** | 240 |
| **Coverage statements** | 77.5 % |
| **Coverage branches** | 68.95 % |
| **Coverage fonctions** | 78.46 % |
| **Coverage lignes** | 79.09 % |

```bash
npm test                # Mode watch
npm run test:coverage   # Avec couverture
npm run test:ci         # Mode CI
```

---

## 🏗️ Architecture

```
sounddeck/
├── electron/                  # Processus principal Electron
│   ├── main.js
│   ├── preload.js
│   └── modules/
│       ├── autoUpdater.js     # electron-updater
│       ├── fileHandlers.js
│       ├── shortcutManager.js
│       └── ...
│
├── src/                       # Renderer React
│   ├── core/
│   │   ├── i18n/              # fr, en, es
│   │   ├── plugins/           # Moteur de plugins
│   │   ├── services/          # AudioService, AudioMixerService
│   │   └── store/             # State global
│   ├── features/              # Editor, Sequencer, Trimmer, etc.
│   └── shared/                # Composants, hooks, utils
│
├── server/                    # Cloudflare Worker + D1
│   ├── src/routes/            # login, signup, admin, etc.
│   ├── migrations/            # Migrations SQL D1
│   └── scripts/               # code.mjs, admin.mjs
│
├── website/                   # Site marketing Astro
│   ├── src/pages/             # index, /en, /es, /admin
│   └── src/components/        # Hero, Features, FAQ, etc.
│
└── scripts/                   # Scripts utilitaires
    ├── release.mjs
    ├── sign-license.mjs
    └── ...
```

**Principes d'architecture :**

- Séparation stricte : `electron/` (Node) vs `src/` (React/DOM)
- Context bridge : IPC sécurisé via `preload.js`
- Pas de `nodeIntegration` dans le renderer
- Services centralisés : toute la logique audio dans `core/services/`
- Alias Vite : `@core`, `@shared`, `@features`, `@plugins`

---

## 📜 Scripts npm

| Script | Description |
|---|---|
| `npm run dev` | Lance Electron + Vite en dev (HMR) |
| `npm run build` | Build production (Vite + electron-builder) |
| `npm run release` | Build + publication GitHub Releases |
| `npm test` | Tests en mode watch |
| `npm run test:coverage` | Tests + rapport de couverture |
| `npm run test:ci` | Tests + couverture (mode CI) |
| `npm run test:ui` | Interface graphique Vitest |
| `npm run build:plugin` | Build un plugin `.sdplugin` |
| `npm run audit:i18n` | Audit des traductions manquantes |

---

## 🔌 Système de plugins

Un plugin est une archive ZIP (`.sdplugin`) contenant :

```
my-plugin.sdplugin
├── plugin.json      # Manifest (id, name, version, author, pages…)
├── index.js         # Point d'entrée
└── pages/
    └── Discover.jsx # Composants React optionnels
```

**Manifest (`plugin.json`) :**

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Vous",
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

**Point d'entrée (`index.js`) :**

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

**Installation :** Options → Plugins → Installer un plugin.

---

## 🎧 Configuration Discord

### 🪄 Assistant rapide (recommandé)

Depuis la v1.4.12, SoundDeck propose une **configuration Discord en un clic** :

1. Installer **VB-Cable** et redémarrer le PC
2. Ouvrir **Options → Audio → Configuration rapide**
3. Cliquer sur **« Configuration auto Discord »**
4. SoundDeck sélectionne automatiquement :
   - Sortie → `CABLE Input`
   - Sortie locale → ton casque (vrai périphérique)
   - Micro → ton vrai micro
   - Active le mixeur, playLocally et la réduction de bruit
5. Cliquer sur **« Fait »** sur le bandeau de rappel Discord après avoir configuré Discord manuellement (Entrée = `CABLE Output`)

### Mode manuel (VB-Cable uniquement)

1. Installer **VB-Cable** depuis [vb-audio.com](https://vb-audio.com/Cable/)
2. Redémarrer le PC
3. **Options → Audio** :
   - Activer **Mixeur micro + sons**
   - Sélectionner votre micro
   - Sortie : `CABLE Input (VB-Audio Virtual Cable)`
   - Activer **Jouer en local aussi** → sélectionner votre casque
4. **Discord → Voix & Vidéo** :
   - Périphérique d'entrée : `CABLE Output (VB-Audio Virtual Cable)`
   - Périphérique de sortie : votre casque
   - Désactiver : Suppression de bruit, Annulation d'écho, Contrôle automatique de gain

### Mode avancé (VoiceMeeter Banana)

Consulter le **Guide Discord** intégré (page Guide dans l'app).

---

## 🌍 Internationalisation

Le projet supporte **3 langues** : EN, FR, ES.

**Ajouter une clé de traduction :**

1. Ajouter la clé dans les **3 fichiers** `src/core/i18n/locales/<lang>/<section>.js`
2. Lancer `npm run audit:i18n` pour vérifier

---

## 🤝 Contribuer

Les contributions sont bienvenues ! Voir [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md) pour :

- Le workflow Git
- Les conventions de code
- Les règles de tests (coverage min 75 %)
- Le processus de PR

**Avant de soumettre une PR :**

```bash
npm test              # Tous les tests verts
npm run test:coverage # Pas de régression
npx eslint src electron --fix
```

---

## 📄 Licence

MIT © 2026 Stevehunn

Voir [LICENSE](LICENSE) pour le texte complet.

---

## 🙏 Crédits

- **[Electron](https://www.electronjs.org/)** — Framework desktop
- **[React](https://react.dev/)** — UI
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Vitest](https://vitest.dev/)** — Tests
- **[Howler.js](https://howlerjs.com/)** — Lecture audio
- **[Tone.js](https://tonejs.github.io/)** — Web Audio
- **[Astro](https://astro.build/)** — Site web
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — API + D1
- **[Resend](https://resend.com/)** — Emails transactionnels
- **[Tabler Icons](https://tabler.io/icons)** — Icônes
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Extraction YouTube
- **[ffmpeg](https://ffmpeg.org/)** — Traitement audio
- **[VB-Audio](https://vb-audio.com/)** — Câble audio virtuel

---

<div align="center">

**Fait avec ❤️ pour la communauté Discord**

[Site web](https://sounddeck.stream) · [Signaler un bug](https://github.com/Stevehunn/sounddeck/issues) · [Releases](https://github.com/Stevehunn/sounddeck/releases)

</div>