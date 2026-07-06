// Auto-tagging avec fallback (TensorFlow.js optionnel)

// Cache des modèles
let modelCache = null
let isModelLoading = false
let tensorflowAvailable = false

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
 * Charge le modèle TensorFlow.js pour l'analyse audio
 */
export async function loadAIModel() {
  if (modelCache) return modelCache
  if (isModelLoading) {
    return new Promise((resolve) => {
      const checkLoaded = setInterval(() => {
        if (modelCache) {
          clearInterval(checkLoaded)
          resolve(modelCache)
        }
      }, 100)
    })
  }

  isModelLoading = true
  
  try {
    const tfAvailable = await checkTensorFlow()
    
    if (tfAvailable) {
      try {
        const tf = await import('@tensorflow/tfjs')
        const model = await tf.loadLayersModel('/models/audio-classifier/model.json')
        modelCache = model
        console.log('✅ Modèle IA chargé avec succès')
        return model
      } catch (e) {
        console.warn('⚠️ Impossible de charger le modèle IA:', e)
      }
    }
    
    modelCache = { isFallback: true }
    return modelCache
    
  } finally {
    isModelLoading = false
  }
}

/**
 * Analyse un fichier audio et propose des tags automatiques
 */
export async function analyzeAudio(filePath, model = null) {
  try {
    const aiModel = model || await loadAIModel()
    const features = await extractAudioFeatures(filePath)
    
    if (aiModel && !aiModel.isFallback && tensorflowAvailable) {
      try {
        const predictions = await predictTags(aiModel, features)
        return predictions
      } catch (e) {
        console.warn('⚠️ Erreur prédiction, utilisation du fallback:', e)
      }
    }
    
    return fallbackTagging(features)
    
  } catch (e) {
    console.error('Erreur analyse audio:', e)
    return getDefaultTags()
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

/**
 * Calcule la RMS (Root Mean Square) - volume moyen
 */
function calculateRMS(data) {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i]
  }
  return Math.sqrt(sum / data.length)
}

/**
 * Calcule le pic (volume maximal)
 */
function calculatePeak(data) {
  let max = 0
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i])
    if (abs > max) max = abs
  }
  return max
}

/**
 * Calcule le taux de passage par zéro
 */
function calculateZeroCrossingRate(data) {
  let crossings = 0
  for (let i = 1; i < data.length; i++) {
    if ((data[i] >= 0 && data[i-1] < 0) || (data[i] < 0 && data[i-1] >= 0)) {
      crossings++
    }
  }
  return crossings / data.length
}

/**
 * Calcule le centroïde spectral (fréquence moyenne)
 */
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

/**
 * Obtient la distribution des fréquences (simulée)
 */
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

/**
 * Prédit les tags avec le modèle IA
 */
async function predictTags(model, features) {
  if (!features || !tensorflowAvailable) return getDefaultTags()
  
  try {
    const tf = await import('@tensorflow/tfjs')
    
    const inputData = prepareInputData(features)
    const tensor = tf.tensor([inputData])
    const predictions = await model.predict(tensor).data()
    tensor.dispose()
    
    const tagNames = Object.keys(SOUND_TAGS)
    const results = []
    
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] > 0.3) {
        results.push({
          tag: tagNames[i] || `tag_${i}`,
          confidence: predictions[i]
        })
      }
    }
    
    return results.length > 0 ? results : getDefaultTags()
    
  } catch (e) {
    console.error('Erreur prédiction:', e)
    return getDefaultTags()
  }
}

/**
 * Prépare les données pour le modèle
 */
function prepareInputData(features) {
  return [
    features.duration / 30,
    features.rms * 10,
    features.peak,
    features.zeroCrossingRate * 100,
    features.spectralCentroid / 1000,
    ...features.frequencies.map(f => f * 2)
  ]
}

/**
 * Tagging de fallback sans IA
 */
function fallbackTagging(features) {
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
}

/**
 * Tags par défaut
 */
function getDefaultTags() {
  return [
    { tag: 'son', confidence: 0.5 },
    { tag: 'audio', confidence: 0.4 }
  ]
}

/**
 * ✅ EXPORT : Reconnaissance vocale - Version corrigée
 */
