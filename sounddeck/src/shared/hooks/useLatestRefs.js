// src/shared/hooks/useLatestRefs.js
import { useRef, useEffect, useMemo } from 'react'

/**
 * Retourne un ref qui est TOUJOURS synchronisé avec la dernière valeur passée.
 * Utile pour accéder à une prop/state dans un callback stable (event listener,
 * setTimeout, etc.) sans re-créer le callback.
 *
 * @param {any} value
 * @returns {React.MutableRefObject}
 */
export function useLatestRef(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

/**
 * Retourne un OBJET de refs, une par clé.
 * Chaque ref est automatiquement maintenue à jour avec la valeur correspondante.
 *
 * @example
 * const refs = useLatestRefs({
 *   sounds: store.sounds,
 *   volume: store.volume,
 *   onPlay: handlePlay,
 * })
 * // Utilisation : refs.sounds.current, refs.volume.current, refs.onPlay.current
 *
 * @param {Object} values - { [key]: value }
 * @returns {Object} - { [key]: MutableRefObject }
 */
export function useLatestRefs(values) {
  // Crée un ref par clé (stable tant que les clés ne changent pas)
  const refsMap = useMemo(() => {
    const map = {}
    for (const key of Object.keys(values)) {
      map[key] = { current: values[key] }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(values).join('|')])

  // Met à jour les refs à chaque render (pas de useEffect → pas de delay)
  // On fait ça dans un useEffect pour rester compatible avec le StrictMode.
  useEffect(() => {
    for (const key of Object.keys(values)) {
      if (refsMap[key]) {
        refsMap[key].current = values[key]
      }
    }
  })

  return refsMap
}

export default useLatestRefs