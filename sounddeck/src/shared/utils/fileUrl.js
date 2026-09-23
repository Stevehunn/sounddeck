// src/shared/utils/fileUrl.js

/**
 * Construit une URL pour un fichier local.
 * - Si HTTP/HTTPS → tel quel
 * - Si déjà `sounddeck-local://` → tel quel
 * - Si `file://` → reconverti en sounddeck-local
 * - Sinon → converti en sounddeck-local
 *
 * @param {string} filePath
 * @returns {string|null}
 */
export function buildFileUrl(filePath) {
  if (!filePath) return null

  // URL distante → inchangée
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  // Déjà un sounddeck-local → inchangé
  if (filePath.startsWith('sounddeck-local://')) {
    return filePath
  }

  // file:///C:/... → reconvertir en sounddeck-local
  if (filePath.startsWith('file://')) {
    const withoutProtocol = filePath.replace(/^file:\/\/\/?/, '')
    return buildLocalUrl(withoutProtocol)
  }

  return buildLocalUrl(filePath)
}

function buildLocalUrl(filePath) {
  // Normalise les backslashes Windows → forward slashes
  const normalized = String(filePath).replace(/\\/g, '/')

  // Encode le path entier en une seule fois (comme un paramètre)
  // Note : on ne peut pas utiliser encodeURIComponent directement car il
  // encode aussi les `/`. On split par segment puis on réassemble.
  const parts = normalized.split('/')

  const encoded = parts
    .map((part) => {
      if (part === '') return part
      // Préserve `C:` tel quel (les `:` sont valides en path, mais pas
      // dans certaines URL — encodeURIComponent les convertit en %3A)
      if (/^[A-Za-z]:$/.test(part)) {
        return part.replace(':', '%3A')
      }
      return encodeURIComponent(part)
    })
    .join('/')

  return `sounddeck-local://file/${encoded}`
}

export default { buildFileUrl }