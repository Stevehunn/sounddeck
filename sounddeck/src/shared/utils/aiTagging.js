// Auto-tagging avec fallback (TensorFlow.js optionnel)

// Tags prédéfinis pour la classification
export const SOUND_TAGS = {
  music: ['musique', 'melodie', 'rythme', 'chanson', 'instrument'],
  meme: ['meme', 'humour', 'drôle', 'blague', 'vine'],
  discord: ['discord', 'notification', 'ping', 'message', 'appel'],
  anime: ['anime', 'manga', 'japonais', 'otaku', 'kawaii'],
  games: ['jeu', 'gaming', 'jouer', 'compétition', 'fun'],
  movies: ['film', 'cinéma', 'série', 'acteur', 'réplique'],
  music_instrumental: ['instrumental', 'beat', 'loop', 'sample', 'prod'],
  voice: ['voix', 'parole', 'dialogue', 'narration', 'vocal'],
  sound_effect: ['effet', 'sfx', 'bruitage', 'impact', 'ambiance'],
  electronic: ['électronique', 'synthé', 'digital', 'techno', 'house']
}

let tensorflowAvailable = false

/**
 * Vérifie si TensorFlow.js est disponible
 */
export async function checkTensorFlow() {
  if (tensorflowAvailable) return true
  
  try {
    const tf = await import('@tensorflow/tfjs')
    tensorflowAvailable = true
    console.log('✅ TensorFlow.js disponible')
    return true
  } catch (e) {
    console.warn('⚠️ TensorFlow.js non disponible, utilisation du fallback')
    tensorflowAvailable = false
    return false
  }
}

/**
 * Extrait les caractéristiques audio d'un fichier
 */
async function extractAudioFeatures(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()
    
    const channelData = audioBuffer.getChannelData(0)
    const features = {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      rms: calculateRMS(channelData),
      peak: calculatePeak(channelData),
      zeroCrossingRate: calculateZeroCrossingRate(channelData),
      spectralCentroid: calculateSpectralCentroid(channelData),
      frequencies: getFrequencyDistribution(channelData, audioBuffer.sampleRate)
    }
    
    return features
  } catch (e) {
    console.error('Erreur extraction features:', e)
    return null
  }
}

function calculateRMS(data) {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i]
  }
  return Math.sqrt(sum / data.length)
}

function calculatePeak(data) {
  let max = 0
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i])
    if (abs > max) max = abs
  }
  return max
}

function calculateZeroCrossingRate(data) {
  let crossings = 0
  for (let i = 1; i < data.length; i++) {
    if ((data[i] >= 0 && data[i-1] < 0) || (data[i] < 0 && data[i-1] >= 0)) {
      crossings++
    }
  }
  return crossings / data.length
}

function calculateSpectralCentroid(data) {
  let sum = 0
  let total = 0
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i] - data[i-1])
    sum += diff * i
    total += diff
  }
  return total > 0 ? sum / total : 0
}

function getFrequencyDistribution(data, sampleRate) {
  const bins = 8
  const distribution = new Array(bins).fill(0)
  const step = Math.floor(data.length / bins)
  
  for (let i = 0; i < bins; i++) {
    let sum = 0
    const start = i * step
    const end = Math.min(start + step, data.length)
    for (let j = start; j < end; j++) {
      sum += Math.abs(data[j])
    }
    distribution[i] = sum / (end - start)
  }
  
  return distribution
}

function getDefaultTags() {
  return [
    { tag: 'son', confidence: 0.5 },
    { tag: 'audio', confidence: 0.4 }
  ]
}

/**
 * Analyse un fichier audio et propose des tags automatiques
 */
export async function analyzeAudio(filePath) {
  try {
    const features = await extractAudioFeatures(filePath)
    
    if (!features) return getDefaultTags()
    
    const tags = []
    const { rms, peak, zeroCrossingRate, duration } = features
    
    if (rms > 0.3) tags.push({ tag: 'fort', confidence: 0.7 })
    else if (rms < 0.1) tags.push({ tag: 'calme', confidence: 0.7 })
    
    if (duration < 2) tags.push({ tag: 'court', confidence: 0.8 })
    else if (duration > 10) tags.push({ tag: 'long', confidence: 0.8 })
    
    if (zeroCrossingRate > 0.3) tags.push({ tag: 'bruitage', confidence: 0.6 })
    else if (zeroCrossingRate < 0.1) tags.push({ tag: 'musical', confidence: 0.6 })
    
    if (peak > 0.8) tags.push({ tag: 'impact', confidence: 0.5 })
    
    return tags.length > 0 ? tags : getDefaultTags()
    
  } catch (e) {
    console.error('Erreur analyse audio:', e)
    return getDefaultTags()
  }
}

export default {
  checkTensorFlow,
  analyzeAudio,
  SOUND_TAGS
}