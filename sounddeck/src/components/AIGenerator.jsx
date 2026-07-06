import { useState } from 'react'
import { useTranslation } from '../i18n'
import { generateSoundWithAI, loadAudioBuffer } from '../utils/aiTagging'

export default function AIGenerator({ store, onAddSound, onClose, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(2)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSound, setGeneratedSound] = useState(null)
  const [name, setName] = useState('')
  const [selectedProfiles, setSelectedProfiles] = useState(['all'])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert(tr('enterPrompt'))
      return
    }

    setIsGenerating(true)
    setGeneratedSound(null)

    try {
      const buffer = generateSoundWithAI(prompt, duration)
      
      setGeneratedSound({
        buffer,
        duration,
        name: prompt.slice(0, 30)
      })
      
      setName(prompt.slice(0, 30))
      
    } catch (e) {
      console.error('Erreur génération:', e)
      alert(tr('generationError'))
    }

    setIsGenerating(false)
  }

  const handleSave = async () => {
    if (!generatedSound || !name.trim()) return

    const soundData = {
      name: name.trim(),
      path: `generated_${Date.now()}.mp3`,
      emoji: '🎵',
      profiles: selectedProfiles,
      _buffer: generatedSound.buffer
    }

    await store.addSound(soundData)
    onAddSound?.(soundData)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-wand" style={{ color: 'var(--accent)' }} />
          {tr('aiGenerator')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('prompt')} *
            </label>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={tr('promptPlaceholder')}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('duration')}: {duration}s
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <button
            className="btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            style={{ justifyContent: 'center', borderRadius: 'var(--radius-md)', minHeight: 40 }}
          >
            {isGenerating ? (
              <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('generating')}</>
            ) : (
              <><i className="ti ti-wand" /> {tr('generateSound')}</>
            )}
          </button>

          {generatedSound && (
            <>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--success)'
              }}>
                <div style={{ fontSize: 12, color: 'var(--success)' }}>
                  <i className="ti ti-check" /> {tr('soundGenerated')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {tr('duration')}: {generatedSound.duration.toFixed(1)}s
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('soundName')} *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={tr('soundNamePlaceholder')}
                  className="input-lg"
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('profiles')}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {store.profiles.map(p => (
                    <label key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${selectedProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedProfiles.includes(p.id) ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedProfiles.includes(p.id)}
                        onChange={() => {
                          setSelectedProfiles(prev =>
                            prev.includes(p.id)
                              ? prev.filter(x => x !== p.id)
                              : [...prev, p.id]
                          )
                        }}
                        style={{ accentColor: 'var(--accent)', width: 'auto' }}
                      />
                      <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary btn-lg" onClick={onClose} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
            <i className="ti ti-x" /> {tr('cancel')}
          </button>
          {generatedSound && (
            <button
              className="btn-primary btn-lg"
              onClick={handleSave}
              disabled={!name.trim()}
              style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}
            >
              <i className="ti ti-check" /> {tr('addSound')}
            </button>
          )}
        </div>

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}