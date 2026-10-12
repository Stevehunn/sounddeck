// src/core/i18n/locales/fr/auth.js
export default {
  // ─── CONNEXION ────────────────────────────────────────────────────────
  authTitle: 'Connexion à mon compte',
  authSubtitle: 'Connectez-vous pour débloquer les plugins Pro',
  authEmail: 'Email',
  authEmailPlaceholder: 'vous@exemple.com',
  authPassword: 'Mot de passe',
  authPasswordPlaceholder: '••••••••',
  authLogin: 'Se connecter',
  authLoggingIn: 'Connexion...',
  authLogout: 'Se déconnecter',
  authLoggingOut: 'Déconnexion...',
  authCancel: 'Annuler',

  // ─── ONGLETS ──────────────────────────────────────────────────────────
  authTabLogin: 'Se connecter',
  authTabCode: 'J\'ai un code',
  authTabKey: 'J\'ai une clé',

  // ─── ERREURS ──────────────────────────────────────────────────────────
  authErrorInvalidCredentials: 'Email ou mot de passe incorrect.',
  authErrorNetwork: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
  authErrorEmailRequired: 'Veuillez entrer votre email.',
  authErrorPasswordRequired: 'Veuillez entrer votre mot de passe.',
  authErrorGeneric: 'Erreur de connexion. Réessayez plus tard.',
  authErrorServerDown: 'Le serveur est indisponible. Réessayez plus tard.',

  // ─── ONGLET "J'AI UN CODE" ────────────────────────────────────────────
  authCodeTitle: 'Activer avec un code',
  authCodeSubtitle: 'Si tu as reçu un code d\'activation, entre-le ci-dessous pour créer ton compte Pro.',
  authCodeLabel: 'Code d\'activation',
  authCodePlaceholder: 'SDCK-XXXX-XXXX-XXXX',
  authCodeActivate: 'Activer mon code',
  authCodeActivating: 'Activation...',
  authCodeSuccess: 'Compte Pro activé avec succès !',
  authCodeError: 'Code invalide ou déjà utilisé.',
  authCodeErrorExpired: 'Ce code a expiré.',
  authCodeErrorRevoked: 'Ce code a été révoqué.',
  authCodeErrorAlreadyUsed: 'Ce code a déjà été utilisé.',
  authCodeErrorEmailMismatch: 'Ce code est réservé à une autre adresse email.',
  authCodeErrorEmailExists: 'Un compte existe déjà avec cet email. Connecte-toi à la place.',
  authCodeErrorNotFound: 'Code introuvable. Vérifie la saisie.',

  // ─── ONGLET "J'AI UNE CLÉ" ────────────────────────────────────────────
  authKeyTitle: 'Activer une clé manuellement',
  authKeySubtitle: 'Si tu as reçu une clé de licence par mail, colle-la ci-dessous.',
  authManualTitle: 'Activer une clé manuellement',
  authManualSubtitle: 'Si tu as reçu une clé par mail, colle-la ci-dessous.',
  authManualPlaceholder: 'SDCK1.xxxxxxxxx.yyyyyyyyy',
  authManualActivate: 'Activer la clé',
  authManualActivating: 'Activation...',
  authManualInvalid: 'Clé invalide. Vérifie qu\'elle est complète et non expirée.',
  authManualSuccess: 'Licence activée avec succès !',
  authManualShowManual: 'J\'ai une clé à coller manuellement',

  // ─── MON COMPTE ──────────────────────────────────────────────────────
  accountTitle: 'Mon compte Pro',
  accountEmail: 'Email',
  accountDonorName: 'Nom',
  accountTier: 'Niveau',
  accountIssuedAt: 'Activé le',
  accountTokenLabel: 'Ma clé de licence',
  accountTokenCopy: 'Copier la clé',
  accountTokenCopied: 'Clé copiée !',
  accountTokenHide: 'Masquer',
  accountTokenShow: 'Afficher',
  accountTokenWarning: '⚠️ Conservez cette clé en sécurité. Elle vous sera nécessaire pour réactiver votre compte sur un autre PC.',
  accountLogoutNote: 'La déconnexion retire votre email mais conserve votre clé Pro sur cet ordinateur.',
  accountNoEmail: 'Aucun email enregistré',
  accountNotConnected: 'Non connecté à un compte',
  accountNotConnectedNote: 'Votre licence Pro est active sur cet ordinateur. Connectez-vous pour synchroniser votre email.',
  accountChange: 'Changer de compte',
  accountConnect: 'Se connecter',
  accountLogoutConfirm: 'Confirmer la déconnexion ?',
  accountLogoutDone: 'Vous êtes déconnecté (licence Pro conservée)',

  // ─── TIERS ───────────────────────────────────────────────────────────
  tierFree: 'Gratuit',
  tierPro: 'Pro',
  tierDev: 'Développeur',
}