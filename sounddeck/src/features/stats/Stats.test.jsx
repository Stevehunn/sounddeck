// src/features/stats/Stats.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Stats from './Stats'

// ═══════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
  }),
}))

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe('Stats', () => {
  const NOW = Date.now()
  const WEEK_AGO = NOW - 3 * 24 * 60 * 60 * 1000 // dans la semaine
  const MONTH_AGO = NOW - 15 * 24 * 60 * 60 * 1000 // dans le mois
  const YEAR_AGO = NOW - 400 * 24 * 60 * 60 * 1000 // ancien

  const createStore = (overrides = {}) => ({
    sounds: [],
    profiles: [{ id: 'all', name: 'Tous', isDefault: true }],
    tags: {},
    ...overrides,
  })

  const renderPage = (store = createStore()) =>
    render(<Stats store={store} />)

  // ════════════════════════════════════════════════════════════════════
  // RENDU DE BASE
  // ════════════════════════════════════════════════════════════════════

  describe('rendu de base', () => {
    it('devrait afficher le titre statsTitle', () => {
      renderPage()
      expect(screen.getByText('statsTitle')).toBeInTheDocument()
    })

    it('devrait afficher le sub statsSub', () => {
      renderPage()
      expect(screen.getByText('statsSub')).toBeInTheDocument()
    })

    it('devrait exposer le conteneur', () => {
      renderPage()
      expect(screen.getByTestId('stats-container')).toBeInTheDocument()
    })

    it('devrait afficher les filtres', () => {
      renderPage()
      expect(screen.getByTestId('stats-filters')).toBeInTheDocument()
    })

    it('devrait afficher les 3 boutons de filtre', () => {
      renderPage()
      expect(screen.getByText('statsAll')).toBeInTheDocument()
      expect(screen.getByText('statsWeek')).toBeInTheDocument()
      expect(screen.getByText('statsMonth')).toBeInTheDocument()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // STAT CARDS
  // ════════════════════════════════════════════════════════════════════

  describe('StatCards', () => {
    it('devrait afficher la card total sons', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-total')).toBeInTheDocument()
    })

    it('devrait afficher la card plays', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-plays')).toBeInTheDocument()
    })

    it('devrait afficher la card profiles', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-profiles')).toBeInTheDocument()
    })

    it('devrait afficher la card tags', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-tags')).toBeInTheDocument()
    })

    it('devrait afficher la card favorites', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-favorites')).toBeInTheDocument()
    })

    it('devrait afficher la card played sounds', () => {
      renderPage()
      expect(screen.getByTestId('stat-card-played')).toBeInTheDocument()
    })

    it('devrait calculer le total des sons', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'A', playCount: 0 },
          { id: 's2', name: 'B', playCount: 0 },
        ],
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-total')
      expect(card.textContent).toContain('2')
    })

    it('devrait calculer le total des plays', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'A', playCount: 5 },
          { id: 's2', name: 'B', playCount: 3 },
        ],
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-plays')
      expect(card.textContent).toContain('8')
    })

    it('devrait compter les profils user (exclu "all")', () => {
      const store = createStore({
        profiles: [
          { id: 'all', name: 'Tous' },
          { id: 'p1', name: 'Gaming' },
          { id: 'p2', name: 'Musique' },
        ],
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-profiles')
      expect(card.textContent).toContain('2')
    })

    it('devrait compter les tags uniques', () => {
      const store = createStore({
        tags: {
          s1: ['meme', 'funny'],
          s2: ['meme'],
          s3: ['gaming'],
        },
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-tags')
      expect(card.textContent).toContain('3')
    })

    it('devrait compter les sons favoris', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'A', favorites: ['all'] },
          { id: 's2', name: 'B', favorites: [] },
          { id: 's3', name: 'C', favorites: ['gaming'] },
        ],
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-favorites')
      expect(card.textContent).toContain('2')
    })

    it('devrait compter les sons joués (played/total)', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'A', playCount: 3 },
          { id: 's2', name: 'B', playCount: 0 },
          { id: 's3', name: 'C', playCount: 1 },
        ],
      })
      renderPage(store)

      const card = screen.getByTestId('stat-card-played')
      expect(card.textContent).toContain('2/3')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // TOP SONS
  // ════════════════════════════════════════════════════════════════════

  describe('top sons', () => {
    it('ne devrait PAS afficher la section si aucun son', () => {
      renderPage()
      expect(screen.queryByTestId('stats-top-sounds')).not.toBeInTheDocument()
    })

    it('devrait afficher la section si sons présents', () => {
      const store = createStore({
        sounds: [{ id: 's1', name: 'Test', playCount: 5 }],
      })
      renderPage(store)
      expect(screen.getByTestId('stats-top-sounds')).toBeInTheDocument()
    })

    it('devrait trier par playCount décroissant', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'Low', playCount: 1 },
          { id: 's2', name: 'High', playCount: 10 },
          { id: 's3', name: 'Mid', playCount: 5 },
        ],
      })
      renderPage(store)

      const section = screen.getByTestId('stats-top-sounds')
      const text = section.textContent
      const highIdx = text.indexOf('High')
      const midIdx = text.indexOf('Mid')
      const lowIdx = text.indexOf('Low')

      expect(highIdx).toBeLessThan(midIdx)
      expect(midIdx).toBeLessThan(lowIdx)
    })

    it('devrait limiter à 10 sons', () => {
      const sounds = Array.from({ length: 15 }, (_, i) => ({
        id: `s${i}`,
        name: `Sound ${i}`,
        playCount: 15 - i,
      }))
      const store = createStore({ sounds })
      renderPage(store)

      // 10 items affichés : #1 à #10
      const text = screen.getByTestId('stats-top-sounds').textContent
      expect(text).toContain('#10')
      expect(text).not.toContain('#11')
    })

    it('devrait afficher le nombre de plays', () => {
      const store = createStore({
        sounds: [{ id: 's1', name: 'Test', playCount: 7 }],
      })
      renderPage(store)

      const section = screen.getByTestId('stats-top-sounds')
      expect(section.textContent).toContain('7')
    })

    it('devrait afficher lastPlayed si présent', () => {
      const store = createStore({
        sounds: [
          { id: 's1', name: 'Test', playCount: 5, lastPlayed: NOW },
        ],
      })
      renderPage(store)

      const section = screen.getByTestId('stats-top-sounds')
      // La date au format fr
      expect(section.textContent).toMatch(/\d{4}/)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // SONS PAR PROFIL
  // ════════════════════════════════════════════════════════════════════

  describe('sons par profil', () => {
    it('ne devrait PAS afficher si 1 seul profil', () => {
      const store = createStore({
        profiles: [{ id: 'all', name: 'Tous' }],
      })
      renderPage(store)
      expect(screen.queryByTestId('stats-profiles')).not.toBeInTheDocument()
    })

    it('devrait afficher la section si > 1 profil', () => {
      const store = createStore({
        profiles: [
          { id: 'all', name: 'Tous' },
          { id: 'p1', name: 'Gaming' },
        ],
      })
      renderPage(store)
      expect(screen.getByTestId('stats-profiles')).toBeInTheDocument()
    })

    it('devrait compter les sons par profil', () => {
      const store = createStore({
        profiles: [
          { id: 'all', name: 'Tous' },
          { id: 'p1', name: 'Gaming' },
        ],
        sounds: [
          { id: 's1', name: 'A', profiles: ['all', 'p1'] },
          { id: 's2', name: 'B', profiles: ['all'] },
          { id: 's3', name: 'C', profiles: ['p1'] },
        ],
      })
      renderPage(store)

      const section = screen.getByTestId('stats-profiles')
      // Gaming a 2 sons
      expect(section.textContent).toContain('Gaming')
      expect(section.textContent).toContain('2')
    })

    it('devrait afficher "allSounds" pour le profil all', () => {
      const store = createStore({
        profiles: [
          { id: 'all', name: 'Tous' },
          { id: 'p1', name: 'Gaming' },
        ],
      })
      renderPage(store)

      const section = screen.getByTestId('stats-profiles')
      expect(section.textContent).toContain('allSounds')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // FILTRES
  // ════════════════════════════════════════════════════════════════════

  describe('filtres de période', () => {
    it('devrait changer de filtre au click (week)', () => {
      renderPage()

      fireEvent.click(screen.getByText('statsWeek'))

      const btn = screen.getByText('statsWeek')
      expect(btn.style.background).toContain('var(--accent-light)')
    })

    it('devrait changer de filtre au click (month)', () => {
      renderPage()

      fireEvent.click(screen.getByText('statsMonth'))

      const btn = screen.getByText('statsMonth')
      expect(btn.style.background).toContain('var(--accent-light)')
    })

    it('devrait recalculer recentPlays avec filtre week', () => {
      const store = createStore({
        sounds: [
          {
            id: 's1',
            name: 'Recent',
            playCount: 5,
            lastPlayed: WEEK_AGO,
          },
          {
            id: 's2',
            name: 'Old',
            playCount: 10,
            lastPlayed: YEAR_AGO,
          },
        ],
      })
      renderPage(store)

      fireEvent.click(screen.getByText('statsWeek'))

      // Le recentPlays devrait être 5 (seul Recent est dans la semaine)
      const playsCard = screen.getByTestId('stat-card-plays')
      expect(playsCard.textContent).toContain('5')
    })

    it('devrait recalculer avec filtre month', () => {
      const store = createStore({
        sounds: [
          {
            id: 's1',
            name: 'Recent',
            playCount: 5,
            lastPlayed: MONTH_AGO,
          },
          {
            id: 's2',
            name: 'Old',
            playCount: 10,
            lastPlayed: YEAR_AGO,
          },
        ],
      })
      renderPage(store)

      fireEvent.click(screen.getByText('statsMonth'))

      const playsCard = screen.getByTestId('stat-card-plays')
      // Recent (5) + Old (0, hors mois) → 5
      expect(playsCard.textContent).toContain('5')
    })

    it('devrait gérer store.sounds undefined', () => {
      renderPage({ profiles: [], tags: {} })
      expect(screen.getByTestId('stats-container')).toBeInTheDocument()
    })

    it('devrait gérer store.profiles undefined', () => {
      renderPage({ sounds: [], tags: {} })
      expect(screen.getByTestId('stats-container')).toBeInTheDocument()
    })

    it('devrait gérer store.tags undefined', () => {
      renderPage({ sounds: [], profiles: [] })
      expect(screen.getByTestId('stats-container')).toBeInTheDocument()
    })
  })
})