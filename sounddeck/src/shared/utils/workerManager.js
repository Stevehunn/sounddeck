// Gestion des Web Workers pour l'analyse audio en arrière-plan

let audioWorker = null
let workerTasks = new Map()
let taskIdCounter = 0

/**
 * Initialise le worker audio
 */
export function initAudioWorker() {
  if (audioWorker) {
    console.log('ℹ️ Worker audio déjà initialisé')
    return
  }
  
  try {
    // Créer un worker en ligne pour l'analyse audio
    const workerCode = `
      // Analyse audio en arrière-plan
      self.onmessage = function(event) {
        const { taskId, type, data } = event.data
        
        switch (type) {
          case 'analyze':
            analyzeAudio(data, taskId)
            break
          case 'extractFeatures':
            extractFeatures(data, taskId)
            break
          default:
            self.postMessage({ taskId, error: 'Unknown task type' })
        }
      }
      
      function analyzeAudio(data, taskId) {
        try {
          // Simuler l'analyse
          const features = {
            duration: data.duration || 0,
            rms: Math.random() * 0.5 + 0.1,
            peak: Math.random() * 0.8 + 0.2,
            zeroCrossingRate: Math.random() * 0.5,
            spectralCentroid: Math.random() * 2000 + 100
          }
          
          self.postMessage({
            taskId,
            result: {
              tags: getTagsFromFeatures(features),
              features
            }
          })
        } catch (e) {
          self.postMessage({ taskId, error: e.message })
        }
      }
      
      function extractFeatures(data, taskId) {
        try {
          const features = {
            duration: data.duration || 0,
            rms: Math.random() * 0.5 + 0.1,
            peak: Math.random() * 0.8 + 0.2,
            zeroCrossingRate: Math.random() * 0.5,
            spectralCentroid: Math.random() * 2000 + 100
          }
          
          self.postMessage({ taskId, result: features })
        } catch (e) {
          self.postMessage({ taskId, error: e.message })
        }
      }
      
      function getTagsFromFeatures(features) {
        const tags = []
        if (features.rms > 0.3) tags.push('fort')
        if (features.rms < 0.1) tags.push('calme')
        if (features.duration < 2) tags.push('court')
        if (features.duration > 10) tags.push('long')
        if (features.zeroCrossingRate > 0.3) tags.push('bruitage')
        return tags
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    audioWorker = new Worker(workerUrl)
    
    audioWorker.onmessage = (event) => {
      const { taskId, result, error } = event.data
      const task = workerTasks.get(taskId)
      if (task) {
        if (error) {
          task.reject(new Error(error))
        } else {
          task.resolve(result)
        }
        workerTasks.delete(taskId)
      }
    }
    
    audioWorker.onerror = (event) => {
      console.error('❌ Erreur worker:', event)
      audioWorker = null
    }
    
    console.log('✅ Worker audio initialisé')
    
  } catch (e) {
    console.error('❌ Erreur création worker:', e)
  }
}

/**
 * Analyse un son dans un worker
 */
export function analyzeSoundInWorker(audioData) {
  return new Promise((resolve, reject) => {
    if (!audioWorker) {
      initAudioWorker()
      if (!audioWorker) {
        reject(new Error('Worker non disponible'))
        return
      }
    }
    
    const taskId = ++taskIdCounter
    workerTasks.set(taskId, { resolve, reject })
    
    audioWorker.postMessage({
      taskId,
      type: 'analyze',
      data: audioData
    })
    
    // Timeout après 30 secondes
    setTimeout(() => {
      if (workerTasks.has(taskId)) {
        workerTasks.delete(taskId)
        reject(new Error('Timeout'))
      }
    }, 30000)
  })
}

/**
 * Extrait les caractéristiques audio dans un worker
 */
export function extractFeaturesInWorker(audioData) {
  return new Promise((resolve, reject) => {
    if (!audioWorker) {
      initAudioWorker()
      if (!audioWorker) {
        reject(new Error('Worker non disponible'))
        return
      }
    }
    
    const taskId = ++taskIdCounter
    workerTasks.set(taskId, { resolve, reject })
    
    audioWorker.postMessage({
      taskId,
      type: 'extractFeatures',
      data: audioData
    })
    
    setTimeout(() => {
      if (workerTasks.has(taskId)) {
        workerTasks.delete(taskId)
        reject(new Error('Timeout'))
      }
    }, 30000)
  })
}

/**
 * Termine le worker
 */
export function terminateAudioWorker() {
  if (audioWorker) {
    audioWorker.terminate()
    audioWorker = null
    workerTasks.clear()
    console.log('🧹 Worker audio terminé')
  }
}

export default {
  initAudioWorker,
  analyzeSoundInWorker,
  extractFeaturesInWorker,
  terminateAudioWorker
}