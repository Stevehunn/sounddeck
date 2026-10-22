/**
 * @file Path normalization helpers.
 *
 * Windows paths use backslashes, but the app always stores and compares
 * paths using forward slashes (the protocol handler, IPC, and the store
 * all expect POSIX-style separators). `normalizePath` is the single point
 * where this conversion happens.
 *
 * @see @shared/utils/fileUrl.js (consumes normalized paths)
 * @see src/core/store/hooks/useSounds.js (uses normalizePath on import)
 */

/**
 * Normalizes a path by converting backslashes to forward slashes.
 *
 * @param {string} p - Path (may contain Windows backslashes).
 * @returns {string|undefined} The normalized path (`undefined` for falsy input).
 */
export function normalizePath(p) {
  return p ? p.replace(/\\/g, '/') : p
}

/**
 * Extracts the file name (with extension) from a full path.
 *
 * @param {string} filePath
 * @returns {string} The last path segment, or `''` for empty input.
 */
export function getFileNameFromPath(filePath) {
  if (!filePath) return ''
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

/**
 * Extracts the file extension (lowercased, without the dot).
 *
 * @param {string} filePath
 * @returns {string} The extension (e.g. `'mp3'`), or `''` if none.
 */
export function getFileExtension(filePath) {
  if (!filePath) return ''
  const fileName = getFileNameFromPath(filePath)
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}