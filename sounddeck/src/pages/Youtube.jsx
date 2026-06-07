import { useState, useEffect, useRef } from 'react'
import Waveform from '../components/Waveform'

const EMOJIS = ['🎵','🎤','🎸','🎹','🥁','🎺','🎻','🎼','🔊','💥','😂','🔥']

export default function YouTube({ store, addToast }) {
  const [ytdlpStatus, setYtdlpStatus] = useState(null) // null | 'checking' | 'available' | 'missing'
  const [downloading, setDownloading] = useState(false)
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [soundName, setSoundName] = useState('')
  const [emoji, setEmoji] = useState('🎵')
  const [targetProfiles, setTargetProfiles] = useState(['all'])
  const [step, setStep] = useState('url') // 'url' | 'trim' | 'save'
  const [downloadedPath, setDownloadedPath] = useState(null)
  const [importing, setImporting] = useState(false)

  // Vérifier yt-dlp au montage
  useEffect(() => {
    setYtdlpStatus('checking')
    window.electronAPI.checkYtdlp().then(r => {
      setYtdlpStatus(r.available ? 'available' : 'missing')
    })
  }, [])

  const handleInstallYtdlp = async () => {
    setDownloading(true)
    addToast('Téléchargement de yt-dlp en cours...', 'info')
    const r = await window.electronAPI.downloadYtdlp()
    setDownloading(false)
    if (r.success) {
      setYtdlpStatus('available')
      addToast('yt-dlp installé avec succès !', 'success')
    } else {
      addToast('Erreur installation : ' + r.error, 'error')
    }
  }

  const handleFetchInfo = async () => {
    if (!url.trim()) return
    setLoadingInfo(true)
    setVideoInfo(null)
    const r = await window.electronAPI.youtubeInfo(url.trim())
    setLoadingInfo(false)
    if (r.success) {
      setVideoInfo(r)
      setSoundName(r.title?.slice(0, 50) || '')
      setEnd(r.duration || 0)
      setStart(0)
      setStep('trim')
    } else {
      addToast('Erreur : ' + r.error, 'error')
    }
  }

  const handleDownloadAudio = async () => {
    setImporting(true)
    addToast('Téléchargement audio en cours...', 'info')
    const r = await window.electronAPI.youtubeDownload(
      videoInfo.url, start, end > 0 ? end : videoInfo.duration, videoInfo.title
    )
    setImporting(false)
    if (r.success) {
      setDownloadedPath(r.path)
      setStep('save')
      addToast('Audio téléchargé ! Configurez le son.', 'success')
    } else {
      addToast('Erreur téléchargement : ' + r.error, 'error')
    }
  }

  const handleSave = async () => {
    if (!soundName.trim() || !downloadedPath) return
    await store.addSound({
      name: soundName.trim(),
      path: downloadedPath,
      emoji,
      profiles: targetProfiles
    })
    addToast(`"${soundName.trim()}" ajouté à la bibliothèque !`, 'success')
    // Reset
    setUrl(''); setVideoInfo(null); setDownloadedPath(null)
    setStep('url'); setSoundName(''); setStart(0); setEnd(0)
    setTargetProfiles(['all'])
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ─── Écran yt-dlp manquant ─────────────────────────────────────────────────
  if (ytdlpStatus === 'checking') {
    return <LoadingScreen message="Vérification de yt-dlp..." />
  }

  if (ytdlpStatus === 'missing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title="Import YouTube" sub="Extraire l'audio depuis une vidéo YouTube" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>yt-dlp requis</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
              L'import YouTube nécessite <strong>yt-dlp</strong>, un outil open-source gratuit.
              SoundDeck peut le télécharger automatiquement pour vous.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              <button className="btn-primary" onClick={handleInstallYtdlp} disabled={downloading}
                style={{ fontSize: 14, padding: '10px 24px' }}>
                {downloading
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Installation...</>
                  : <><i className="ti ti-download" /> Installer yt-dlp automatiquement</>}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, lineHeight: 1.6, textAlign: 'left' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              Ou installez manuellement yt-dlp depuis{' '}
              <span style={{ color: 'var(--accent)' }}>github.com/yt-dlp/yt-dlp</span>
              {' '}et assurez-vous qu'il est dans votre PATH système.
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ─── Étape 1 : URL ────────────────────────────────────────────────────────
  if (step === 'url') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title="Import YouTube" sub="Copiez l'URL d'une vidéo YouTube pour en extraire l'audio" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>▶️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
              Collez le lien YouTube
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ flex: 1, fontSize: 13 }}
                autoFocus
              />
              <button className="btn-primary" onClick={handleFetchInfo} disabled={!url.trim() || loadingInfo}
                style={{ flexShrink: 0 }}>
                {loadingInfo
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Chargement...</>
                  : <><i className="ti ti-search" /> Charger</>}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <i className="ti ti-shield-check" style={{ marginRight: 4, color: 'var(--success)' }} />
              Fonctionne avec YouTube, YouTube Music, et la plupart des sites vidéo supportés par yt-dlp.
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ─── Étape 2 : Trim ────────────────────────────────────────────────────────
  if (step === 'trim') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader
          title="Sélectionner la portion"
          sub={`Vidéo : ${videoInfo?.title?.slice(0, 60) || '...'}`}
          onBack={() => setStep('url')}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* Miniature + infos */}
          {videoInfo?.thumbnail && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <img src={videoInfo.thumbnail} alt="" style={{ width: 140, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{videoInfo.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>{videoInfo.uploader}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-clock" /> Durée totale : {fmt(videoInfo.duration)}
                </div>
              </div>
            </div>
          )}

          {/* Sélection début/fin */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portion à extraire
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Durée sélectionnée : <strong style={{ color: 'var(--accent)' }}>{fmt(end - start)}</strong></span>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { setStart(0); setEnd(videoInfo?.duration || 0) }}>
                  <i className="ti ti-refresh" /> Tout sélectionner
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Début : {fmt(start)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={start} onChange={e => setStart(Math.min(Number(e.target.value), end - 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Fin : {fmt(end)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={end} onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              </div>
            </div>

            {/* Champs manuels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Début précis (secondes)</label>
                <input type="number" min="0" max={videoInfo?.duration} step="0.5" value={start}
                  onChange={e => setStart(Math.max(0, Math.min(Number(e.target.value), end - 1)))}
                  style={{ fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Fin précise (secondes)</label>
                <input type="number" min="0" max={videoInfo?.duration} step="0.5" value={end}
                  onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                  style={{ fontSize: 12 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setStep('url')}>
              <i className="ti ti-arrow-left" /> Retour
            </button>
            <button className="btn-primary" onClick={handleDownloadAudio} disabled={importing}
              style={{ fontSize: 13, padding: '8px 20px' }}>
              {importing
                ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Téléchargement...</>
                : <><i className="ti ti-download" /> Télécharger l'audio</>}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ─── Étape 3 : Save ────────────────────────────────────────────────────────
  if (step === 'save') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title="Configurer le son" sub="Dernière étape avant l'ajout à votre bibliothèque" onBack={() => setStep('trim')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>

            {/* Succès */}
            <div style={{ padding: '12px 16px', background: 'rgba(29,158,117,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-check" style={{ color: 'var(--success)', fontSize: 20 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Audio téléchargé avec succès</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Source : {videoInfo?.title?.slice(0, 50)}</div>
              </div>
            </div>

            {/* Aperçu waveform du son téléchargé */}
            {downloadedPath && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Aperçu
                </div>
                <Waveform filePath={downloadedPath} height={60} />
              </div>
            )}

            {/* Nom */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nom du son *
              </label>
              <input value={soundName} onChange={e => setSoundName(e.target.value)}
                placeholder="Nom du son" style={{ fontSize: 13 }} autoFocus />
            </div>

            {/* Emoji */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Emoji
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    style={{
                      width: 36, height: 36, fontSize: 18, borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                      background: emoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)'
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Profils */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ajouter au(x) profil(s)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {store.profiles.map(p => (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${targetProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                    background: targetProfiles.includes(p.id) ? 'var(--accent-light)' : 'transparent'
                  }}>
                    <input type="checkbox" checked={targetProfiles.includes(p.id)}
                      onChange={() => setTargetProfiles(prev =>
                        prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                      )}
                      style={{ accentColor: 'var(--accent)', width: 'auto' }} />
                    <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setStep('trim')}>
                <i className="ti ti-arrow-left" /> Retour
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={!soundName.trim()}
                style={{ fontSize: 13, padding: '8px 24px' }}>
                <i className="ti ti-check" /> Ajouter à la bibliothèque
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function PageHeader({ title, sub, onBack }) {
  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      {onBack && (
        <button className="btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
          <i className="ti ti-arrow-left" />
        </button>
      )}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function LoadingScreen({ message }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
      {message}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}