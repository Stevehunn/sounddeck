# 📚 SoundDeck — Guide développeur

Documentation interne : toutes les commandes, tous les scripts, toutes les URLs.

> **Tu travailles dans `C:\Dev\Soundboard\sounddeck\`** (pas dans `Documents\`).

---

## 📖 Table des matières

- [Architecture globale](#architecture-globale)
- [🚀 Commandes de base](#-commandes-de-base)
- [🎵 App Electron](#-app-electron)
- [☁️ Server Cloudflare Worker](#-server-cloudflare-worker)
- [🌐 Website Astro](#-website-astro)
- [🔧 Scripts racine](#-scripts-racine)
- [🔐 Secrets & credentials](#-secrets--credentials)
- [🛠️ Workflows courants](#-workflows-courants)

---

## Architecture globale

```
sounddeck/                       ← racine du repo git
├── package.json                 ← app Electron (main)
├── electron/                    ← main process Electron
├── src/                         ← renderer React
├── website/                     ← site marketing Astro
├── server/                      ← Worker Cloudflare + D1
├── scripts/                     ← scripts Node utilitaires
├── public/                      ← assets statiques de l'app
└── resources/                   ← pilotes, ressources bundlées
```

**URLs clés :**

| Service | URL |
|---|---|
| Site web | `https://sounddeck.stream` |
| API Worker | `https://api.sounddeck.stream` |
| GitHub | `https://github.com/Stevehunn/sounddeck` |
| Sponsors | `https://github.com/sponsors/Stevehunn` |
| Admin panel | `https://sounddeck.stream/admin/` |
| CF Pages dashboard | `https://dash.cloudflare.com` → Workers & Pages |

---

## 🚀 Commandes de base

Toutes ces commandes se lancent **depuis `sounddeck/`** (racine du projet app) sauf mention contraire.

```bash
# Lancer l'app en dev (Electron + Vite)
npm run dev

# Tests (Vitest, mode watch)
npm test

# Tests + coverage
npm run test:coverage

# Build de production (sans publish)
npm run build

# Build + release GitHub (publication auto)
npm run release

# Vérifier les traductions i18n
npm run audit:i18n
```

---

## 🎵 App Electron

### Scripts `package.json`

| Commande | Description |
|---|---|
| `npm run dev` | Lance Vite + Electron en parallèle (HMR) |
| `npm run build` | Build Vite + electron-builder (génère `dist-electron/`) |
| `npm run release` | **Build + upload auto sur GitHub Releases** (nécessite `GH_TOKEN`) |
| `npm test` | Lance les tests en mode watch |
| `npm run test:coverage` | Tests + rapport de couverture HTML |
| `npm run test:ci` | Tests + coverage (mode CI, exit on fail) |
| `npm run test:ui` | Interface graphique Vitest |
| `npm run build:plugin` | Build un plugin `.sdplugin` |
| `npm run audit:i18n` | Audit des clés i18n manquantes |
| `npm run license:keypair` | Génère une paire de clés Ed25519 (une seule fois) |
| `npm run license:sign` | Signe un token de licence |
| `npm run license:verify` | Vérifie un token de licence |

### Structure

```
sounddeck/
├── electron/                  ← Main process (Node.js)
│   ├── main.js                ← Entry point
│   ├── preload.js             ← Context bridge sécurisé
│   ├── store.js               ← Wrapper electron-store
│   ├── i18n.js                ← Traductions main process
│   ├── feedback-config.js     ← Webhooks Discord feedback (gitignore)
│   └── modules/
│       ├── autoUpdater.js     ← electron-updater
│       ├── fileHandlers.js
│       ├── storeHandlers.js
│       ├── projectHandlers.js
│       ├── windowManager.js
│       ├── trayManager.js
│       ├── shortcutManager.js
│       ├── protocolHandler.js
│       ├── soundPopupManager.js
│       └── diagnostic.js
│
├── src/                       ← Renderer (React)
│   ├── main.jsx
│   ├── App.jsx
│   ├── core/
│   │   ├── i18n/              ← Langues (fr/en/es)
│   │   ├── plugins/           ← Système de plugins
│   │   ├── services/          ← AudioService, AudioMixerService
│   │   └── store/             ← State global (React hooks)
│   ├── features/              ← Pages métier
│   ├── plugins/               ← Plugins intégrés (youtube, myinstants, emoji)
│   └── shared/                ← Composants, hooks, utils
│
└── public/                    ← Assets statiques
```

