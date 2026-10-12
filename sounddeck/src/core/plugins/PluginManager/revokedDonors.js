// src/core/plugins/PluginManager/revokedDonors.js
//
// Liste des donorId révoqués.
//
// Utilisation : si un utilisateur partage massivement sa clé et que tu veux
// la désactiver, ajoute son donorId ici et bump la version de l'app.
// Tous les utilisateurs avec cette clé perdront l'accès Pro à la prochaine MàJ.
//
// ⚠️ Cette liste est une "soft revocation" — les utilisateurs qui refusent
// les MàJ garderont l'accès. Pour une vraie révocation, il faut faire
// une vérification en ligne (pas dans le scope actuel).

export const REVOKED_DONOR_IDS = new Set([
  // 'exemple-uuid-ici',
])

export function isDonorRevoked(donorId) {
  return REVOKED_DONOR_IDS.has(donorId)
}

export default { REVOKED_DONOR_IDS, isDonorRevoked }