/**
 * @file Download route — redirects to the latest GitHub Release asset for a
 * given platform (Windows / macOS / Linux).
 *
 * The GitHub Release assets include version numbers in their filenames
 * (e.g. `SoundDeck-Setup-1.4.12.exe`), so we cannot hardcode the URL.
 * Instead, we query the GitHub API for the "latest" release, find the
 * matching asset, and return a 302 redirect to it.
 *
 * The GitHub API response is cached for 1 hour (Cloudflare Cache API) to
 * stay well under the rate limit. If a GITHUB_TOKEN secret is provided,
 * the rate limit goes from 60 to 5000 requests/hour.
 *
 * If the GitHub API fails or no matching asset is found, we redirect to
 * the releases page as a graceful fallback (better UX than a 502/404).
 */

const GITHUB_API = "https://api.github.com";
const REPO = "Stevehunn/sounddeck";
const CACHE_TTL = 3600; // 1 hour

/**
 * Regex patterns used to identify the asset for each supported platform.
 * The files in a GitHub Release have names like:
 *   - Windows: `SoundDeck-Setup-1.4.12.exe`
 *   - macOS:   `SoundDeck-1.4.12.dmg`
 *   - Linux:   `SoundDeck-1.4.12.AppImage`
 */
const PLATFORM_PATTERNS = {
  windows: /^SoundDeck-Setup-.*\.exe$/i,
  mac: /\.dmg$/i,
  linux: /\.AppImage$/i,
};

/**
 * Returns a JSON `Response` with the given payload and status code.
 *
 * @param {unknown} data - Any JSON-serializable value.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response}
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handles `GET /download/:platform`.
 *
 * Steps:
 * 1. Look up the latest GitHub Release (cached 1h via Cloudflare Cache API).
 * 2. Find the asset whose filename matches the platform pattern.
 * 3. Return a 302 redirect to the asset's browser_download_url.
 *
 * Fallbacks (both 302):
 * - If the GitHub API returns an error → redirect to `/releases/latest`.
 * - If no asset matches the platform → redirect to the tag's release page.
 *
 * @param {Request} request - Incoming Cloudflare Worker request.
 * @param {Object} env - Worker environment bindings.
 * @param {string} [env.GITHUB_TOKEN] - Optional GitHub token (raises rate limit).
 * @param {string} platform - One of `"windows"`, `"mac"`, `"linux"`.
 * @returns {Promise<Response>} - 302 redirect, or 404 if platform is unknown.
 */
export async function handleDownload(request, env, platform) {
  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return jsonResponse(
      {
        error: "unknown_platform",
        supported: Object.keys(PLATFORM_PATTERNS),
      },
      404,
    );
  }

  // ─── 1. Fetch (or read from cache) the latest release ────────────
  const cache = caches.default;
  const origin = new URL(request.url).origin;
  const cacheKey = new Request(`${origin}/__internal__/latest-release.json`, {
    method: "GET",
  });

  let releaseData;
  const cached = await cache.match(cacheKey);
  if (cached) {
    releaseData = await cached.json();
  } else {
    // Prepare GitHub API headers (auth is optional but strongly recommended)
    const ghHeaders = {
      Accept: "application/vnd.github+json",
      "User-Agent": "SoundDeck-Worker",
    };
    if (env.GITHUB_TOKEN) {
      ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`${GITHUB_API}/repos/${REPO}/releases/latest`, {
      headers: ghHeaders,
    });

    if (!res.ok) {
      console.error("GitHub API error:", res.status, await res.text());
      // Fallback: go to the "latest release" page on GitHub
      console.warn("[download] Fallback → releases page (API failed)");
      return Response.redirect(
        `https://github.com/${REPO}/releases/latest`,
        302,
      );
    }

    releaseData = await res.json();

    // Best-effort cache write (never fail the request over this)
    try {
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(releaseData), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `max-age=${CACHE_TTL}`,
          },
        }),
      );
    } catch (e) {
      console.warn("Cache put failed:", e.message);
    }
  }

  // ─── 2. Find the asset matching the requested platform ───────────
  const assets = releaseData.assets || [];
  const asset = assets.find((a) => pattern.test(a.name));

  if (!asset) {
    console.warn(
      "No asset for",
      platform,
      "in",
      releaseData.tag_name,
      "— assets:",
      assets.map((a) => a.name).join(", "),
    );
    // Fallback: go to the release tag page on GitHub
    return Response.redirect(
      `https://github.com/${REPO}/releases/tag/${releaseData.tag_name}`,
      302,
    );
  }

  // ─── 3. Redirect to the asset's direct download URL ──────────────
  console.log(
    `[download] ${platform} → ${releaseData.tag_name} (${asset.name})`,
  );
  return Response.redirect(asset.browser_download_url, 302);
}
