// src/shared/utils/keyboardLayouts.js
// ─────────────────────────────────────────────────────────────────────────────
// ✅ Table canonique des positions QWERTY → AZERTY.
// Utilisée par KeyboardVisualizer ET ShortcutRecorder.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Position physique (QWERTY) → caractère affiché (AZERTY).
 * Ex: la touche physique 'Q' devient 'A' en AZERTY.
 */
export const PHYSICAL_TO_AZERTY = {
  // Rangée des chiffres
  '1': '&', '2': 'é', '3': '"', '4': "'", '5': '(',
  '6': '-', '7': 'è', '8': '_', '9': 'ç', '0': 'à',
  '-': ')', '=': '=',
  // Rangée des lettres
  'Q': 'A', 'W': 'Z', 'E': 'E', 'R': 'R', 'T': 'T',
  'Y': 'Y', 'U': 'U', 'I': 'I', 'O': 'O', 'P': 'P',
  'A': 'Q', 'S': 'S', 'D': 'D', 'F': 'F', 'G': 'G',
  'H': 'H', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M',
  'Z': 'W', 'X': 'X', 'C': 'C', 'V': 'V', 'B': 'B',
  'N': 'N',
  ';': 'M', "'": 'ù',
  ',': ',', '.': ';', '/': '!',
}

/**
 * AZERTY (caractère affiché) → position physique (QWERTY).
 * Inclus les variantes majuscules pour gérer eventToAccelerator.
 */
export const AZERTY_TO_PHYSICAL = (() => {
  const map = {}
  for (const [qwerty, azerty] of Object.entries(PHYSICAL_TO_AZERTY)) {
    map[azerty] = qwerty
    // Variante majuscule (ex: 'a' → 'Q')
    if (azerty.length === 1 && azerty.match(/[a-z]/)) {
      map[azerty.toUpperCase()] = qwerty
    }
  }
  // Lettres déjà en majuscules
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!map[letter]) {
      const lower = letter.toLowerCase()
      const found = Object.entries(PHYSICAL_TO_AZERTY).find(
        ([, v]) => v === lower
      )
      if (found) map[letter] = found[0]
    }
  }
  return map
})()

/**
 * Labels humains pour les modificateurs selon le layout.
 */
export function getModifierLabel(mod, layout = 'qwerty') {
  if (mod === 'CommandOrControl') return 'Ctrl'
  if (mod === 'Shift') return layout === 'azerty' ? 'Maj' : 'Shift'
  if (mod === 'Alt') return 'Alt'
  return mod
}

/**
 * Convertit une touche physique QWERTY en touche affichée selon le layout.
 */
export function displayKey(physicalKey, layout = 'qwerty') {
  if (layout === 'azerty') return PHYSICAL_TO_AZERTY[physicalKey] || physicalKey
  return physicalKey
}

/**
 * Convertit une touche affichée en position physique QWERTY.
 */
export function physicalKey(displayedKey, layout = 'qwerty') {
  if (layout === 'azerty') return AZERTY_TO_PHYSICAL[displayedKey] || displayedKey
  return displayedKey
}

export default {
  PHYSICAL_TO_AZERTY,
  AZERTY_TO_PHYSICAL,
  getModifierLabel,
  displayKey,
  physicalKey,
}