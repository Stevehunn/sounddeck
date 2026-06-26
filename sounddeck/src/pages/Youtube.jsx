import { useState, useEffect, useRef } from 'react'
import Waveform from '../components/Waveform'
import { useTranslation } from '../i18n'

const EMOJIS = ['🎵','🎤','🎸','🎹','🥁','🎺','🎻','🎼','🔊','💥','😂','🔥']

export default function YouTube({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [ytdlpStatus, setYtdlpStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [soundName, setSoundName] = useState('')
  const [emoji, setEmoji] = useState('🎵')
  const [targetProfiles, setTargetProfiles] = useState(['all'])
  const [step, setStep] = useState('url')
  const [downloadedPath, setDownloadedPath] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setYtdlpStatus('checking')
    window.electronAPI.checkYtdlp().then(r => {
      setYtdlpStatus(r.available ? 'available' : 'missing')
    })
  }, [])

  const handleInstallYtdlp = async () => {
    setDownloading(true)
    addToast(tr('ytdlpDownloading'), 'info')
    const r = await window.electronAPI.downloadYtdlp()
    setDownloading(false)
    if (r.success) {
      setYtdlpStatus('available')
      addToast(tr('ytdlpInstalled'), 'success')
    } else {
      addToast(tr('ytdlpInstallError') + r.error, 'error')
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
      addToast(tr('ytFetchError') + r.error, 'error')
    }
  }

  const handleDownloadAudio = async () => {
    setImporting(true)
    addToast(tr('ytAudioDownloading'), 'info')
    const r = await window.electronAPI.youtubeDownload(
      videoInfo.url, start, end > 0 ? end : videoInfo.duration, videoInfo.title
    )
    setImporting(false)
    if (r.success) {
      setDownloadedPath(r.path)
      setStep('save')
      addToast(tr('ytAudioReady'), 'success')
    } else {
      addToast(tr('ytDownloadError') + r.error, 'error')
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
    addToast(`"${soundName.trim()}" ${tr('ytSoundAdded')}`, 'success')
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

  if (ytdlpStatus === 'checking') {
    return <LoadingScreen message={tr('ytdlpChecking')} />
  }

  if (ytdlpStatus === 'missing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title={tr('youtubeTitle')} sub={tr('youtubeSub')} />
        <div className="flex-center" style={{ flex: 1, padding: 40 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{tr('ytdlpRequired')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
              {tr('ytdlpDesc')}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              <button 
                className="btn-primary btn-lg" 
                onClick={handleInstallYtdlp} 
                disabled={downloading}
                style={{ borderRadius: 'var(--radius-md)', padding: '10px 24px' }}
              >
                {downloading
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('installing')}</>
                  : <><i className="ti ti-download" /> {tr('installYtdlp')}</>}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', lineHeight: 1.6, textAlign: 'left' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              {tr('ytdlpManual')}
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (step === 'url') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title={tr('youtubeTitle')} sub={tr('pasteUrl')} />
        <div className="flex-center" style={{ flex: 1, padding: 40 }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>▶️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
              {tr('pasteUrl')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
                placeholder={tr('ytUrlPlaceholder')}
                className="input-lg"
                style={{ flex: 1, fontSize: 13, borderRadius: 'var(--radius-md)' }}
                autoFocus
              />
              <button 
                className="btn-primary btn-lg" 
                onClick={handleFetchInfo} 
                disabled={!url.trim() || loadingInfo}
                style={{ flexShrink: 0, borderRadius: 'var(--radius-md)', minWidth: 120 }}
              >
                {loadingInfo
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('loading2')}</>
                  : <><i className="ti ti-search" /> {tr('load')}</>}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <i className="ti ti-shield-check" style={{ marginRight: 4, color: 'var(--success)' }} />
              {tr('ytUrlNote')}
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (step === 'trim') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader
          title={tr('selectPortion')}
          sub={`${tr('youtubeTitle')} : ${videoInfo?.title?.slice(0, 60) || '...'}`}
          onBack={() => setStep('url')}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {videoInfo?.thumbnail && (
            <div className="option-row" style={{ marginBottom: 24, padding: 16, borderRadius: 'var(--radius-md)' }}>
              <img src={videoInfo.thumbnail} alt="" style={{ width: 140, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '0 12px' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{videoInfo.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>{videoInfo.uploader}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-clock" /> {tr('ytTrimTotalDuration')} {fmt(videoInfo.duration)}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tr('ytTrimTitle')}
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tr('ytTrimDuration')} <strong style={{ color: 'var(--accent)' }}>{fmt(end - start)}</strong></span>
                <button className="btn-ghost btn-sm" onClick={() => { setStart(0); setEnd(videoInfo?.duration || 0) }} style={{ borderRadius: 'var(--radius-sm)' }}>
                  <i className="ti ti-refresh" /> {tr('ytTrimSelectAll')}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {tr('start')} : {fmt(start)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={start} onChange={e => setStart(Math.min(Number(e.target.value), end - 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {tr('end')} : {fmt(end)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={end} onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('ytPreciseStart')}</label>
                <input 
                  type="number" 
                  min="0" 
                  max={videoInfo?.duration} 
                  step="0.5" 
                  value={start}
                  onChange={e => setStart(Math.max(0, Math.min(Number(e.target.value), end - 1)))}
                  className="input-sm"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{tr('ytPreciseEnd')}</label>
                <input 
                  type="number" 
                  min="0" 
                  max={videoInfo?.duration} 
                  step="0.5" 
                  value={end}
                  onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                  className="input-sm"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button 
              className="btn-secondary btn-lg" 
              onClick={() => setStep('url')} 
              style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}
            >
              <i className="ti ti-arrow-left" /> {tr('ytBack')}
            </button>
            <button 
              className="btn-primary btn-lg" 
              onClick={handleDownloadAudio} 
              disabled={importing} 
              style={{ borderRadius: 'var(--radius-md)', minWidth: 180 }}
            >
              {importing
                ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('ytDownloading')}</>
                : <><i className="ti ti-download" /> {tr('downloadAudio')}</>}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (step === 'save') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title={tr('configSound')} sub={tr('ytSaveSubtitle')} onBack={() => setStep('trim')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>

            <div className="option-row" style={{ borderColor: 'var(--success)', marginBottom: 20, padding: '12px 16px', background: 'rgba(29,158,117,0.1)', borderRadius: 'var(--radius-md)' }}>
              <i className="ti ti-check" style={{ color: 'var(--success)', fontSize: 20 }} />
              <div style={{ flex: 1, padding: '0 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{tr('ytSuccessTitle')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('ytSuccessSource')} {videoInfo?.title?.slice(0, 50)}</div>
              </div>
            </div>

            {downloadedPath && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {tr('editorPreview')}
                </div>
                <Waveform filePath={downloadedPath} height={60} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tr('soundName')}
              </label>
              <input 
                value={soundName} 
                onChange={e => setSoundName(e.target.value)}
                placeholder={tr('ytSoundNamePlaceholder')} 
                className="input-lg"
                style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                autoFocus 
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tr('editorEmojiLabel')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    style={{
                      width: 36, height: 36, fontSize: 18, borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: `1px solid ${emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                      background: emoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)'
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tr('ytProfilesLabel')}
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

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button 
                className="btn-secondary btn-lg" 
                onClick={() => setStep('trim')} 
                style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}
              >
                <i className="ti ti-arrow-left" /> {tr('ytBack')}
              </button>
              <button 
                className="btn-primary btn-lg" 
                onClick={handleSave} 
                disabled={!soundName.trim()} 
                style={{ borderRadius: 'var(--radius-md)', minWidth: 200 }}
              >
                <i className="ti ti-check" /> {tr('addToLibrary')}
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
        <button className="btn-ghost" onClick={onBack} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
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
    <div className="flex-center" style={{ flex: 1, gap: 10, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
      {message}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}