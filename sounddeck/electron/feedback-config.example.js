// electron/feedback-config.example.js
//
// ⚠️ Fichier EXEMPLE — ne pas modifier directement.
// Pour configurer tes webhooks :
//   1. Copie ce fichier vers `feedback-config.js` (sans `.example`)
//   2. Remplis les URLs de webhook Discord
//   3. Le fichier `feedback-config.js` est gitignoré
//
// Ces valeurs sont injectées dans le store au PREMIER démarrage de l'app.
// Ensuite, si l'utilisateur les modifie, elles ne seront JAMAIS écrasées.
//
// Tu peux aussi utiliser les variables d'environnement (voir plus bas) qui
// ont priorité sur ce fichier.

module.exports = {
  // Webhook par défaut — utilisé si aucun webhook par type n'est défini
  default: null, // ex: 'https://discord.com/api/webhooks/123/abc'

  // Webhooks par type (optionnels) — écrasent le webhook par défaut
  perType: {
    bug: null,       // ex: 'https://discord.com/api/webhooks/456/def'
    feature: null,
    question: null,
    praise: null,
  },
}