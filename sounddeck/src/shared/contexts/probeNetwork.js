/**
 * @file Network probe util — detects actual internet reachability.
 *
 * The browser's `navigator.onLine` is unreliable (it returns `true` if the
 * machine has any network interface active, even without actual reachability).
 * This module probes a few well-known URLs to detect actual connectivity.
 *
 * Probe strategy:
 * - If `navigator.onLine === false`, trust it (fast fail).
 * - Otherwise, try 3 favicon requests (Google, Cloudflare, MyInstants) with
 *   a 3-second timeout each. The first successful load wins.
 * - The result is cached for 3 seconds to avoid hammering on every call
 *   (e.g. multiple components calling `ensureOnline()` simultaneously).
 *
 * @see ./NetworkProvider.jsx — primary consumer
 */

const PROBE_URLS = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
  'https://www.myinstants.com/favicon.ico',
]

const PROBE_TIMEOUT_MS = 3000
const PROBE_CACHE_MS = 3000

let lastProbeTime = 0
let lastProbeResult = true

/**
 * Probes a single URL by loading it as an image.
 *
 * Uses `Image` (no CORS restriction for favicons) rather than `fetch()`
 * (which would be blocked by CORS on cross-origin URLs without proper
 * headers). The 3-second timeout prevents the probe from hanging on a
 * slow/blocked connection.
 *
 * @param {string} baseUrl - URL to probe (a cache-busting query is appended).
 * @returns {Promise<boolean>} `true` if the image loaded, `false` otherwise.
 */
function probeOneUrl(baseUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    let resolved = false

    const timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      img.onload = img.onerror = null
      img.src = ''
      resolve(false)
    }, PROBE_TIMEOUT_MS)

    img.onload = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      resolve(true)
    }

    img.onerror = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      resolve(false)
    }

    img.src = `${baseUrl}?_=${Date.now()}`
  })
}

/**
 * Probes for actual internet connectivity.
 *
 * Tries all URLs in `PROBE_URLS` sequentially and returns `true` as soon
 * as one succeeds (fail-fast on `navigator.onLine === false`).
 *
 * @returns {Promise<boolean>} `true` if internet is reachable.
 */
export async function probeNetwork() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }

  const now = Date.now()
  if (now - lastProbeTime < PROBE_CACHE_MS) {
    return lastProbeResult
  }

  for (const url of PROBE_URLS) {
    const ok = await probeOneUrl(url)
    if (ok) {
      lastProbeTime = now
      lastProbeResult = true
      return true
    }
  }

  lastProbeTime = now
  lastProbeResult = false
  return false
}

/**
 * Resets the probe cache so the next `probeNetwork()` call actually
 * re-checks connectivity (e.g. after a `window.online` event).
 *
 * @returns {void}
 */
export function resetProbeCache() {
  lastProbeTime = 0
  lastProbeResult = true
}

export default probeNetwork