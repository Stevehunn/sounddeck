/**
 * @file Local file URL builder (custom `sounddeck-local://` protocol).
 *
 * Files are served through a custom Electron protocol instead of `file://`
 * because `file://` URLs are blocked by the renderer's CSP in production.
 *
 * The helper normalizes input paths (Windows backslashes, `file://`
 * prefix) and produces a URL of the form:
 *
 *   `sounddeck-local://file/<encoded-path>`
 *
 * - `http(s)://` URLs are returned as-is (remote sounds).
 * - Already-`sounddeck-local://` URLs are returned as-is.
 * - `file:///C:/...` is re-encoded into the custom protocol.
 *
 * @see electron/modules/protocolHandler.js (server side)
 * @see @shared/utils/audioContext.js (consumer)
 */

/**
 * Builds a `sounddeck-local://` URL from a local file path.
 *
 * @param {string} filePath - Local path, `file://` URL, or remote URL.
 * @returns {string|null} The URL, or `null` if `filePath` is falsy.
 */
export function buildFileUrl(filePath) {
  if (!filePath) return null

  // Remote URL: return unchanged
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  // Already a sounddeck-local URL: return unchanged
  if (filePath.startsWith('sounddeck-local://')) {
    return filePath
  }

  // file:///C:/... → re-encode into sounddeck-local
  if (filePath.startsWith('file://')) {
    const withoutProtocol = filePath.replace(/^file:\/\/\/?/, '')
    return buildLocalUrl(withoutProtocol)
  }

  return buildLocalUrl(filePath)
}

/**
 * Encodes a filesystem path into a `sounddeck-local://file/...` URL.
 *
 * Splits on `/` and encodes each segment individually so that `:` in the
 * drive letter (e.g. `C:`) survives as `%3A`, while `/` separators are
 * preserved.
 *
 * @param {string} filePath
 * @returns {string}
 */
function buildLocalUrl(filePath) {
  // Normalize Windows backslashes → forward slashes
  const normalized = String(filePath).replace(/\\/g, '/')

  const parts = normalized.split('/')

  const encoded = parts
    .map((part) => {
      if (part === '') return part
      // Preserve `C:` as `C%3A` (valid in path segments)
      if (/^[A-Za-z]:$/.test(part)) {
        return part.replace(':', '%3A')
      }
      return encodeURIComponent(part)
    })
    .join('/')

  return `sounddeck-local://file/${encoded}`
}

export default { buildFileUrl }