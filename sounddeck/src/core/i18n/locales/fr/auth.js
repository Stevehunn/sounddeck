// src/core/i18n/locales/fr/auth.js
export default {
  // ─── CONNEXION ────────────────────────────────────────────────────────
  authTitle: "Connexion à mon compte",
  authSubtitle: "Connectez-vous pour débloquer les plugins Pro",
  authEmail: "Email",
  authEmailPlaceholder: "vous@exemple.com",
  authPassword: "Mot de passe",
  authPasswordPlaceholder: "••••••••",
  authLogin: "Se connecter",
  authLoggingIn: "Connexion...",
  authLogout: "Se déconnecter",
  authLoggingOut: "Déconnexion...",
  authCancel: "Annuler",

  // ─── ONGLETS ──────────────────────────────────────────────────────────
  authTabLogin: "Se connecter",
  authTabCode: "J'ai un code",
  authTabKey: "J'ai une clé",

  // ─── ERREURS ──────────────────────────────────────────────────────────
  authErrorInvalidCredentials: "Email ou mot de passe incorrect.",
  authErrorNetwork:
    "Impossible de contacter le serveur. Vérifiez votre connexion.",
  authErrorEmailRequired: "Veuillez entrer votre email.",
  authErrorPasswordRequired: "Veuillez entrer votre mot de passe.",
  authErrorGeneric: "Erreur de connexion. Réessayez plus tard.",
  authErrorServerDown: "Le serveur est indisponible. Réessayez plus tard.",

  // ─── ONGLET "J'AI UN CODE" ────────────────────────────────────────────
  authCodeTitle: "Activer avec un code",
  authCodeSubtitle:
    "Si tu as reçu un code d'activation, entre-le ci-dessous pour créer ton compte Pro.",
  authCodeLabel: "Code d'activation",
  authCodePlaceholder: "SDCK-XXXX-XXXX-XXXX",
  authCodeActivate: "Activer mon code",
  authCodeActivating: "Activation...",
  authCodeSuccess: "Compte Pro activé avec succès !",
  authCodeError: "Code invalide ou déjà utilisé.",
  authCodeErrorExpired: "Ce code a expiré.",
  authCodeErrorRevoked: "Ce code a été révoqué.",
  authCodeErrorAlreadyUsed: "Ce code a déjà été utilisé.",
  authCodeErrorEmailMismatch: "Ce code est réservé à une autre adresse email.",
  authCodeErrorEmailExists:
    "Un compte existe déjà avec cet email. Connecte-toi à la place.",
  authCodeErrorNotFound: "Code introuvable. Vérifie la saisie.",

  // ─── ONGLET "J'AI UNE CLÉ" ────────────────────────────────────────────
  authKeyTitle: "Activer une clé manuellement",
  authKeySubtitle:
    "Si tu as reçu une clé de licence par mail, colle-la ci-dessous.",
  authManualTitle: "Activer une clé manuellement",
  authManualSubtitle: "Si tu as reçu une clé par mail, colle-la ci-dessous.",
  authManualPlaceholder: "SDCK1.xxxxxxxxx.yyyyyyyyy",
  authManualActivate: "Activer la clé",
  authManualActivating: "Activation...",
  authManualInvalid:
    "Clé invalide. Vérifie qu'elle est complète et non expirée.",
  authManualSuccess: "Licence activée avec succès !",
  authManualShowManual: "J'ai une clé à coller manuellement",

  // ─── MON COMPTE ──────────────────────────────────────────────────────
  accountTitle: "Mon compte Pro",
  accountEmail: "Email",
  accountDonorName: "Nom",
  accountTier: "Niveau",
  accountIssuedAt: "Activé le",
  accountTokenLabel: "Ma clé de licence",
  accountTokenCopy: "Copier la clé",
  accountTokenCopied: "Clé copiée !",
  accountTokenHide: "Masquer",
  accountTokenShow: "Afficher",
  accountTokenWarning:
    "⚠️ Conservez cette clé en sécurité. Elle vous sera nécessaire pour réactiver votre compte sur un autre PC.",
  accountLogoutNote:
    "La déconnexion retire votre email mais conserve votre clé Pro sur cet ordinateur.",
  accountNoEmail: "Aucun email enregistré",
  accountNotConnected: "Non connecté à un compte",
  accountNotConnectedNote:
    "Votre licence Pro est active sur cet ordinateur. Connectez-vous pour synchroniser votre email.",
  accountChange: "Changer de compte",
  accountConnect: "Se connecter",
  accountLogoutConfirm: "Confirmer la déconnexion ?",
  accountLogoutDone: "Vous êtes déconnecté (licence Pro conservée)",

  // ─── TIERS ───────────────────────────────────────────────────────────
  tierFree: "Gratuit",
  tierPro: "Pro",
  tierDev: "Développeur",
  supportFreeActive: "Compte gratuit actif",
  supportFreeActiveDesc:
    "Tu utilises SoundDeck gratuitement. Passe à Pro pour débloquer tous les plugins, à vie, avec un don unique.",

  // ─── ONGLET GITHUB SPONSOR ────────────────────────────────────────
  authTabGithub: "J'ai sponsorisé",
  authGithubTitle: "J'ai sponsorisé sur GitHub",
  authGithubSubtitle:
    "Si tu as sponsorisé SoundDeck sur GitHub, active ton compte ici avec ton nom d'utilisateur GitHub.",
  authGithubLoginLabel: "Ton pseudo GitHub",
  authGithubLoginPlaceholder: "ton-pseudo-github",
  authGithubActivate: "Activer mon compte",
  authGithubActivating: "Activation...",
  authGithubSuccess: "Compte Pro activé avec succès !",
  authGithubError: "Impossible d'activer ton compte.",
  authGithubErrorMissingLogin: "Entre ton pseudo GitHub.",
  authGithubErrorNotFound:
    "Aucun sponsorship trouvé pour ce pseudo GitHub. Vérifie l'orthographe ou attends quelques minutes après ton don.",
  authGithubErrorEmailExists:
    "Un compte existe déjà avec cet email. Connecte-toi à la place.",
  authGithubErrorInvalidLogin: "Ce pseudo GitHub n'est pas valide.",

  // ─── Mot de passe oublié ────────────────────────────────────────
  authForgotPassword: "Mot de passe oublié ?",
  authForgotPasswordSubtitle:
    "Entre ton adresse email. Si un compte existe, tu recevras un lien pour choisir un nouveau mot de passe.",
  authForgotPasswordSend: "Envoyer le lien",
  authForgotPasswordSending: "Envoi...",
  authForgotPasswordSent: "Email envoyé !",
  authForgotPasswordSentDesc: "Si un compte existe avec l'email",
  authForgotPasswordCheckSpam:
    "Le lien est valable 1 heure. Pense à vérifier tes spams si tu ne vois rien.",
  authForgotPasswordResend: "Renvoyer",
  authBack: "Retour",
  authErrorEmailInvalid: "Adresse email invalide",

  // ─── Créer un compte ────────────────────────────────────────────
  authNoAccountYet: "Pas encore de compte ?",
  authCreateAccount: "Créer un compte",
  authSignupSubtitle:
    "Crée ton compte gratuit. Tu recevras un email pour vérifier ton adresse.",
  authSignupPasswordPlaceholder: "Min 6 caractères",
  authSignupConfirmLabel: "Confirmer le mot de passe",
  authSignupConfirmPlaceholder: "Retape ton mot de passe",
  authSignupCreate: "Créer mon compte",
  authSignupCreating: "Création...",
  authSignupSent: "Compte créé !",
  authSignupSentDesc: "Un email de vérification vient d'être envoyé à",
  authSignupSentHint:
    "Clique sur le lien dans l'email pour activer ton compte (valable 24h). Pense à vérifier tes spams.",
  authSignupErrorEmailExists: "Cet email est déjà utilisé",
  authSignupErrorEmailFailed:
    "Impossible d'envoyer l'email. Réessaie dans quelques minutes.",
  authErrorPasswordTooShort: "Le mot de passe doit faire au moins 6 caractères",
  authErrorPasswordTooLong:
    "Le mot de passe est trop long (max 100 caractères)",
  authErrorPasswordMismatch: "Les deux mots de passe ne correspondent pas",
  authErrorEmailNotVerified:
    "Ton email n'est pas encore vérifié. Regarde dans ta boîte mail (et tes spams).",
};
