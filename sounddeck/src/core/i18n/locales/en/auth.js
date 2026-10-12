// src/core/i18n/locales/en/auth.js
export default {
  // ─── SIGN IN ──────────────────────────────────────────────────────────
  authTitle: 'Sign in to my account',
  authSubtitle: 'Sign in to unlock Pro plugins',
  authEmail: 'Email',
  authEmailPlaceholder: 'you@example.com',
  authPassword: 'Password',
  authPasswordPlaceholder: '••••••••',
  authLogin: 'Sign in',
  authLoggingIn: 'Signing in...',
  authLogout: 'Sign out',
  authLoggingOut: 'Signing out...',
  authCancel: 'Cancel',

  // ─── TABS ─────────────────────────────────────────────────────────────
  authTabLogin: 'Sign in',
  authTabCode: 'I have a code',
  authTabKey: 'I have a key',

  // ─── ERRORS ───────────────────────────────────────────────────────────
  authErrorInvalidCredentials: 'Invalid email or password.',
  authErrorNetwork: 'Cannot reach the server. Check your connection.',
  authErrorEmailRequired: 'Please enter your email.',
  authErrorPasswordRequired: 'Please enter your password.',
  authErrorGeneric: 'Sign-in error. Try again later.',
  authErrorServerDown: 'Server is unavailable. Try again later.',

  // ─── TAB "I HAVE A CODE" ──────────────────────────────────────────────
  authCodeTitle: 'Activate with a code',
  authCodeSubtitle: 'If you received an activation code, enter it below to create your Pro account.',
  authCodeLabel: 'Activation code',
  authCodePlaceholder: 'SDCK-XXXX-XXXX-XXXX',
  authCodeActivate: 'Activate my code',
  authCodeActivating: 'Activating...',
  authCodeSuccess: 'Pro account activated!',
  authCodeError: 'Invalid or already used code.',
  authCodeErrorExpired: 'This code has expired.',
  authCodeErrorRevoked: 'This code has been revoked.',
  authCodeErrorAlreadyUsed: 'This code has already been used.',
  authCodeErrorEmailMismatch: 'This code is reserved for another email.',
  authCodeErrorEmailExists: 'An account already exists with this email. Sign in instead.',
  authCodeErrorNotFound: 'Code not found. Check your input.',

  // ─── TAB "I HAVE A KEY" ───────────────────────────────────────────────
  authKeyTitle: 'Activate a key manually',
  authKeySubtitle: 'If you received a license key by email, paste it below.',
  authManualTitle: 'Activate a key manually',
  authManualSubtitle: 'If you received a key by email, paste it below.',
  authManualPlaceholder: 'SDCK1.xxxxxxxxx.yyyyyyyyy',
  authManualActivate: 'Activate key',
  authManualActivating: 'Activating...',
  authManualInvalid: 'Invalid key. Check that it is complete and not revoked.',
  authManualSuccess: 'License activated successfully!',
  authManualShowManual: 'I have a key to paste manually',

  // ─── MY ACCOUNT ───────────────────────────────────────────────────────
  accountTitle: 'My Pro account',
  accountEmail: 'Email',
  accountDonorName: 'Name',
  accountTier: 'Tier',
  accountIssuedAt: 'Activated on',
  accountTokenLabel: 'My license key',
  accountTokenCopy: 'Copy key',
  accountTokenCopied: 'Key copied!',
  accountTokenHide: 'Hide',
  accountTokenShow: 'Show',
  accountTokenWarning: '⚠️ Keep this key safe. You will need it to reactivate your account on another PC.',
  accountLogoutNote: 'Signing out removes your email but keeps your Pro key on this computer.',
  accountNoEmail: 'No email registered',
  accountNotConnected: 'Not connected to an account',
  accountNotConnectedNote: 'Your Pro license is active on this computer. Sign in to sync your email.',
  accountChange: 'Change account',
  accountConnect: 'Sign in',
  accountLogoutConfirm: 'Confirm sign out?',
  accountLogoutDone: 'Signed out (Pro license kept)',

  // ─── TIERS ───────────────────────────────────────────────────────────
  tierFree: 'Free',
  tierPro: 'Pro',
  tierDev: 'Developer',
}