import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import ImportFileModal from '@features/editor/components/Modals/ImportFileModal'

describe('ImportFileModal', () => {
  const createTrack = (o = {}) => ({
    id: 't1',
    name: 'Piste 1',
    clips: [],
    ...o,
  })

  let onClose
  let onConfirm
  let tr
  let tracks

  const defaultProps = () => ({
    isOpen: true,
    onClose,
    onConfirm,
    tracks,
    tr,
    defaultTrackId: 't1',
    initialFilePath: null,
    initialFileName: '',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onConfirm = vi.fn()
    tr = vi.fn((key) => key)
    tracks = [
      createTrack({ id: 't1', name: 'Piste A' }),
      createTrack({ id: 't2', name: 'Piste B' }),
    ]

    // Mock openFileDialog
    window.electronAPI = {
      openFileDialog: vi.fn(),
    }
  })

  it('devrait retourner null si isOpen=false', () => {
    const { container } = render(
      <ImportFileModal {...defaultProps()} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre un modal', () => {
    const { container } = render(<ImportFileModal {...defaultProps()} />)
    expect(container.querySelector('.modal-overlay')).not.toBeNull()
  })

  it('devrait afficher le titre', () => {
    const { getByText } = render(<ImportFileModal {...defaultProps()} />)
    expect(getByText('editorImportFile')).toBeInTheDocument()
  })

  it('devrait initialiser trackId avec defaultTrackId', () => {
    const { container } = render(<ImportFileModal {...defaultProps()} />)
    const selects = container.querySelectorAll('select')
    expect(selects[0]?.value).toBe('t1')
  })

  it('devrait initialiser trackId avec tracks[0].id si defaultTrackId absent', () => {
    const { container } = render(
      <ImportFileModal {...defaultProps()} defaultTrackId="" />
    )
    const selects = container.querySelectorAll('select')
    expect(selects[0]?.value).toBe('t1')
  })

  it('devrait initialiser avec initialFilePath', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/path/to/file.mp3"
        initialFileName="MySound"
      />
    )
    // Le nom doit être pré-rempli
    const nameInput = container.querySelector('input[type="text"]')
    expect(nameInput?.value).toBe('MySound')
  })

  it('devrait afficher "Choisissez un fichier" si pas de fichier', () => {
    const { container } = render(<ImportFileModal {...defaultProps()} />)
    expect(container.textContent).toContain('dropFiles')
  })

  it('devrait afficher le nom du fichier après sélection', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/Test.mp3"
        initialFileName=""
      />
    )
    // L'icône "check" doit être présente
    expect(container.textContent).toContain('Test.mp3')
  })

  it('devrait appeler openFileDialog au click sur la drop zone', async () => {
    window.electronAPI.openFileDialog.mockResolvedValue(['/x/new.mp3'])
    const { container } = render(<ImportFileModal {...defaultProps()} />)

    const dropZone = container.querySelector('.modal form > div')
    await act(async () => {
      fireEvent.click(dropZone)
    })

    expect(window.electronAPI.openFileDialog).toHaveBeenCalled()
  })

  it('devrait rejeter un format non supporté', async () => {
    window.electronAPI.openFileDialog.mockResolvedValue(['/x/file.txt'])
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { container } = render(<ImportFileModal {...defaultProps()} />)

    const dropZone = container.querySelector('.modal form > div')
    await act(async () => {
      fireEvent.click(dropZone)
    })

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Format non supporté')
    )
    alertSpy.mockRestore()
  })

  it('devrait accepter les formats supportés', async () => {
    window.electronAPI.openFileDialog.mockResolvedValue(['/x/song.mp3'])
    const { container } = render(<ImportFileModal {...defaultProps()} />)

    const dropZone = container.querySelector('.modal form > div')
    await act(async () => {
      fireEvent.click(dropZone)
    })

    expect(container.textContent).toContain('song.mp3')
  })

  it('devrait appeler onConfirm au submit', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/Test.mp3"
        initialFileName="Test"
      />
    )

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith({
      filePath: '/x/Test.mp3',
      fileName: 'Test',
      trackId: 't1',
      startTime: 0,
    })
  })

  it('devrait valider si filePath absent', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { container } = render(<ImportFileModal {...defaultProps()} />)

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('devrait accepter une modification du nom', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/a.mp3"
        initialFileName="Original"
      />
    )

    const nameInput = container.querySelector('input[type="text"]')
    fireEvent.change(nameInput, { target: { value: 'Nouveau' } })

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'Nouveau' })
    )
  })

  it('devrait accepter une modification de la piste', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/a.mp3"
        initialFileName="X"
      />
    )

    const trackSelect = container.querySelector('select')
    fireEvent.change(trackSelect, { target: { value: 't2' } })

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 't2' })
    )
  })

  it('devrait accepter un startTime personnalisé', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/a.mp3"
        initialFileName="X"
      />
    )

    const numberInput = container.querySelector('input[type="number"]')
    fireEvent.change(numberInput, { target: { value: '2.5' } })

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: 2.5 })
    )
  })

  it('devrait clamper startTime à 0 minimum', () => {
    const { container } = render(
      <ImportFileModal
        {...defaultProps()}
        initialFilePath="/x/a.mp3"
        initialFileName="X"
      />
    )

    const numberInput = container.querySelector('input[type="number"]')
    fireEvent.change(numberInput, { target: { value: '-5' } })

    fireEvent.submit(container.querySelector('form'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: 0 })
    )
  })

  it('devrait appeler onClose au click Annuler', () => {
    const { getByText } = render(<ImportFileModal {...defaultProps()} />)
    fireEvent.click(getByText('cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler onClose au click overlay', () => {
    const { container } = render(<ImportFileModal {...defaultProps()} />)
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait gérer les exceptions de openFileDialog', async () => {
    window.electronAPI.openFileDialog.mockRejectedValue(new Error('boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<ImportFileModal {...defaultProps()} />)

    const dropZone = container.querySelector('.modal form > div')
    await act(async () => {
      fireEvent.click(dropZone)
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})