### Alias Vite

| Alias | Path |
|---|---|
| `@` | `./src` |
| `@core` | `./src/core` |
| `@shared` | `./src/shared` |
| `@features` | `./src/features` |
| `@plugins` | `./src/plugins` |

### Auto-update (electron-updater)

- **Fichier clé** : `electron/modules/autoUpdater.js`
- **Config dans `package.json`** : bloc `build.publish` (provider GitHub)
- **Check auto** : 5 secondes après le lancement (prod uniquement)
- **UI** : banner dans la sidebar (`UpdateBanner` dans `Sidebar.jsx`)
- **Hook React** : `src/shared/hooks/useAutoUpdater.js`

### Workflow release

Voir la section [🚀 Release d'une nouvelle version](#-release-dune-nouvelle-version).

---

## ☁️ Server Cloudflare Worker

### Dossier

```
server/
├── wrangler.toml              ← Config Worker (name, routes, D1)
├── package.json
├── .dev.vars                  ← Secrets locaux (gitignore)
├── migrations/                ← Migrations SQL D1
│   ├── 0001_init.sql
│   ├── 0002_redeem_codes.sql
│   ├── 0003_pending_sponsorships.sql
│   ├── 0004_users_email_verified.sql
│   └── 0005_password_resets.sql
├── scripts/
│   ├── code.mjs               ← CLI codes de rédemption
│   └── admin.mjs              ← CLI admin (users)
└── src/
    ├── index.js               ← Router principal
    ├── lib/
    │   ├── crypto.js          ← Ed25519, PBKDF2, HMAC
    │   ├── db.js              ← Helpers D1
    │   ├── email.js           ← Templates Resend
    │   ├── license.js         ← Sign/verify tokens
    │   └── codeGen.js         ← Génération de codes
    └── routes/
        ├── health.js
        ├── login.js
        ├── signup.js
        ├── forgot-password.js
        ├── reset-password.js
        ├── redeem.js
        ├── claim.js
        ├── admin.js
        ├── stripe-webhook.js
        └── github-webhook.js
```

### Commandes

```bash
cd server/

# ─── DEV ────────────────────────────────────────────────────
npm run dev                    # Worker local sur http://127.0.0.1:8787
npx wrangler tail              # Logs temps réel de la prod
npx wrangler tail --format pretty

# ─── DEPLOY ─────────────────────────────────────────────────
npx wrangler deploy            # Deploy en prod
npx wrangler whoami            # Compte Cloudflare actif

# ─── D1 DATABASE ────────────────────────────────────────────
# Exécuter une query (prod)
npx wrangler d1 execute sounddeck-db --remote --command="SELECT * FROM users;"

# Exécuter une query (local)
npx wrangler d1 execute sounddeck-db --local --command="SELECT * FROM users;"

# Appliquer une migration
npx wrangler d1 execute sounddeck-db --remote --file=migrations/0001_init.sql

# Backup de la DB (prod)
npx wrangler d1 export sounddeck-db --remote --output=backup.sql

# ─── SECRETS ────────────────────────────────────────────────
npx wrangler secret list       # Liste les secrets configurés
npx wrangler secret put ADMIN_TOKEN          # Définit un secret (prompt interactif)
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put PRIVATE_KEY_HEX
npx wrangler secret delete ADMIN_TOKEN
```

### Routes disponibles

#### Public

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/health` | Status + version |
| `POST` | `/signup` | Crée un compte (`tier: free`, `email_verified: 0`) |
| `GET` | `/verify-email?token=X` | Vérifie l'email + affiche page HTML |
| `POST` | `/forgot-password` | Envoie un lien de reset par email |
| `GET` | `/reset-password?token=X` | Affiche formulaire HTML de reset |
| `POST` | `/reset-password` | Change le password |
| `POST` | `/login` | Login (email + password) → token Ed25519 |
| `POST` | `/redeem` | Redeem un code `SDCK-XXXX-XXXX-XXXX` |
| `POST` | `/claim-sponsorship` | Claim un sponsorship GitHub pending |
| `POST` | `/webhook/stripe` | Webhook Stripe (dormant) |
| `POST` | `/webhook/github-sponsor` | Webhook GitHub Sponsors |

#### Admin (Bearer token requis)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/admin/generate-code` | Génère un code `SDCK-XXXX-XXXX-XXXX` |
| `GET` | `/admin/list-codes` | Liste les codes |
| `POST` | `/admin/revoke-code` | Révoque un code |
| `POST` | `/admin/create-user` | Crée un user (email + password + tier) |
| `POST` | `/admin/reset-password` | Reset le password d'un user |
| `GET` | `/admin/list-users` | Liste les users |

### CLI scripts

#### `scripts/code.mjs` — Gestion des codes de rédemption

```bash
cd server/

# Générer un code
node scripts/code.mjs generate --email user@example.com --expires 30d --note "Sponsor GitHub"

# Options :
#   --email <email>       Limite l'usage à cet email (optionnel)
#   --expires <durée>     30d, 90d, 1y… (défaut : 30d)
#   --note <texte>        Note interne (optionnel)
#   --no-email            Ne pas envoyer l'email automatiquement
#   --tier <pro|free>     Défaut : pro

# Lister tous les codes
node scripts/code.mjs list

# Lister seulement les codes actifs
node scripts/code.mjs list --unused

# Révoquer un code
node scripts/code.mjs revoke SDCK-XXXX-XXXX-XXXX
```

#### `scripts/admin.mjs` — Gestion des users

```bash
cd server/

# Lister tous les users
node scripts/admin.mjs list-users

# Créer un user (bypass signup, directement vérifié)
node scripts/admin.mjs create-user --email user@example.com --password Pass123! --tier pro

# Reset le password d'un user
node scripts/admin.mjs reset-password --email user@example.com --password NewPass456!
```

**⚠️ `ADMIN_TOKEN` doit être dans `server/.dev.vars`** pour que ces scripts marchent.

### Structure D1 (base `sounddeck-db`)

| Table | Contenu |
|---|---|
| `users` | id, email, password_hash, password_salt, donor_id, donor_name, tier, email_verified, verify_token, created_at, updated_at |
| `payments` | Historique Stripe |
| `audit_log` | Tous les événements sensibles |
| `redeem_codes` | Codes `SDCK-XXXX-XXXX-XXXX` |
| `pending_sponsorships` | Sponsorships GitHub à réclamer |
| `password_resets` | Tokens de reset password |

---

## 🌐 Website Astro

### Dossier

```
website/
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── logo.png
│   ├── logo-icon.png
│   ├── robots.txt
│   ├── _headers
│   ├── screenshots/
│   └── admin/                 ← page admin (servie telle quelle)
└── src/
    ├── i18n/
    │   ├── fr.json
    │   ├── en.json
    │   ├── es.json
    │   ├── index.ts
    │   └── utils.ts
    ├── layouts/
    │   └── BaseLayout.astro
    ├── components/
    │   ├── Navbar.astro
    │   ├── Hero.astro
    │   ├── Features.astro
    │   ├── Showcase.astro
    │   ├── HowItWorks.astro
    │   ├── ProPlugins.astro
    │   ├── FAQ.astro
    │   ├── Footer.astro
    │   └── LanguageSwitcher.astro
    ├── pages/
    │   ├── index.astro         ← FR (défaut)
    │   ├── en/index.astro
    │   ├── es/index.astro
    │   └── admin/index.astro   ← Dashboard admin
    └── styles/
        └── global.css
```

### Commandes

```bash
cd website/

# DEV (port 4321)
npm run dev                    # → http://localhost:4321

# BUILD (génère dist/)
npm run build                  # → dist/ (4 pages : FR, EN, ES, admin)

# PREVIEW (servir le build localement)
npm run preview
```

### Déploiement Cloudflare Pages

- **Repo** : `Stevehunn/sounddeck`
- **Root directory** : `sounddeck/website`
- **Build command** : `npm install && npm run build`
- **Build output directory** : `dist`
- **Node version** : `20` (variable d'env `NODE_VERSION=20`)
- **Auto-deploy** : à chaque `git push` sur `main`

### Page admin (`/admin/`)

- **URL** : `https://sounddeck.stream/admin/`
- **Sécurité** : `noindex, nofollow` + `robots.txt` + `ADMIN_TOKEN` requis
- **Features** :
  - Login par token (sessionStorage)
  - Stats (users, pro, free, codes actifs)
  - Table users (avec bouton Reset password)
  - Table codes (avec Copier / Révoquer)
  - Boutons "Créer un utilisateur" et "Générer un code"
- **Token à utiliser** : celui de `wrangler secret list` (variable `ADMIN_TOKEN`)

### Robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://sounddeck.stream/sitemap-index.xml
```

---

## 🔧 Scripts racine

Dossier `scripts/` à la racine de `sounddeck/` :

| Script | Usage | Description |
|---|---|---|
| `generate-keypair.mjs` | `node scripts/generate-keypair.mjs` | Génère la paire Ed25519 (une seule fois) |
| `sign-license.mjs` | `node scripts/sign-license.mjs --email x@y.z` | Signe un token de licence |
| `sign-license.mjs --dev` | `node scripts/sign-license.mjs --dev` | Licence de dev (no donor) |
| `verify-license.mjs` | `node scripts/verify-license.mjs --last` | Vérifie le dernier token signé |
| `release.mjs` | `npm run release` | Build + upload GitHub Releases |
| `build-plugin.mjs` | `npm run build:plugin` | Build un plugin `.sdplugin` |
| `audit-i18n.mjs` | `npm run audit:i18n` | Audit des traductions manquantes |

### `release.mjs` — Release automatique

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxx     # Scope "repo" obligatoire
npm run release
```

**Ce que ça fait :**
1. Bump la version dans `package.json`
2. Build Vite + electron-builder (`--publish never`)
3. Renomme `SoundDeck Setup X.Y.Z.exe` → `SoundDeck-Setup-X.Y.Z.exe` (tirets pour l'auto-update)
4. Crée la release sur GitHub (via API)
5. Upload les 3 fichiers : `.exe`, `.exe.blockmap`, `latest.yml`
6. Marque automatiquement comme "Latest"

**Résultat** : release publiée sur GitHub, prête pour l'auto-update.

### `sign-license.mjs` — Signer une licence

```bash
# Nouveau donateur
node scripts/sign-license.mjs --email user@example.com --name "Steve" --amount 10

# Ré-émettre un token existant
node scripts/sign-license.mjs --donorId <uuid>

# Licence de dev (pour tester offline)
node scripts/sign-license.mjs --dev
```

Le token est écrit dans `~/.sounddeck/last-license.txt` (format `SDCK1.<payload>.<sig>`).

### `verify-license.mjs` — Vérifier une licence

```bash
# Vérifie la dernière licence générée
node scripts/verify-license.mjs --last

# Vérifie un token précis
node scripts/verify-license.mjs "SDCK1.xxx.yyy"

# Vérifie depuis un fichier
node scripts/verify-license.mjs --file /path/to/license.txt
```

---

## 🔐 Secrets & credentials

### Où ils sont

| Secret | Local | Prod (Cloudflare) | Gitignore |
|---|---|---|---|
| Clé privée Ed25519 | `~/.sounddeck/keys/private.key` | `PRIVATE_KEY_HEX` (secret) | ✅ |
| Clé publique Ed25519 | `~/.sounddeck/keys/public.key` | `licenseKeys.js` (hardcodée) | ❌ (publique) |
| Webhook GitHub | `server/.dev.vars` | `GITHUB_SPONSOR_WEBHOOK_SECRET` | ✅ |
| API Resend | `server/.dev.vars` | `RESEND_API_KEY` | ✅ |
| Stripe webhook | `server/.dev.vars` | `STRIPE_WEBHOOK_SECRET` (dormant) | ✅ |
| Admin API | `server/.dev.vars` | `ADMIN_TOKEN` | ✅ |
| Webhooks Discord feedback | `electron/feedback-config.js` | (bundlé dans l'app) | ✅ |
| GH_TOKEN (build local) | `~/.bashrc` | (n/a) | ✅ |

### ⚠️ Règles à ne jamais oublier

1. **`~/.sounddeck/keys/private.key`** → **backup obligatoire** dans un gestionnaire de mots de passe. Si perdue = toutes les licences invalides.
2. **`.dev.vars` + `server/.wrangler/`** → gitignored, ne jamais commiter.
3. **`electron/feedback-config.js`** → gitignored (contient des webhooks Discord sensibles).
4. **`GH_TOKEN`** → ne jamais commiter. À mettre dans `~/.bashrc`.
5. **`coverage/`** → gros, gitignored.

---

## 🛠️ Workflows courants

### Démarrer une session de dev

```bash
cd /c/Dev/Soundboard/sounddeck

# Terminal 1 : App Electron
npm run dev

# Terminal 2 (optionnel) : Worker local
cd server && npm run dev

# Terminal 3 (optionnel) : Website
cd website && npm run dev
```

### Tester une modification du worker

```bash
cd server/
npm run dev                    # Terminal 1
# ... modifier le code ...
# Ctrl+C, puis :
npx wrangler deploy            # Déployer en prod
```

### Voir les logs de la prod

```bash
cd server/
npx wrangler tail              # Laisse tourner, affiche les logs en temps réel
```

### Ajouter un user manuellement

```bash
cd server/
node scripts/admin.mjs create-user --email user@example.com --password Pass123! --tier pro
```

### Générer un code de rédemption

```bash
cd server/
node scripts/code.mjs generate --email user@example.com --expires 30d
```

### 🚀 Release d'une nouvelle version

```bash
# 1. S'assurer que GH_TOKEN est défini
echo $GH_TOKEN
# Si vide : export GH_TOKEN=ghp_xxx (à mettre dans ~/.bashrc pour persister)

# 2. Bump la version dans package.json
# Ex : "version": "1.4.12" → "1.4.13"

# 3. Lancer la release (build + upload auto)
cd /c/Dev/Soundboard/sounddeck
npm run release

# 4. Vérifier sur GitHub
# https://github.com/Stevehunn/sounddeck/releases
# → doit être marqué "Latest"
```

### Déployer le site web

```bash
# 1. Modifier les fichiers dans website/

# 2. Test local
cd website/
npm run dev

# 3. Commit + push
cd /c/Dev/Soundboard
git add website/
git commit -m "feat(website): ..."
git push origin main

# 4. Cloudflare Pages auto-deploy (2-4 min)
# Vérifier sur https://dash.cloudflare.com → Workers & Pages → sounddeck-website
```

### Ajouter une clé i18n

1. Ajouter dans **les 3 fichiers** `src/core/i18n/locales/{fr,en,es}/<section>.js`
2. Lancer `npm run audit:i18n` pour vérifier

### Backup la DB D1

```bash
cd server/
npx wrangler d1 export sounddeck-db --remote --output=backup-$(date +%Y%m%d).sql
```

### Restaurer un backup D1

```bash
cd server/
npx wrangler d1 execute sounddeck-db --remote --file=backup-20261016.sql
```

---

## 🐛 Bugs connus & solutions

### `EPERM: operation not permitted` sur Windows

**Cause** : ESET antivirus bloque les fichiers dans `Documents\`.

**Solution** : le projet est maintenant dans `C:\Dev\Soundboard\`. Ne jamais revenir dans `Documents\`.

### `npm install` échoue sur `symlink`

**Cause** : antivirus ou ACL Windows.

**Solution** : utiliser `pnpm install` au lieu de `npm install` dans `website/`.

### Le worker ne répond pas sur `api.sounddeck.stream`

**Vérifier** :
```bash
curl https://api.sounddeck.stream/health
# → doit retourner {"status":"ok","version":"X.Y.Z"}
```

Si erreur : `cd server && npx wrangler deploy`.

### Auto-update ne fonctionne pas

**Vérifier** :
1. Le repo GitHub est **public**
2. La release est **publiée** (pas en draft)
3. La release est marquée **"Latest"**
4. Les 3 fichiers sont uploadés (`.exe`, `.exe.blockmap`, `latest.yml`)

---

## 📚 Ressources

- **Astro** : https://docs.astro.build
- **Cloudflare Workers** : https://developers.cloudflare.com/workers/
- **Cloudflare D1** : https://developers.cloudflare.com/d1/
- **Resend** : https://resend.com/docs
- **electron-updater** : https://www.electron.build/auto-update
- **Vitest** : https://vitest.dev

---

**Dernière mise à jour** : 16 octobre 2026