// src/features/options/tutorialSteps.js

function findSection(sectionId) {
  const el = document.querySelector(`[data-testid="section-${sectionId}"]`)
  if (el && el.offsetParent !== null) return el
  const fallback = document.querySelector(`[data-section="${sectionId}"]`)
  if (fallback && fallback.offsetParent !== null) return fallback
  return null
}

export const TUTORIAL_STEPS = (t) => [
  // ─── 1. APPARENCE ─────────────────────────────────────────────────────
  {
    id: 'options-step1',
    icon: '🎨',
    title: t('tutorialOptionsStep1Title') || 'Personnaliser l\'apparence',
    description:
      t('tutorialOptionsStep1Desc') ||
      'Changez le thème (sombre, clair, personnalisé), la taille des cartes, la langue de l\'application, et personnalisez votre sidebar.',
    hint:
      t('tutorialOptionsStep1Hint') ||
      '💡 Astuce : Tu peux choisir un thème prédéfini (Minuit Bleu, Forêt, Braise) ou créer ton propre thème personnalisé.',
    target: () => findSection('appearance'),
    fallbackTarget: '[data-section="appearance"]',
    position: 'bottom',
  },

  // ─── 2. AUDIO ─────────────────────────────────────────────────────────
  {
    id: 'options-step2',
    icon: '🎛️',
    title: t('tutorialOptionsStep2Title') || 'Configurer l\'audio',
    description:
      t('tutorialOptionsStep2Desc') ||
      'Configure le mixeur micro + sons pour Discord, sélectionne ton périphérique de sortie (CABLE Input) et ton micro, et réglez les volumes.',
    hint:
      t('tutorialOptionsStep2Hint') ||
      '💡 Astuce : Active « S\'entendre » pour te monitorer dans ton casque. Sur Discord, désactive « Suppression de bruit » et « Annulation d\'écho » (SoundDeck s\'en occupe).',
    target: () => findSection('audio'),
    fallbackTarget: '[data-section="audio"]',
    position: 'bottom',
  },

  // ─── 3. RACCOURCIS ────────────────────────────────────────────────────
  {
    id: 'options-step3',
    icon: '⌨️',
    title: t('tutorialOptionsStep3Title') || 'Gérer les raccourcis',
    description:
      t('tutorialOptionsStep3Desc') ||
      'Définis tes raccourcis globaux : changer de profil, activer la boucle, arrêter tous les sons, mode présentation, toggle fenêtre.',
    hint:
      t('tutorialOptionsStep3Hint') ||
      '💡 Astuce : Le visualiseur de clavier montre toutes les touches utilisées et les conflits éventuels. Les raccourcis par son se configurent sur chaque carte.',
    target: () => findSection('shortcuts'),
    fallbackTarget: '[data-section="shortcuts"]',
    position: 'bottom',
  },

  // ─── 4. GESTION DES SONS ──────────────────────────────────────────────
  {
    id: 'options-step4',
    icon: '🎵',
    title: t('tutorialOptionsStep4Title') || 'Gestion des sons',
    description:
      t('tutorialOptionsStep4Desc') ||
      'Normalise automatiquement le volume de tes sons pour éviter les gros écarts, et vide le cache des gains si nécessaire.',
    hint:
      t('tutorialOptionsStep4Hint') ||
      '💡 Astuce : La normalisation égalise le volume perçu entre tous tes sons. Si tu changes de cible, clique sur « Réanalyser les gains ».',
    target: () => findSection('soundManagement'),
    fallbackTarget: '[data-section="soundManagement"]',
    position: 'bottom',
  },

  // ─── 5. PLUGINS ───────────────────────────────────────────────────────
  {
    id: 'options-step5',
    icon: '🧩',
    title: t('tutorialOptionsStep5Title') || 'Plugins',
    description:
      t('tutorialOptionsStep5Desc') ||
      'Installe des plugins pour ajouter des fonctionnalités : import YouTube, découverte MyInstants, découverte d\'emojis, etc.',
    hint:
      t('tutorialOptionsStep5Hint') ||
      '💡 Astuce : Les plugins intégrés (YouTube, MyInstants, Emoji) sont pré-installés. Tu peux les désactiver si tu ne les utilises pas.',
    target: () => findSection('plugins'),
    fallbackTarget: '[data-section="plugins"]',
    position: 'bottom',
  },

  // ─── 6. INTÉGRATIONS ──────────────────────────────────────────────────
  {
    id: 'options-step6',
    icon: '🔌',
    title: t('tutorialOptionsStep6Title') || 'Intégrations',
    description:
      t('tutorialOptionsStep6Desc') ||
      'Connecte SoundDeck à OBS via WebSocket pour démarrer/arrêter l\'enregistrement et le streaming depuis SoundDeck.',
    hint:
      t('tutorialOptionsStep6Hint') ||
      '💡 Astuce : Active « WebSocket server » dans OBS (Outils → WebSocket Server Settings) puis configure host/port/mot de passe ici.',
    target: () => findSection('integrations'),
    fallbackTarget: '[data-section="integrations"]',
    position: 'bottom',
  },

  // ─── 7. AVANCÉ ────────────────────────────────────────────────────────
  {
    id: 'options-step7',
    icon: '⚙️',
    title: t('tutorialOptionsStep7Title') || 'Options avancées',
    description:
      t('tutorialOptionsStep7Desc') ||
      'Active la compression automatique à l\'import, exporte les logs d\'erreur pour debug, ou envoie-nous un feedback.',
    hint:
      t('tutorialOptionsStep7Hint') ||
      '💡 Astuce : La compression réduit la taille des fichiers importés (MP3 128 kbps recommandé). Elle nécessite ffmpeg.',
    target: () => findSection('advanced'),
    fallbackTarget: '[data-section="advanced"]',
    position: 'bottom',
  },

  // ─── 8. SAUVEGARDE ────────────────────────────────────────────────────
  {
    id: 'options-step8',
    icon: '💾',
    title: t('tutorialOptionsStep8Title') || 'Sauvegarde',
    description:
      t('tutorialOptionsStep8Desc') ||
      'Configure la sauvegarde automatique de ta configuration, exporte/importe tes données (config JSON, archive complète, ou sons seulement).',
    hint:
      t('tutorialOptionsStep8Hint') ||
      '💡 Astuce : Exporte régulièrement pour ne rien perdre. L\'import d\'une config ou archive complète nécessite un redémarrage.',
    target: () => findSection('backup'),
    fallbackTarget: '[data-section="backup"]',
    position: 'bottom',
  },

  // ─── 9. PROFILS ───────────────────────────────────────────────────────
  {
    id: 'options-step9',
    icon: '👥',
    title: t('tutorialOptionsStep9Title') || 'Profils',
    description:
      t('tutorialOptionsStep9Desc') ||
      'Gère tes profils : renomme-les, exporte-les pour les partager, ou importe un profil partagé par quelqu\'un d\'autre.',
    hint:
      t('tutorialOptionsStep9Hint') ||
      '💡 Astuce : Chaque profil peut être exporté indépendamment avec ses sons et son ordre personnalisé. Parfait pour partager un pack de sons.',
    target: () => findSection('profiles'),
    fallbackTarget: '[data-section="profiles"]',
    position: 'bottom',
  },
]

export default { TUTORIAL_STEPS }