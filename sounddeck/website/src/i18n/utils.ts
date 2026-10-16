export const SITE = {
  name: 'SoundDeck',
  domain: 'sounddeck.stream',
  github: 'https://github.com/Stevehunn/sounddeck',
  githubReleases: 'https://github.com/Stevehunn/sounddeck/releases/latest',
  githubIssues: 'https://github.com/Stevehunn/sounddeck/issues/new',
  githubSponsors: 'https://github.com/sponsors/Stevehunn',
  license: 'https://github.com/Stevehunn/sounddeck/blob/main/LICENSE',
  changelog: 'https://github.com/Stevehunn/sounddeck/blob/main/CHANGELOG.md',
  contributing: 'https://github.com/Stevehunn/sounddeck/blob/main/CONTRIBUTING.md',
  version: '1.4.12',

  // URLs de téléchargement directes (redirigées par le worker)
  downloadWindows: 'https://api.sounddeck.stream/download/windows',
  downloadMac: 'https://api.sounddeck.stream/download/mac',
  downloadLinux: 'https://api.sounddeck.stream/download/linux',
} as const