// server/src/routes/download.js
// GET /download/windows | /download/mac | /download/linux
// Redirige (302) vers le binaire GitHub Releases de la dernière version.

const GITHUB_API = 'https://api.github.com'
const REPO = 'Stevehunn/sounddeck'
const CACHE_TTL = 3600 // 1 heure

const PLATFORM_PATTERNS = {
  windows: /^SoundDeck-Setup-.*\.exe$/i,
  mac: /\.dmg$/i,
  linux: /\.AppImage$/i,
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleDownload(request, env, platform) {
  const pattern = PLATFORM_PATTERNS[platform]
  if (!pattern) {
    return jsonResponse(
      {
        error: 'unknown_platform',
        supported: Object.keys(PLATFORM_PATTERNS),
      },
      404
    )
  }

  // ─── 1. Récupère la release latest (avec cache 1h) ────────────────
  const cache = caches.default
  const origin = new URL(request.url).origin
  const cacheKey = new Request(
    `${origin}/__internal__/latest-release.json`,
    { method: 'GET' }
  )

  let releaseData = null
  const cached = await cache.match(cacheKey)
  if (cached) {
    releaseData = await cached.json()
  } else {
    // Prépare les headers GitHub (auth optionnelle pour éviter rate limit)
    const ghHeaders = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SoundDeck-Worker',
    }
    if (env.GITHUB_TOKEN) {
      ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`
    }

    const res = await fetch(`${GITHUB_API}/repos/${REPO}/releases/latest`, {
      headers: ghHeaders,
    })

    if (!res.ok) {
      console.error('GitHub API error:', res.status, await res.text())

      // ⚠️ Fallback : redirige vers la page des releases si l'API échoue
      // (rate limit, downtime GitHub, etc.)
      console.warn('[download] Fallback → page releases (API failed)')
      return Response.redirect(
        `https://github.com/${REPO}/releases/latest`,
        302
      )
    }

    releaseData = await res.json()

    try {
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(releaseData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${CACHE_TTL}`,
          },
        })
      )
    } catch (e) {
      console.warn('Cache put failed:', e.message)
    }
  }

  // ─── 2. Cherche l'asset correspondant à la plateforme ─────────────
  const assets = releaseData.assets || []
  const asset = assets.find((a) => pattern.test(a.name))

  if (!asset) {
    console.warn(
      'No asset for',
      platform,
      'in',
      releaseData.tag_name,
      '— assets:',
      assets.map((a) => a.name).join(', ')
    )

    // Fallback : renvoie vers la page releases
    return Response.redirect(
      `https://github.com/${REPO}/releases/tag/${releaseData.tag_name}`,
      302
    )
  }

  // ─── 3. Redirige (302) vers le fichier de la release ──────────────
  console.log(
    `[download] ${platform} → ${releaseData.tag_name} (${asset.name})`
  )
  return Response.redirect(asset.browser_download_url, 302)
}