export function setupVoiceRecognition(onCommand, lang = 'fr-FR') {
  // Vérifier si la reconnaissance vocale est supportée
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    console.warn('⚠️ Reconnaissance vocale non supportée par ce navigateur')
    return null
  }

  const recognition = new SpeechRecognition()
  
  recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = false
  recognition.maxAlternatives = 3

  let isListening = false
  let restartTimeout = null
  let isRestarting = false

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim()
        console.log('🎤 Commande vocale détectée:', transcript)
        if (onCommand) {
          onCommand(transcript)
        }
      }
    }
  }

  recognition.onerror = (event) => {
    console.warn('⚠️ Erreur reconnaissance vocale:', event.error)
    
    // Gérer les erreurs spécifiques
    switch (event.error) {
      case 'network':
        console.warn('🌐 Problème réseau - tentative de reconnexion...')
        if (isListening && !isRestarting) {
          isRestarting = true
          setTimeout(() => {
            try {
              recognition.stop()
              setTimeout(() => {
                try {
                  recognition.start()
                  console.log('🔄 Reconnexion vocale réussie')
                } catch (e) {
                  console.warn('⚠️ Échec de la reconnexion:', e)
                }
                isRestarting = false
              }, 500)
            } catch (e) {
              console.warn('⚠️ Erreur lors de la reconnexion:', e)
              isRestarting = false
            }
          }, 2000)
        }
        break
        
      case 'not-allowed':
        console.warn('🚫 Accès au microphone refusé')
        isListening = false
        break
        
      case 'no-speech':
        // Pas de parole détectée - c'est normal, on continue
        break
        
      case 'audio-capture':
        console.warn('🎤 Problème de capture audio - vérifiez votre micro')
        break
        
      default:
        console.warn('⚠️ Erreur non gérée:', event.error)
    }
  }

  recognition.onend = () => {
    console.log('🎤 Reconnaissance vocale terminée')
    if (isListening && !isRestarting) {
      restartTimeout = setTimeout(() => {
        try {
          recognition.start()
          console.log('🔄 Reconnaissance vocale redémarrée')
        } catch (e) {
          console.warn('⚠️ Impossible de redémarrer:', e)
          isListening = false
        }
      }, 500)
    }
  }

  const start = () => {
    if (isListening) {
      console.log('ℹ️ Déjà en écoute')
      return
    }
    
    try {
      recognition.start()
      isListening = true
      console.log('🎤 Reconnaissance vocale démarrée')
    } catch (e) {
      console.warn('⚠️ Impossible de démarrer la reconnaissance:', e.message)
      isListening = false
    }
  }

  const stop = () => {
    isListening = false
    if (restartTimeout) {
      clearTimeout(restartTimeout)
      restartTimeout = null
    }
    try {
      recognition.stop()
      console.log('🎤 Reconnaissance vocale arrêtée')
    } catch (e) {
      console.warn('⚠️ Impossible d\'arrêter la reconnaissance:', e.message)
    }
  }

  const getStatus = () => ({
    isListening,
    isSupported: true
  })

  return { 
    start, 
    stop, 
    isListening: () => isListening,
    getStatus
  }
}

/**
 * ✅ EXPORT : Génère des sons avec l'IA (simulé)
 */
export function generateSoundWithAI(prompt, duration = 2) {
  console.log('🎵 Génération de son avec IA:', prompt, 'durée:', duration)
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const sampleRate = audioContext.sampleRate
  const samples = duration * sampleRate
  const buffer = audioContext.createBuffer(1, samples, sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    let value = 0
    
    if (prompt.includes('basse') || prompt.includes('bass')) {
      value = Math.sin(2 * Math.PI * 80 * t) * 0.5
    } else if (prompt.includes('aigu') || prompt.includes('high')) {
      value = Math.sin(2 * Math.PI * 440 * t) * 0.5
    } else if (prompt.includes('bruit') || prompt.includes('noise')) {
      value = (Math.random() * 2 - 1) * 0.3
    } else if (prompt.includes('beat') || prompt.includes('rythme')) {
      const beat = Math.floor(t * 2) % 2 === 0 ? 1 : 0.3
      value = Math.sin(2 * Math.PI * 200 * t) * beat * 0.4
    } else {
      value = Math.sin(2 * Math.PI * 220 * t) * 0.3 + Math.sin(2 * Math.PI * 330 * t) * 0.2
    }
    
    const fadeIn = Math.min(1, t * 5)
    const fadeOut = Math.min(1, (duration - t) * 5)
    data[i] = value * fadeIn * fadeOut
  }
  
  const normalizedData = buffer.getChannelData(0)
  let max = 0
  for (let i = 0; i < normalizedData.length; i++) {
    const abs = Math.abs(normalizedData[i])
    if (abs > max) max = abs
  }
  if (max > 0) {
    for (let i = 0; i < normalizedData.length; i++) {
      normalizedData[i] /= max
    }
  }
  
  return buffer
}

/**
 * ✅ EXPORT : Charge un fichier audio et le décode en AudioBuffer
 */
export async function loadAudioBuffer(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    return audioBuffer
  } catch (e) {
    console.error('Erreur chargement audio:', e)
    return null
  }
}

/**
 * ✅ EXPORT : Crée un son à partir d'un buffer (pour la génération IA)
 */
export function createSoundFromBuffer(buffer, name = 'Son généré') {
  return {
    name,
    buffer,
    emoji: '🎵',
    duration: buffer.duration
  }
}

export default {
  checkTensorFlow,
  loadAIModel,
  analyzeAudio,
  setupVoiceRecognition,
  generateSoundWithAI,
  loadAudioBuffer,
  createSoundFromBuffer,
  SOUND_TAGS
}