// src/test/features/options/sections/BackupSection.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  initBackupManager: vi.fn(),
  stopAutoBackup: vi.fn(),
  startAutoBackup: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/utils/backupManager', () => ({
  initBackupManager: mocks.initBackupManager,
  stopAutoBackup: mocks.stopAutoBackup,
  startAutoBackup: mocks.startAutoBackup,
}))

vi.mock('@shared/components/settings/BackupSettings', () => ({
  default: () => <div data-testid="backup-settings" />,
}))

import BackupSection from '@features/options/sections/BackupSection'

describe('BackupSection', () => {
  let store
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()

    store = {
      autoBackupEnabled: false,
      backupInterval: 5,
      updateAutoBackupEnabled: vi.fn().mockResolvedValue(),
      updateBackupInterval: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()

    window.electronAPI = {
      exportConfig: vi.fn().mockResolvedValue({ success: true }),
      exportFull: vi.fn().mockResolvedValue({ success: true, sizeMb: '5.6' }),
      exportSoundsOnly: vi.fn().mockResolvedValue({ success: true, sizeMb: '4.2' }),
      importBackup: vi.fn().mockResolvedValue({ success: true, type: 'json' }),
    }
  })

  const renderSection = (overrides = {}) =>
    render(
      <BackupSection
        sectionRef={() => {}}
        store={{ ...store, ...overrides }}
        addToast={addToast}
      />
    )

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════

  it('devrait afficher le titre optionsBackup', () => {
    renderSection()
    expect(screen.getByText('optionsBackup')).toBeInTheDocument()
  })

  it('devrait exposer le testid section-backup', () => {
    renderSection()
    expect(screen.getByTestId('section-backup')).toBeInTheDocument()
  })

  it('devrait afficher BackupSettings mocké', () => {
    renderSection()
    expect(screen.getByTestId('backup-settings')).toBeInTheDocument()
  })

  // ════════════════════════════════════════════════════════════════════
  // AUTO BACKUP
  // ════════════════════════════════════════════════════════════════════

  describe('autoBackup', () => {
    it('devrait appeler updateAutoBackupEnabled au click', () => {
      const { container } = renderSection()
      const toggle = container.querySelector('.toggle')
      fireEvent.click(toggle)
      expect(store.updateAutoBackupEnabled).toHaveBeenCalledWith(true)
    })

    it('devrait appeler initBackupManager + toast si activé', async () => {
      const { container } = renderSection()
      fireEvent.click(container.querySelector('.toggle'))

      await waitFor(() => {
        expect(mocks.initBackupManager).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalledWith('autoBackupEnabled', 'success')
      })
    })

    it('devrait appeler stopAutoBackup + toast si désactivé', async () => {
      const { container } = renderSection({ autoBackupEnabled: true })
      fireEvent.click(container.querySelector('.toggle'))

      await waitFor(() => {
        expect(mocks.stopAutoBackup).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalledWith('autoBackupDisabled', 'info')
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // INTERVAL
  // ════════════════════════════════════════════════════════════════════

  describe('backupInterval', () => {
    it('devrait appeler updateBackupInterval au change', () => {
      renderSection()
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '15' } })
      expect(store.updateBackupInterval).toHaveBeenCalledWith(15)
    })

    it('devrait afficher un toast après changement', async () => {
      renderSection()
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } })

      await waitFor(() => {
        const call = addToast.mock.calls.find(
          (c) => c[0].includes('backupIntervalChanged')
        )
        expect(call).toBeDefined()
      })
    })

    it('devrait afficher "minute" (singulier) pour 1', async () => {
      renderSection()
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

      await waitFor(() => {
        const call = addToast.mock.calls.find((c) => c[0].includes('minute'))
        expect(call[0]).toMatch(/minute/)
        expect(call[0]).not.toMatch(/minutes/)
      })
    })

    it('devrait restart autoBackup si activé', async () => {
      renderSection({ autoBackupEnabled: true })
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '15' } })

      await waitFor(() => {
        expect(mocks.stopAutoBackup).toHaveBeenCalled()
        expect(mocks.startAutoBackup).toHaveBeenCalled()
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════════

  describe('exports', () => {
    it('devrait appeler exportConfig', async () => {
      renderSection()
      const btns = screen.getAllByText('exportLabel')
      fireEvent.click(btns[0])

      await waitFor(() => {
        expect(window.electronAPI.exportConfig).toHaveBeenCalled()
      })
    })

    it('devrait appeler exportFull', async () => {
      renderSection()
      const btns = screen.getAllByText('exportLabel')
      fireEvent.click(btns[1])

      await waitFor(() => {
        expect(window.electronAPI.exportFull).toHaveBeenCalled()
      })
    })

    it('devrait appeler exportSoundsOnly', async () => {
      renderSection()
      const btns = screen.getAllByText('exportLabel')
      fireEvent.click(btns[2])

      await waitFor(() => {
        expect(window.electronAPI.exportSoundsOnly).toHaveBeenCalled()
      })
    })

    it('devrait afficher toast succès config export', async () => {
      renderSection()
      fireEvent.click(screen.getAllByText('exportLabel')[0])

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('toastConfigExported', 'success')
      })
    })

    it('devrait afficher toast erreur config export', async () => {
      window.electronAPI.exportConfig.mockResolvedValue({
        success: false,
        error: 'boom',
      })
      renderSection()
      fireEvent.click(screen.getAllByText('exportLabel')[0])

      await waitFor(() => {
        const call = addToast.mock.calls.find(
          (c) => c[1] === 'error' && c[0].includes('boom')
        )
        expect(call).toBeDefined()
      })
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // IMPORT
  // ════════════════════════════════════════════════════════════════════

  describe('import', () => {
    it('devrait appeler importBackup au click', async () => {
      renderSection()
      fireEvent.click(screen.getByText('importLabel'))

      await waitFor(() => {
        expect(window.electronAPI.importBackup).toHaveBeenCalled()
      })
    })

    it('devrait afficher toast succès type=json', async () => {
      window.electronAPI.importBackup.mockResolvedValue({
        success: true,
        type: 'json',
      })
      renderSection()
      fireEvent.click(screen.getByText('importLabel'))

      await waitFor(() => {
        const call = addToast.mock.calls.find((c) => c[0].includes('configImported'))
        expect(call).toBeDefined()
      })
    })

    it('devrait afficher toast succès type=full', async () => {
      window.electronAPI.importBackup.mockResolvedValue({
        success: true,
        type: 'full',
        importedSounds: 5,
      })
      renderSection()
      fireEvent.click(screen.getByText('importLabel'))

      await waitFor(() => {
        const call = addToast.mock.calls.find((c) => c[0].includes('archiveImported'))
        expect(call).toBeDefined()
      })
    })

    it('devrait afficher toast succès type=sounds-only', async () => {
      window.electronAPI.importBackup.mockResolvedValue({
        success: true,
        type: 'sounds-only',
        importedSounds: 3,
      })
      renderSection()
      fireEvent.click(screen.getByText('importLabel'))

      await waitFor(() => {
        const call = addToast.mock.calls.find((c) => c[0].includes('imported'))
        expect(call).toBeDefined()
      })
    })

    it('devrait afficher toast erreur si échec', async () => {
      window.electronAPI.importBackup.mockResolvedValue({
        success: false,
        error: 'invalid',
      })
      renderSection()
      fireEvent.click(screen.getByText('importLabel'))

      await waitFor(() => {
        const call = addToast.mock.calls.find((c) => c[1] === 'error')
        expect(call).toBeDefined()
      })
    })
  })
})