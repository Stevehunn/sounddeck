import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SaveStep from './SaveStep'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
  }),
}))

vi.mock('@shared/components/ui/EmojiPicker', () => ({
  default: ({ isOpen, onSelect }) =>
    isOpen ? (
      <div data-testid="emoji-picker">
        <button onClick={() => onSelect('🎸')}>PICK</button>
      </div>
    ) : null,
}))

vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-image" onClick={onDelete}>
      Delete
    </button>
  ),
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: (p) => (p ? `sounddeck-local://file/${p}` : null),
}))

const info = { title: 'Ma vidéo', duration: 180 }
const profiles = [
  { id: 'all', name: 'Tous', isDefault: true },
  { id: 'p1', name: 'Gaming' },
]

describe('SaveStep', () => {
  const baseProps = {
    info,
    currentPath: '/audio.mp3',
    isTutorialMode: false,
    soundName: 'Mon son',
    setSoundName: vi.fn(),
    emoji: '🎵',
    setEmoji: vi.fn(),
    customImage: null,
    setCustomImage: vi.fn(),
    useThumbnail: false,
    setUseThumbnail: vi.fn(),
    finalImage: null,
    videoInfo: null,
    targetProfiles: ['all'],
    setTargetProfiles: vi.fn(),
    availableProfiles: profiles,
    noProfilesSelected: false,
    noUserProfiles: false,
    isPreviewPlaying: false,
    togglePreview: vi.fn(),
    showEmojiPicker: false,
    setShowEmojiPicker: vi.fn(),
    isProcessing: false,
    savingRef: false,
    onBack: vi.fn(),
    onSave: vi.fn(),
    onPickImage: vi.fn(),
    addToast: vi.fn(),
  }

  it('devrait afficher le titre configSound', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByText('configSound')).toBeInTheDocument()
  })

  it('devrait afficher l\'input de nom avec la valeur', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByTestId('youtube-save-controls')).toHaveValue('Mon son')
  })

  it('devrait appeler setSoundName on change', () => {
    const setSoundName = vi.fn()
    render(<SaveStep {...baseProps} setSoundName={setSoundName} />)
    fireEvent.change(screen.getByTestId('youtube-save-controls'), {
      target: { value: 'Nouveau' },
    })
    expect(setSoundName).toHaveBeenCalledWith('Nouveau')
  })

  it('devrait afficher le titre source', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByText(/Ma vidéo/)).toBeInTheDocument()
  })

  it('devrait afficher le preview audio', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByText(/ytAudioReady/)).toBeInTheDocument()
  })

  it('devrait appeler togglePreview au click', () => {
    const togglePreview = vi.fn()
    render(<SaveStep {...baseProps} togglePreview={togglePreview} />)
    fireEvent.click(screen.getByText('listen'))
    expect(togglePreview).toHaveBeenCalledWith('/audio.mp3')
  })

  it('devrait afficher "stop" si isPreviewPlaying', () => {
    render(<SaveStep {...baseProps} isPreviewPlaying={true} />)
    expect(screen.getByText('stop')).toBeInTheDocument()
  })

  it('devrait afficher les profils', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByText('allSounds')).toBeInTheDocument()
    expect(screen.getByText('Gaming')).toBeInTheDocument()
  })

  it('devrait appeler setTargetProfiles quand on coche un profil', () => {
    const setTargetProfiles = vi.fn()
    render(<SaveStep {...baseProps} setTargetProfiles={setTargetProfiles} />)
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Gaming
    expect(setTargetProfiles).toHaveBeenCalled()
  })

  it('devrait afficher l\'alerte si noUserProfiles', () => {
    render(<SaveStep {...baseProps} noUserProfiles={true} availableProfiles={[]} />)
    // Le message d'alerte
    expect(screen.getByText(/ytNoUserProfile/)).toBeInTheDocument()
  })

  it('devrait afficher l\'erreur si noProfilesSelected', () => {
    render(<SaveStep {...baseProps} noProfilesSelected={true} />)
    expect(screen.getByText(/editorProfileRequired/)).toBeInTheDocument()
  })

  it('devrait appeler onBack au click', () => {
    const onBack = vi.fn()
    render(<SaveStep {...baseProps} onBack={onBack} />)
    const btns = screen.getAllByText('ytBack')
    fireEvent.click(btns[btns.length - 1].closest('button'))
    expect(onBack).toHaveBeenCalled()
  })

  it('devrait appeler onSave au click', () => {
    const onSave = vi.fn()
    render(<SaveStep {...baseProps} onSave={onSave} />)
    fireEvent.click(screen.getByTestId('youtube-save-button'))
    expect(onSave).toHaveBeenCalled()
  })

  it('devrait désactiver le bouton Save si son nom est vide', () => {
    render(<SaveStep {...baseProps} soundName="" />)
    expect(screen.getByTestId('youtube-save-button')).toBeDisabled()
  })

  it('devrait désactiver le bouton Save si savingRef', () => {
    render(<SaveStep {...baseProps} savingRef={true} />)
    expect(screen.getByTestId('youtube-save-button')).toBeDisabled()
  })

  it('devrait désactiver le bouton Save si noProfilesSelected', () => {
    render(<SaveStep {...baseProps} noProfilesSelected={true} />)
    expect(screen.getByTestId('youtube-save-button')).toBeDisabled()
  })

  it('devrait afficher "saving" si isProcessing', () => {
    render(<SaveStep {...baseProps} isProcessing={true} />)
    expect(screen.getByText('saving')).toBeInTheDocument()
  })

  it('devrait afficher le bouton emoji', () => {
    render(<SaveStep {...baseProps} />)
    expect(screen.getByTestId('youtube-emoji-picker-button')).toHaveTextContent('🎵')
  })

  it('devrait ouvrir l\'EmojiPicker au click', () => {
    const setShowEmojiPicker = vi.fn()
    render(<SaveStep {...baseProps} setShowEmojiPicker={setShowEmojiPicker} />)
    fireEvent.click(screen.getByTestId('youtube-emoji-picker-button'))
    expect(setShowEmojiPicker).toHaveBeenCalledWith(true)
  })

  it('devrait appeler setEmoji via EmojiPicker', () => {
    const setEmoji = vi.fn()
    const setShowEmojiPicker = vi.fn()
    render(
      <SaveStep
        {...baseProps}
        showEmojiPicker={true}
        setEmoji={setEmoji}
        setShowEmojiPicker={setShowEmojiPicker}
      />
    )
    fireEvent.click(screen.getByText('PICK'))
    expect(setEmoji).toHaveBeenCalledWith('🎸')
  })

  it('devrait afficher le bouton "useThumbnail" si videoInfo.thumbnail', () => {
    render(<SaveStep {...baseProps} videoInfo={{ thumbnail: 'https://t.jpg' }} />)
    expect(screen.getByText('useThumbnail')).toBeInTheDocument()
  })

  it('devrait afficher "thumbnailActive" si useThumbnail=true', () => {
    render(
      <SaveStep
        {...baseProps}
        useThumbnail={true}
        videoInfo={{ thumbnail: 'https://t.jpg' }}
      />
    )
    expect(screen.getByText('thumbnailActive')).toBeInTheDocument()
  })

  it('devrait appeler onPickImage au click', () => {
    const onPickImage = vi.fn()
    render(<SaveStep {...baseProps} onPickImage={onPickImage} />)
    fireEvent.click(screen.getByText('ytImageAdd'))
    expect(onPickImage).toHaveBeenCalled()
  })

  it('devrait afficher "ytImageChange" si customImage', () => {
    render(<SaveStep {...baseProps} customImage="/img.png" />)
    expect(screen.getByText('ytImageChange')).toBeInTheDocument()
  })

  it('devrait afficher le DeleteButton si image/thumbnail active', () => {
    render(<SaveStep {...baseProps} customImage="/img.png" />)
    expect(screen.getByTestId('delete-image')).toBeInTheDocument()
  })

  it('DeleteButton devrait reset image et thumbnail', () => {
    const setCustomImage = vi.fn()
    const setUseThumbnail = vi.fn()
    render(
      <SaveStep
        {...baseProps}
        customImage="/img.png"
        setCustomImage={setCustomImage}
        setUseThumbnail={setUseThumbnail}
      />
    )
    fireEvent.click(screen.getByTestId('delete-image'))
    expect(setCustomImage).toHaveBeenCalledWith(null)
    expect(setUseThumbnail).toHaveBeenCalledWith(false)
  })

  it('devrait afficher "tutorialMode" en mode tutoriel', () => {
    render(<SaveStep {...baseProps} isTutorialMode={true} />)
    expect(screen.getByText(/tutorialMode/)).toBeInTheDocument()
  })
})