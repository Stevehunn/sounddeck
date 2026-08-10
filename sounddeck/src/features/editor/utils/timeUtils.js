// src/features/editor/utils/timeUtils.js

/**
 * Formate un temps en secondes en format MM:SS ou MM:SS.ss
 * @param {number} seconds - Temps en secondes
 * @param {boolean} showMilliseconds - Afficher les millisecondes
 * @returns {string} Temps formaté
 */
export function formatTime(seconds, showMilliseconds = false) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  
  if (showMilliseconds) {
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${secs.toFixed(1)}s`
}

/**
 * Parse une chaîne de temps en secondes
 * @param {string} timeString - Chaîne de temps (ex: "1:30", "90", "1:30.5")
 * @returns {number} Temps en secondes
 */
export function parseTime(timeString) {
  if (!timeString) return 0
  
  // Si c'est déjà un nombre
  const num = parseFloat(timeString)
  if (!isNaN(num)) return num
  
  // Format MM:SS ou MM:SS.ss
  const match = timeString.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (match) {
    const mins = parseInt(match[1])
    const secs = parseFloat(match[2])
    return mins * 60 + secs
  }
  
  return 0
}

/**
 * Arrondit un temps à l'unité de snap la plus proche
 * @param {number} time - Temps en secondes
 * @param {number} snapValue - Valeur de snap en secondes
 * @returns {number} Temps arrondi
 */
export function snapTime(time, snapValue = 0.1) {
  if (snapValue <= 0) return time
  return Math.round(time / snapValue) * snapValue
}

/**
 * Calcule le pas de la règle en fonction du zoom
 * @param {number} zoomLevel - Niveau de zoom
 * @returns {number} Pas en secondes
 */
export function getRulerStep(zoomLevel) {
  if (zoomLevel < 0.08) return 60
  if (zoomLevel < 0.15) return 30
  if (zoomLevel < 0.3) return 10
  if (zoomLevel < 0.6) return 5
  if (zoomLevel < 1.5) return 1
  if (zoomLevel < 3) return 0.5
  return 0.1
}

/**
 * Vérifie si un temps est à l'intérieur d'une zone de boucle
 * @param {number} time - Temps en secondes
 * @param {Object} loopRegion - Zone de boucle { start, end, enabled }
 * @returns {boolean} Vrai si le temps est dans la zone de boucle
 */
export function isInLoopRegion(time, loopRegion) {
  if (!loopRegion?.enabled) return false
  if (loopRegion.end <= loopRegion.start) return false
  return time >= loopRegion.start && time <= loopRegion.end
}

/**
 * Obtient la durée totale d'un projet
 * @param {Object} project - Projet avec des pistes et clips
 * @param {Object} clipDurations - Durées des clips
 * @returns {number} Durée totale en secondes
 */
export function getTotalDuration(project, clipDurations = {}) {
  if (!project?.tracks) return 10
  
  let maxDuration = 10
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const duration = clipDurations[clip.id] || clip.duration || 3
      const end = (clip.start || 0) + duration
      if (end > maxDuration) maxDuration = end
    }
  }
  return Math.max(maxDuration + 2, 10)
}

/**
 * Calcule le nombre de pixels par seconde
 * @param {number} zoomLevel - Niveau de zoom
 * @param {number} basePixelsPerSecond - Pixels de base par seconde (défaut: 80)
 * @returns {number} Pixels par seconde
 */
export function getPixelsPerSecond(zoomLevel, basePixelsPerSecond = 80) {
  return Math.max(10, basePixelsPerSecond * zoomLevel)
}