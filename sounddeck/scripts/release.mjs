// scripts/release.mjs
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist-electron')

const REPO = 'Stevehunn/sounddeck'

// ─── Helpers ─────────────────────────────────────────────────────────
const log = (emoji, msg) => console.log(`${emoji} ${msg}`)
const fail = (msg) => {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── 1. Vérif GH_TOKEN ───────────────────────────────────────────────
const token = process.env.GH_TOKEN
if (!token) {
  fail(
    'GH_TOKEN non défini.\n' +
    '   → Crée un token sur https://github.com/settings/tokens (scope "repo")\n' +
    '   → Puis : export GH_TOKEN=ghp_xxxxxxxxxxxxxxxx'
  )
}

// ─── 2. Version depuis package.json ──────────────────────────────────
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
)
const version = pkg.version
const tag = `v${version}`
log('📦', `Préparation de la release ${tag}`)

// ─── 3. Build ────────────────────────────────────────────────────────
log('🔨', 'Build (vite + electron-builder)…')
try {
  execSync('vite build && electron-builder --publish never', {
    stdio: 'inherit',
    cwd: ROOT,
    shell: true,
  })
} catch {
  fail('Le build a échoué.')
}

// ─── 4. Renommage des fichiers avec espaces ──────────────────────────
const renames = [
  [`SoundDeck Setup ${version}.exe`, `SoundDeck-Setup-${version}.exe`],
  [
    `SoundDeck Setup ${version}.exe.blockmap`,
    `SoundDeck-Setup-${version}.exe.blockmap`,
  ],
]

for (const [from, to] of renames) {
  const fromPath = path.join(DIST, from)
  const toPath = path.join(DIST, to)
  if (fs.existsSync(fromPath)) {
    if (fs.existsSync(toPath)) fs.unlinkSync(toPath)
    fs.copyFileSync(fromPath, toPath)
    log('📋', `Renommé : ${from} → ${to}`)
  }
}

// ─── 5. Fichiers à uploader ──────────────────────────────────────────
const filesToUpload = [
  `SoundDeck-Setup-${version}.exe`,
  `SoundDeck-Setup-${version}.exe.blockmap`,
  'latest.yml',
]

for (const f of filesToUpload) {
  const p = path.join(DIST, f)
  if (!fs.existsSync(p)) fail(`Fichier manquant : ${f}`)
}
log('✅', `${filesToUpload.length} fichiers présents`)

// ─── 6. Créer ou récupérer la release ────────────────────────────────
const apiBase = 'https://api.github.com'
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
}

log('🔍', `Vérification si ${tag} existe déjà…`)

let release
const checkRes = await fetch(
  `${apiBase}/repos/${REPO}/releases/tags/${tag}`,
  { headers }
)

if (checkRes.ok) {
  release = await checkRes.json()
  log('ℹ️', `Release ${tag} existe déjà (id=${release.id}). Mise à jour.`)
} else if (checkRes.status === 404) {
  log('🆕', `Création de la release ${tag}…`)
  const createRes = await fetch(`${apiBase}/repos/${REPO}/releases`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      name: `SoundDeck ${version}`,
      body: `Release ${version}`,
      draft: false,
      prerelease: false,
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    fail(`Impossible de créer la release : ${createRes.status} ${err}`)
  }
  release = await createRes.json()
  log('✅', `Release créée (id=${release.id})`)
} else {
  const err = await checkRes.text()
  fail(`Erreur API GitHub : ${checkRes.status} ${err}`)
}

// ─── 7. Supprimer les assets existants avec les mêmes noms ───────────
const assetsRes = await fetch(
  `${apiBase}/repos/${REPO}/releases/${release.id}/assets`,
  { headers }
)
const existingAssets = await assetsRes.json()
const wantedNames = new Set(filesToUpload)

for (const asset of existingAssets) {
  if (wantedNames.has(asset.name)) {
    log('🗑️', `Suppression de l'asset existant : ${asset.name}`)
    await fetch(
      `${apiBase}/repos/${REPO}/releases/assets/${asset.id}`,
      { method: 'DELETE', headers }
    )
  }
}

// ─── 8. Upload des assets ────────────────────────────────────────────
const uploadBase = 'https://uploads.github.com'

for (const filename of filesToUpload) {
  const filepath = path.join(DIST, filename)
  const stat = fs.statSync(filepath)
  const buf = fs.readFileSync(filepath)

  log('📤', `Upload de ${filename} (${fmtSize(stat.size)})…`)

  const uploadUrl = `${uploadBase}/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(filename)}`
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buf.length),
    },
    body: buf,
  })

  if (!res.ok) {
    const err = await res.text()
    fail(`Upload échoué pour ${filename} : ${res.status} ${err}`)
  }
  log('✅', `Uploadé : ${filename}`)
}

// ─── 9. Marquer comme "Latest" ───────────────────────────────────────
log('🏷️', 'Marquage comme Latest…')
const patchRes = await fetch(
  `${apiBase}/repos/${REPO}/releases/${release.id}`,
  {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ make_latest: 'true' }),
  }
)

if (!patchRes.ok) {
  const err = await patchRes.text()
  console.warn(`⚠️ Impossible de marquer comme Latest : ${patchRes.status} ${err}`)
} else {
  log('✅', 'Marqué comme Latest')
}

// ─── 10. Done ────────────────────────────────────────────────────────
log('🎉', `Release ${tag} publiée !`)
log('🔗', `https://github.com/${REPO}/releases/tag/${tag}`)