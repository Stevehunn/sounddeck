// src/core/i18n/locales/en/auth.js
export default {
  // ─── SIGN IN ──────────────────────────────────────────────────────────
  authTitle: "Sign in to my account",
  authSubtitle: "Sign in to unlock Pro plugins",
  authEmail: "Email",
  authEmailPlaceholder: "you@example.com",
  authPassword: "Password",
  authPasswordPlaceholder: "••••••••",
  authLogin: "Sign in",
  authLoggingIn: "Signing in...",
  authLogout: "Sign out",
  authLoggingOut: "Signing out...",
  authCancel: "Cancel",

  // ─── TABS ─────────────────────────────────────────────────────────────
  authTabLogin: "Sign in",
  authTabCode: "I have a code",
  authTabKey: "I have a key",

  // ─── ERRORS ───────────────────────────────────────────────────────────
  authErrorInvalidCredentials: "Invalid email or password.",
  authErrorNetwork: "Cannot reach the server. Check your connection.",
  authErrorEmailRequired: "Please enter your email.",
  authErrorPasswordRequired: "Please enter your password.",
  authErrorGeneric: "Sign-in error. Try again later.",
  authErrorServerDown: "Server is unavailable. Try again later.",

  // ─── TAB "I HAVE A CODE" ──────────────────────────────────────────────
  authCodeTitle: "Activate with a code",
  authCodeSubtitle:
    "If you received an activation code, enter it below to create your Pro account.",
  authCodeLabel: "Activation code",
  authCodePlaceholder: "SDCK-XXXX-XXXX-XXXX",
  authCodeActivate: "Activate my code",
  authCodeActivating: "Activating...",
  authCodeSuccess: "Pro account activated!",
  authCodeError: "Invalid or already used code.",
  authCodeErrorExpired: "This code has expired.",
  authCodeErrorRevoked: "This code has been revoked.",
  authCodeErrorAlreadyUsed: "This code has already been used.",
  authCodeErrorEmailMismatch: "This code is reserved for another email.",
  authCodeErrorEmailExists:
    "An account already exists with this email. Sign in instead.",
  authCodeErrorNotFound: "Code not found. Check your input.",

  // ─── TAB "I HAVE A KEY" ───────────────────────────────────────────────
  authKeyTitle: "Activate a key manually",
  authKeySubtitle: "If you received a license key by email, paste it below.",
  authManualTitle: "Activate a key manually",
  authManualSubtitle: "If you received a key by email, paste it below.",
  authManualPlaceholder: "SDCK1.xxxxxxxxx.yyyyyyyyy",
  authManualActivate: "Activate key",
  authManualActivating: "Activating...",
  authManualInvalid: "Invalid key. Check that it is complete and not revoked.",
  authManualSuccess: "License activated successfully!",
  authManualShowManual: "I have a key to paste manually",

  // ─── MY ACCOUNT ───────────────────────────────────────────────────────
  accountTitle: "My Pro account",
  accountEmail: "Email",
  accountDonorName: "Name",
  accountTier: "Tier",
  accountIssuedAt: "Activated on",
  accountTokenLabel: "My license key",
  accountTokenCopy: "Copy key",
  accountTokenCopied: "Key copied!",
  accountTokenHide: "Hide",
  accountTokenShow: "Show",
  accountTokenWarning:
    "⚠️ Keep this key safe. You will need it to reactivate your account on another PC.",
  accountLogoutNote:
    "Signing out removes your email but keeps your Pro key on this computer.",
  accountNoEmail: "No email registered",
  accountNotConnected: "Not connected to an account",
  accountNotConnectedNote:
    "Your Pro license is active on this computer. Sign in to sync your email.",
  accountChange: "Change account",
  accountConnect: "Sign in",
  accountLogoutConfirm: "Confirm sign out?",
  accountLogoutDone: "Signed out (Pro license kept)",

  // ─── TIERS ───────────────────────────────────────────────────────────
  tierFree: "Free",
  tierPro: "Pro",
  tierDev: "Developer",
  supportFreeActive: "Free account active",
  supportFreeActiveDesc:
    "You are using SoundDeck for free. Upgrade to Pro to unlock all plugins, forever, with a one-time donation.",

  // ─── ONGLET GITHUB SPONSOR ────────────────────────────────────────
  authTabGithub: "I sponsored",
  authGithubTitle: "I sponsored on GitHub",
  authGithubSubtitle:
    "If you sponsored SoundDeck on GitHub, activate your account here with your GitHub username.",
  authGithubLoginLabel: "Your GitHub username",
  authGithubLoginPlaceholder: "your-github-username",
  authGithubActivate: "Activate my account",
  authGithubActivating: "Activating...",
  authGithubSuccess: "Pro account activated!",
  authGithubError: "Unable to activate your account.",
  authGithubErrorMissingLogin: "Enter your GitHub username.",
  authGithubErrorNotFound:
    "No sponsorship found for this GitHub username. Check the spelling or wait a few minutes after your donation.",
  authGithubErrorEmailExists:
    "An account already exists with this email. Sign in instead.",
  authGithubErrorInvalidLogin: "This GitHub username is not valid.",

  // ─── Password Reset ────────────────────────────────────────
  authForgotPassword: "Forgot password?",
  authForgotPasswordSubtitle:
    "Enter your email. If an account exists, you will receive a link to choose a new password.",
  authForgotPasswordSend: "Send link",
  authForgotPasswordSending: "Sending...",
  authForgotPasswordSent: "Email sent!",
  authForgotPasswordSentDesc: "If an account exists for",
  authForgotPasswordCheckSpam:
    "The link is valid for 1 hour. Check your spam folder if you don't see it.",
  authForgotPasswordResend: "Resend",
  authBack: "Back",
  authErrorEmailInvalid: "Invalid email address",

  authNoAccountYet: "Don't have an account yet?",
  authCreateAccount: "Create an account",
  authSignupSubtitle:
    "Create your free account. You will receive a verification email.",
  authSignupPasswordPlaceholder: "Min 6 characters",
  authSignupConfirmLabel: "Confirm password",
  authSignupConfirmPlaceholder: "Retype your password",
  authSignupCreate: "Create my account",
  authSignupCreating: "Creating...",
  authSignupSent: "Account created!",
  authSignupSentDesc: "A verification email has been sent to",
  authSignupSentHint:
    "Click the link in the email to activate your account (valid for 24h). Check your spam folder.",
  authSignupErrorEmailExists: "This email is already in use",
  authSignupErrorEmailFailed:
    "Couldn't send the verification email. Try again in a few minutes.",
  authErrorPasswordTooShort: "Password must be at least 6 characters",
  authErrorPasswordTooLong: "Password is too long (max 100 characters)",
  authErrorPasswordMismatch: "Passwords don't match",
  authErrorEmailNotVerified:
    "Your email is not verified yet. Check your inbox (and spam folder).",
};
