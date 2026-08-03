// Intégration Stream Deck (version simplifiée sans dépendances externes)

let streamDeckDevices = []
let isConnected = false

/**
 * Détecte les périphériques Stream Deck
 * Version simplifiée - retourne un message informatif
 */
export async function detectStreamDecks() {
  try {
    // Note: La vraie intégration nécessite @elgato-stream-deck
    // Cette version est une coquille vide pour ne pas casser l'application
    
    console.log('⚠️ Intégration Stream Deck désactivée - dépendance manquante')
    
    return { 
      success: false, 
      devices: [],
      error: 'Intégration Stream Deck désactivée. Installez @elgato-stream-deck pour activer cette fonctionnalité.'
    }
    
  } catch (e) {
    console.warn('⚠️ Erreur détection Stream Deck:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Connecte un Stream Deck
 */
export async function connectStreamDeck(index = 0) {
  console.warn('⚠️ Intégration Stream Deck désactivée')
  return { success: false, error: 'Fonctionnalité désactivée' }
}

/**
 * Met à jour l'icône d'une touche du Stream Deck
 */
export async function updateStreamDeckKey(index, icon, device) {
  console.warn('⚠️ Intégration Stream Deck désactivée')
  return { success: false, error: 'Fonctionnalité désactivée' }
}

export default {
  detectStreamDecks,
  connectStreamDeck,
  updateStreamDeckKey
}