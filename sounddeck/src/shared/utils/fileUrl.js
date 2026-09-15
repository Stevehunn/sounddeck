// src/shared/utils/fileUrl.js

/**
 * Construit une URL `file://` valide à partir d'un chemin Windows/Unix.
 * - Si le chemin commence déjà par `file://` ou `http`, on le renvoie tel quel
 * - Sinon on encode chaque segment pour gérer les espaces et caractères spéciaux
 * - On préserve le format des lettres de lecteur (`C:`)
 *
 * @param {string} filePath
 * @returns {string|null}
 */
export function buildFileUrl(filePath) {
  if (!filePath) return null
  if (filePath.startsWith('file://') || filePath.startsWith('http')) {
    return filePath
  }

  const normalized = String(filePath).replace(/\\/g, '/')
  const parts = normalized.split('/')

  const encoded = parts
    .map((part) => {
      if (part === '') return part
      if (/^[A-Za-z]:$/.test(part)) return part
      return encodeURIComponent(part)
    })
    .join('/')

  return 'file:///' + encoded
}

export default { buildFileUrl }