// src/test/components/FeedbackModal.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import FeedbackModal from '@shared/components/modals/FeedbackModal'

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeApi = (overrides = {}) => ({
  openImageDialog: vi.fn().mockResolvedValue(null),
  readFileBase64: vi.fn().mockResolvedValue({
    success: true,
    base64: btoa('fake-image-bytes'),
  }),
  storeGet: vi.fn().mockResolvedValue(null),
  openExternal: vi.fn(),
  ...overrides,
})

const defaultProps = (overrides = {}) => ({
  onClose: vi.fn(),
  lang: 'fr',
  store: { sounds: [], profiles: [] },
  addToast: vi.fn(),
  ...overrides,
})

let mockCreateObjectURL
let mockRevokeObjectURL

beforeEach(() => {
  global.window.electronAPI = makeApi()

  // Mock URL.createObjectURL (jsdom ne l'implémente pas vraiment)
  mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
  mockRevokeObjectURL = vi.fn()
  global.URL.createObjectURL = mockCreateObjectURL
  global.URL.revokeObjectURL = mockRevokeObjectURL

  // Mock fetch par défaut (webhook succès)
  global.fetch = vi.fn().mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.useRealTimers()
})

const renderModal = (props = {}) => render(<FeedbackModal {...defaultProps(props)} />)

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Rendu', () => {
  it('affiche le titre', () => {
    renderModal()
    expect(screen.getByText('feedbackTitle')).toBeInTheDocument()
  })

  it('affiche les 4 types de feedback', () => {
    renderModal()
    expect(screen.getByText('feedbackBug')).toBeInTheDocument()
    expect(screen.getByText('feedbackFeature')).toBeInTheDocument()
    expect(screen.getByText('feedbackQuestion')).toBeInTheDocument()
    expect(screen.getByText('feedbackPraise')).toBeInTheDocument()
  })

  it('affiche le textarea message', () => {
    renderModal()
    expect(screen.getByPlaceholderText('feedbackPlaceholder')).toBeInTheDocument()
  })

  it('affiche l\'input email (optionnel)', () => {
    renderModal()
    expect(screen.getByPlaceholderText('email@exemple.com')).toBeInTheDocument()
  })

  it('affiche la checkbox "Inclure les logs"', () => {
    renderModal()
    expect(screen.getByText('feedbackIncludeLogs')).toBeInTheDocument()
  })

  it('affiche le bouton "Joindre une image"', () => {
    renderModal()
    expect(screen.getByText(/feedbackAttachImageBtn|Joindre une image/)).toBeInTheDocument()
  })

  it('bouton Envoyer désactivé si message vide', () => {
    renderModal()
    const submitBtn = screen.getByText('feedbackSend').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('bouton Envoyer actif dès qu\'un message est saisi', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Mon message' },
    })
    const submitBtn = screen.getByText('feedbackSend').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SÉLECTION DU TYPE
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Sélection du type', () => {
  it('type par défaut = bug', () => {
    renderModal()
    // Le bouton "bug" a un border accent
    const bugBtn = screen.getByText('feedbackBug').closest('button')
    expect(bugBtn.style.border).toContain('var(--accent)')
  })

  it('clic sur "Idée" change le type', () => {
    renderModal()
    fireEvent.click(screen.getByText('feedbackFeature').closest('button'))
    const featureBtn = screen.getByText('feedbackFeature').closest('button')
    expect(featureBtn.style.border).toContain('var(--accent)')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// FERMETURE
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Fermeture', () => {
  it('clic sur overlay appelle onClose', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })
    const overlay = container.querySelector('.modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('clic dans le modal ne ferme pas', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })
    const modal = container.querySelector('.modal')
    fireEvent.click(modal)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clic sur Annuler ferme', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByText('cancel'))
    expect(onClose).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SUBMIT (onSubmit custom)
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Submit (custom onSubmit)', () => {
  it('appelle onSubmit avec les données du feedback', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Mon super feedback' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
    const [feedback] = onSubmit.mock.calls[0]
    expect(feedback.type).toBe('bug')
    expect(feedback.message).toBe('Mon super feedback')
  })

  it('affiche "Merci" après succès', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(screen.getByText('feedbackThankYou')).toBeInTheDocument()
    })
  })

  it('ferme après 2s après succès', async () => {
    vi.useFakeTimers()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    renderModal({ onSubmit, onClose })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('affiche erreur si onSubmit throw', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('server error'))
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(screen.getByText(/feedbackError/)).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SUBMIT (webhook)
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Submit (webhook)', () => {
  it('envoie au webhook si configuré', async () => {
    window.electronAPI.storeGet.mockImplementation((key) => {
      if (key === 'feedbackWebhookUrls') return Promise.resolve({ bug: 'https://webhook.test/abc' })
      return Promise.resolve(null)
    })

    renderModal()

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.test/abc',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('fallback mailto si aucun webhook configuré', async () => {
    window.electronAPI.storeGet.mockResolvedValue(null)
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(window.electronAPI.openExternal).toHaveBeenCalledWith(
        expect.stringContaining('mailto:')
      )
    })
  })

  it('fallback mailto si webhook HTTP échoue', async () => {
    window.electronAPI.storeGet.mockResolvedValue('https://webhook.test/abc')
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    renderModal()

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(window.electronAPI.openExternal).toHaveBeenCalled()
    })
  })

  it('utilise feedbackWebhookUrl par défaut si pas de type spécifique', async () => {
    window.electronAPI.storeGet.mockImplementation((key) => {
      if (key === 'feedbackWebhookUrl') return Promise.resolve('https://default.test/hook')
      return Promise.resolve(null)
    })

    renderModal()

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://default.test/hook',
        expect.anything()
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Logs', () => {
  it('inclut les logs si checkbox cochée', async () => {
    const logs = [{ id: '1', message: 'err1' }]
    window.electronAPI.storeGet.mockImplementation((key) => {
      if (key === 'errorLogs') return Promise.resolve(logs)
      return Promise.resolve(null)
    })

    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackIncludeLogs').previousSibling)
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      const [feedback] = onSubmit.mock.calls[0]
      expect(feedback.logs).toEqual(logs)
    })
  })

  it('logs=undefined si checkbox non cochée', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      const [feedback] = onSubmit.mock.calls[0]
      expect(feedback.logs).toBeUndefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PIÈCE JOINTE IMAGE
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Pièce jointe image', () => {
  it('bouton "Joindre une image" appelle openImageDialog', async () => {
    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))
    await waitFor(() => {
      expect(window.electronAPI.openImageDialog).toHaveBeenCalled()
    })
  })

  it('si annulé → pas d\'image attachée', async () => {
    window.electronAPI.openImageDialog.mockResolvedValue(null)
    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))

    await waitFor(() => {
      expect(window.electronAPI.openImageDialog).toHaveBeenCalled()
    })
    // Le bouton "Joindre" est toujours là
    expect(screen.getByText(/feedbackAttachImageBtn|Joindre une image/)).toBeInTheDocument()
  })

  it('attache l\'image si succès', async () => {
    window.electronAPI.openImageDialog.mockResolvedValue('/path/img.png')
    window.electronAPI.readFileBase64.mockResolvedValue({
      success: true,
      base64: btoa('fake'),
    })

    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))

    await waitFor(() => {
      expect(window.electronAPI.readFileBase64).toHaveBeenCalledWith('/path/img.png')
    })
  })

  it('erreur si readFileBase64 échoue', async () => {
    window.electronAPI.openImageDialog.mockResolvedValue('/path/img.png')
    window.electronAPI.readFileBase64.mockResolvedValue({
      success: false,
      error: 'permission denied',
    })

    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))

    await waitFor(() => {
      expect(screen.getByText(/permission denied|Impossible/)).toBeInTheDocument()
    })
  })

  it('erreur si readFileBase64 non disponible', async () => {
    window.electronAPI.openImageDialog.mockResolvedValue('/path/img.png')
    delete window.electronAPI.readFileBase64

    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))

    await waitFor(() => {
      expect(screen.getByText(/readFileBase64 non disponible/)).toBeInTheDocument()
    })
  })

  it('erreur si exception openImageDialog', async () => {
    window.electronAPI.openImageDialog.mockRejectedValue(new Error('crash'))

    renderModal()
    fireEvent.click(screen.getByText(/feedbackAttachImageBtn|Joindre une image/))

    await waitFor(() => {
      expect(screen.getByText('crash')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// EMAIL
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Email', () => {
  it('email inclus dans le feedback si saisi', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.change(screen.getByPlaceholderText('email@exemple.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      const [feedback] = onSubmit.mock.calls[0]
      expect(feedback.email).toBe('test@test.com')
    })
  })

  it('email=undefined si vide', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSubmit })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      const [feedback] = onSubmit.mock.calls[0]
      expect(feedback.email).toBeUndefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// MÉTADONNÉES
// ═══════════════════════════════════════════════════════════════════════
describe('FeedbackModal > Métadonnées', () => {
  it('inclut les counts de sounds/profiles', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const store = {
      sounds: [{ id: 's1' }, { id: 's2' }],
      profiles: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
    }
    renderModal({ onSubmit, store })

    fireEvent.change(screen.getByPlaceholderText('feedbackPlaceholder'), {
      target: { value: 'Test' },
    })
    fireEvent.click(screen.getByText('feedbackSend').closest('button'))

    await waitFor(() => {
      const [feedback] = onSubmit.mock.calls[0]
      expect(feedback.soundCount).toBe(2)
      expect(feedback.profileCount).toBe(3)
    })
  })
})