import { useState, useEffect } from 'react'
import Waveform from '@shared/components/audio/Waveform'
import { useLanguage } from '@core/i18n/LanguageContext'
import { detectPlatform, getSpotifyTrack, getSoundCloudTrack, sanitizeFilename } from '@shared/utils/platformImport'
import { Howl } from 'howler'
import useConfirm from '@shared/hooks/useConfirm'

const EMOJIS = ['🎵','🎤','🎸','🎹','🥁','🎺','🎻','🎼','🔊','💥','😂','🔥']

export default function YouTube({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
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
  const [platform, setPlatform] = useState(null)
  const [customImage, setCustomImage] = useState(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewHowl, setPreviewHowl] = useState(null)

  useEffect(() => {
    setYtdlpStatus('checking')
    window.electronAPI.checkYtdlp().then(r => {
      setYtdlpStatus(r.available ? 'available' : 'missing')
    })
  }, [])

  useEffect(() => {
    return () => {
      if (previewHowl) {
        previewHowl.stop()
        previewHowl.unload()
      }
    }
  }, [previewHowl])

  const handleInstallYtdlp = async () => {
    setDownloading(true)
    addToast(t('ytdlpDownloading'), 'info')
    const r = await window.electronAPI.downloadYtdlp()
    setDownloading(false)
    if (r.success) {
      setYtdlpStatus('available')
      addToast(t('ytdlpInstalled'), 'success')
    } else {
      addToast(t('ytdlpInstallError') + r.error, 'error')
    }
  }

  const handleFetchInfo = async () => {
    if (!url.trim()) return
    
    const detected = detectPlatform(url.trim())
    setPlatform(detected)
    
    setLoadingInfo(true)
    setVideoInfo(null)
    
    try {
      let result
      
      if (detected === 'spotify') {
        result = await getSpotifyTrack(url.trim())
        if (result.success && result.data) {
          const info = {
            title: result.data.title,
            duration: result.data.duration,
            thumbnail: result.data.cover || result.data.thumbnail,
            uploader: result.data.artist || result.data.uploader,
            url: url.trim(),
            platform: 'spotify',
            id: result.data.id
          }
          setVideoInfo(info)
          setSoundName(info.title?.slice(0, 50) || '')
          setEnd(info.duration || 0)
          setStep('trim')
          addToast(`✅ ${t('platformDetected').replace('{platform}', 'Spotify')}`, 'success')
        } else {
          addToast(t('ytFetchError') + (result.error || 'Erreur Spotify'), 'error')
        }
      } else if (detected === 'soundcloud') {
        result = await getSoundCloudTrack(url.trim())
        if (result.success && result.data) {
          const info = {
            title: result.data.title,
            duration: result.data.duration,
            thumbnail: result.data.cover || result.data.thumbnail,
            uploader: result.data.artist || result.data.uploader,
            url: url.trim(),
            platform: 'soundcloud',
            id: result.data.id
          }
          setVideoInfo(info)
          setSoundName(info.title?.slice(0, 50) || '')
          setEnd(info.duration || 0)
          setStep('trim')
          addToast(`✅ ${t('platformDetected').replace('{platform}', 'SoundCloud')}`, 'success')
        } else {
          addToast(t('ytFetchError') + (result.error || 'Erreur SoundCloud'), 'error')
        }
      } else {
        result = await window.electronAPI.youtubeInfo(url.trim())
        if (result.success) {
          const info = {
            title: result.title,
            duration: result.duration,
            thumbnail: result.thumbnail,
            uploader: result.uploader,
            url: result.url || url.trim(),
            platform: 'youtube',
            id: result.id || Date.now().toString()
          }
          setVideoInfo(info)
          setSoundName(info.title?.slice(0, 50) || '')
          setEnd(info.duration || 0)
          setStep('trim')
          addToast(`✅ ${t('platformDetected').replace('{platform}', 'YouTube')}`, 'success')
        } else {
          addToast(t('ytFetchError') + (result.error || 'Erreur YouTube'), 'error')
        }
      }
    } catch (e) {
      console.error('Erreur fetch info:', e)
      addToast(t('ytFetchError') + e.message, 'error')
    }
    
    setLoadingInfo(false)
  }

  const togglePreview = (filePath) => {
    if (!filePath) return
    
    if (previewHowl && isPreviewPlaying) {
      previewHowl.stop()
      previewHowl.unload()
      setPreviewHowl(null)
      setIsPreviewPlaying(false)
      return
    }
    
    try {
      const howl = new Howl({
        src: [filePath],
        html5: true,
        volume: 0.5,
        onend: () => {
          setIsPreviewPlaying(false)
          setPreviewHowl(null)
        },
        onloaderror: (id, err) => {
          console.error('Erreur preview:', err)
          addToast('❌ ' + t('error'), 'error')
          setIsPreviewPlaying(false)
          setPreviewHowl(null)
        }
      })
      
      setPreviewHowl(howl)
      setIsPreviewPlaying(true)
      howl.play()
    } catch (e) {
      console.error('Erreur preview:', e)
      addToast('❌ ' + t('error'), 'error')
    }
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setCustomImage(result.path)
        addToast(t('ytImageAdded'), 'success')
      }
    }
  }

  const handleDownloadAudio = async () => {
    setImporting(true)
    addToast(t('ytAudioDownloading'), 'info')
    
    try {
      let result
      const soundsDir = await window.electronAPI.getSoundsDir()
      
      if (platform === 'spotify' && videoInfo) {
        const searchTitle = soundName || videoInfo.title || 'spotify'
        const safeName = sanitizeFilename(searchTitle) + '_' + Date.now() + '.mp3'
        const outputPath = `${soundsDir}/${safeName}`
        
        result = await window.electronAPI.downloadPlatformTrack({
          platform: 'spotify',
          url: `https://open.spotify.com/track/${videoInfo.id}`,
          trackId: videoInfo.id,
          outputPath: outputPath,
          title: videoInfo.title,
          artist: videoInfo.uploader
        })
      } else if (platform === 'soundcloud' && videoInfo) {
        const safeName = sanitizeFilename(videoInfo.title || 'soundcloud') + '_' + Date.now() + '.mp3'
        const outputPath = `${soundsDir}/${safeName}`
        result = await window.electronAPI.downloadPlatformTrack({
          platform: 'soundcloud',
          url: `https://soundcloud.com/${videoInfo.uploader || 'artist'}/${videoInfo.id}`,
          trackId: videoInfo.id,
          outputPath: outputPath,
          title: videoInfo.title,
          artist: videoInfo.uploader
        })
      } else {
        result = await window.electronAPI.youtubeDownload(
          videoInfo?.url, start, end > 0 ? end : videoInfo?.duration || 0, videoInfo?.title
        )
      }
      
      setImporting(false)
      
      if (result && result.success) {
        setDownloadedPath(result.path)
        setStep('save')
        addToast(t('ytAudioReady'), 'success')
      } else {
        addToast(t('ytDownloadError') + (result?.error || t('ytDownloadErrorUnknown')), 'error')
      }
    } catch (e) {
      setImporting(false)
      console.error('Erreur téléchargement:', e)
      addToast(t('ytDownloadError') + e.message, 'error')
    }
  }

  const handleSave = async () => {
    if (!soundName.trim() || !downloadedPath) return
    
    const existingSound = store.sounds.find(s => s.name.toLowerCase() === soundName.trim().toLowerCase())
    if (existingSound) {
      const confirmed = await confirm({
        title: t('soundExists'),
        message: t('soundExistsConfirm').replace('{name}', soundName.trim()),
        type: 'warning'
      })
      if (!confirmed) return
    }
    
    await store.addSound({
      name: soundName.trim(),
      path: downloadedPath,
      emoji,
      image: customImage || null,
      profiles: targetProfiles
    })
    addToast(`"${soundName.trim()}" ${t('ytSoundAdded')}`, 'success')
    setUrl(''); setVideoInfo(null); setDownloadedPath(null)
    setStep('url'); setSoundName(''); setStart(0); setEnd(0)
    setTargetProfiles(['all'])
    setPlatform(null)
    setCustomImage(null)
    if (previewHowl) {
      previewHowl.stop()
      previewHowl.unload()
      setPreviewHowl(null)
      setIsPreviewPlaying(false)
    }
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (ytdlpStatus === 'checking') {
    return (
      <div className="flex-center" style={{ flex: 1, gap: 10, color: 'var(--text-tertiary)' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        {t('ytdlpChecking')}
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (ytdlpStatus === 'missing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title={t('youtubeTitle')} sub={t('youtubeSub')} />
        <div className="flex-center" style={{ flex: 1, padding: 40 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t('ytdlpRequired')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
              {t('ytdlpDesc')}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              <button 
                className="btn-primary btn-lg" 
                onClick={handleInstallYtdlp} 
                disabled={downloading}
                style={{ borderRadius: 'var(--radius-md)', padding: '10px 24px' }}
              >
                {downloading
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('installing')}</>
                  : <><i className="ti ti-download" /> {t('installYtdlp')}</>}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', lineHeight: 1.6, textAlign: 'left' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              {t('ytdlpManual')}
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <ConfirmWrapper />
      </div>
    )
  }

  if (step === 'url') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader title={t('youtubeTitle')} sub={t('pasteUrl')} />
        <div className="flex-center" style={{ flex: 1, padding: 40 }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>▶️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
              {t('pasteUrl')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
                placeholder={t('ytUrlPlaceholder')}
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
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('loading2')}</>
                  : <><i className="ti ti-search" /> {t('load')}</>}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <i className="ti ti-shield-check" style={{ marginRight: 4, color: 'var(--success)' }} />
              {t('ytUrlNote')}
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
          title={t('selectPortion')}
          sub={`${t('youtubeTitle')} : ${videoInfo?.title?.slice(0, 60) || '...'}`}
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
                  <i className="ti ti-clock" /> {t('ytTrimTotalDuration')} {fmt(videoInfo.duration)}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('ytTrimTitle')}
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('ytTrimDuration')} <strong style={{ color: 'var(--accent)' }}>{fmt(end - start)}</strong></span>
                <button className="btn-ghost btn-sm" onClick={() => { setStart(0); setEnd(videoInfo?.duration || 0) }} style={{ borderRadius: 'var(--radius-sm)' }}>
                  <i className="ti ti-refresh" /> {t('ytTrimSelectAll')}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('start')} : {fmt(start)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={start} onChange={e => setStart(Math.min(Number(e.target.value), end - 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('end')} : {fmt(end)}
                  </label>
                  <input type="range" min="0" max={videoInfo?.duration || 0} step="0.5"
                    value={end} onChange={e => setEnd(Math.max(Number(e.target.value), start + 1))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('ytPreciseStart')}</label>
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
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('ytPreciseEnd')}</label>
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
              <i className="ti ti-arrow-left" /> {t('ytBack')}
            </button>
            <button 
              className="btn-primary btn-lg" 
              onClick={handleDownloadAudio} 
              disabled={importing || !videoInfo} 
              style={{ borderRadius: 'var(--radius-md)', minWidth: 180 }}
            >
              {importing
                ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('ytDownloading')}</>
                : <><i className="ti ti-download" /> {t('downloadAudio')}</>}
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
        <PageHeader title={t('configSound')} sub={t('ytSaveSubtitle')} onBack={() => setStep('trim')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>

            <div className="option-row" style={{ borderColor: 'var(--success)', marginBottom: 20, padding: '12px 16px', background: 'rgba(29,158,117,0.1)', borderRadius: 'var(--radius-md)' }}>
              <i className="ti ti-check" style={{ color: 'var(--success)', fontSize: 20 }} />
              <div style={{ flex: 1, padding: '0 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{t('ytSuccessTitle')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('ytSuccessSource')} {videoInfo?.title?.slice(0, 50)}</div>
              </div>
            </div>

            {downloadedPath && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('editorPreview')}
                  </div>
                  <button
                    onClick={() => togglePreview(downloadedPath)}
                    className={`btn-${isPreviewPlaying ? 'danger' : 'secondary'} btn-sm`}
                    style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <i className={`ti ${isPreviewPlaying ? 'ti-player-stop' : 'ti-player-play'}`} />
                    {isPreviewPlaying ? t('stop') : t('listen')}
                  </button>
                </div>
                <Waveform filePath={downloadedPath} height={60} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('soundName')}
              </label>
              <input 
                value={soundName} 
                onChange={e => setSoundName(e.target.value)}
                placeholder={t('ytSoundNamePlaceholder')} 
                className="input-lg"
                style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                autoFocus 
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('image')}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {customImage && (
                  <img 
                    src={`file:///${customImage.replace(/\\/g, '/')}`} 
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} 
                    alt={t('preview')}
                  />
                )}
                <button 
                  className="btn-secondary btn-sm" 
                  onClick={handlePickImage}
                  style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}
                >
                  <i className="ti ti-photo" /> {customImage ? t('ytImageChange') : t('ytImageAdd')}
                </button>
                {customImage && (
                  <button 
                    className="btn-ghost btn-sm" 
                    onClick={() => setCustomImage(null)}
                    style={{ fontSize: 12, padding: '4px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('editorEmojiLabel')}
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
                {t('ytProfilesLabel')}
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
                <i className="ti ti-arrow-left" /> {t('ytBack')}
              </button>
              <button 
                className="btn-primary btn-lg" 
                onClick={handleSave} 
                disabled={!soundName.trim() || !downloadedPath} 
                style={{ borderRadius: 'var(--radius-md)', minWidth: 200 }}
              >
                <i className="ti ti-check" /> {t('addToLibrary')}
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