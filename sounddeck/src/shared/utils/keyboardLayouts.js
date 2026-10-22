/**
 * @file QWERTY ↔ AZERTY physical-key mapping.
 *
 * Single source of truth for layout-dependent key translation, shared
 * between:
 * - **`KeyboardVisualizer`** — displays the keyboard with the right labels.
 * - **`ShortcutRecorder`** — converts `keydown` events into layout-independent
 *   accelerators.
 *
 * ## Why physical ↔ display matters
 *
 * Electron accelerators always store **physical QWERTY key names** (e.g.
 * `"Q"`), regardless of the user's keyboard layout. This ensures shortcuts
 * keep working if the user switches layout later.
 *
 * But the UI must display the **AZERTY** character (e.g. `"A"`) for a French
 * user. That's what these maps are for:
 *
 * - `PHYSICAL_TO_AZERTY` — `"Q" → "A"` (display a QWERTY key as its AZERTY
 *   equivalent).
 * - `AZERTY_TO_PHYSICAL` — `"A" → "Q"` (convert an AZERTY key press back to
 *   its physical QWERTY name).
 */

/**
 * Physical QWERTY key → AZERTY display character.
 *
 * @type {Record<string, string>}
 */
export const PHYSICAL_TO_AZERTY = {
  // Number row
  '1': '&', '2': 'é', '3': '"', '4': "'", '5': '(',
  '6': '-', '7': 'è', '8': '_', '9': 'ç', '0': 'à',
  '-': ')', '=': '=',
  // Letter rows
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
 * AZERTY display character → physical QWERTY key.
 *
 * Built once from `PHYSICAL_TO_AZERTY` (reverse + uppercase variants).
 *
 * @type {Record<string, string>}
 */
export const AZERTY_TO_PHYSICAL = (() => {
  const map = {}
  for (const [qwerty, azerty] of Object.entries(PHYSICAL_TO_AZERTY)) {
    map[azerty] = qwerty
    // Uppercase variant (e.g. `a` → `Q`)
    if (azerty.length === 1 && azerty.match(/[a-z]/)) {
      map[azerty.toUpperCase()] = qwerty
    }
  }
  // Uppercase letters already in uppercase in PHYSICAL_TO_AZERTY
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
 * Human-readable label for a modifier accelerator, per layout.
 *
 * @param {string} mod - Accelerator modifier (e.g. `"CommandOrControl"`).
 * @param {'qwerty'|'azerty'} [layout='qwerty']
 * @returns {string} Label (e.g. `"Ctrl"`, `"Maj"`, `"Alt"`).
 */
export function getModifierLabel(mod, layout = 'qwerty') {
  if (mod === 'CommandOrControl') return 'Ctrl'
  if (mod === 'Shift') return layout === 'azerty' ? 'Maj' : 'Shift'
  if (mod === 'Alt') return 'Alt'
  return mod
}

/**
 * Converts a physical QWERTY key to its display key for the given layout.
 *
 * @param {string} physicalKey
 * @param {'qwerty'|'azerty'} [layout='qwerty']
 * @returns {string}
 */
export function displayKey(physicalKey, layout = 'qwerty') {
  if (layout === 'azerty') return PHYSICAL_TO_AZERTY[physicalKey] || physicalKey
  return physicalKey
}

/**
 * Converts a display key back to its physical QWERTY key.
 *
 * @param {string} displayedKey
 * @param {'qwerty'|'azerty'} [layout='qwerty']
 * @returns {string}
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