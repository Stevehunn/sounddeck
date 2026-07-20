import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function Stats({ store }) {
  const { t, currentLang } = useLanguage()
  const [timeRange, setTimeRange] = useState('all') // 'all', 'week', 'month'

  const stats = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    let filterDate = 0
    if (timeRange === 'week') filterDate = weekAgo
    else if (timeRange === 'month') filterDate = monthAgo

    const sounds = store.sounds || []
    const totalSounds = sounds.length
    
    const playedSounds = sounds.filter(s => s.playCount > 0)
    const totalPlays = sounds.reduce((sum, s) => sum + (s.playCount || 0), 0)
    
    const recentSounds = filterDate > 0 
      ? sounds.filter(s => (s.lastPlayed || 0) > filterDate)
      : sounds
    const recentPlays = recentSounds.reduce((sum, s) => sum + (s.playCount || 0), 0)

    const topSounds = [...sounds]
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 10)

    const profiles = store.profiles || []
    const profileCount = profiles.filter(p => p.id !== 'all').length
    
    const soundsByProfile = profiles.map(p => ({
      ...p,
      count: sounds.filter(s => s.profiles?.includes(p.id)).length
    }))

    const tags = store.tags || {}
    const allTags = Object.values(tags).flat()
    const uniqueTags = [...new Set(allTags)]
    const tagCount = uniqueTags.length

    return {
      totalSounds,
      playedSounds: playedSounds.length,
      totalPlays,
      recentPlays,
      topSounds,
      profileCount,
      soundsByProfile,
      tagCount,
      favoriteCount: sounds.filter(s => s.favorites?.length > 0).length
    }
  }, [store.sounds, store.profiles, store.tags, timeRange])

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString(currentLang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProfileName = (profile) => {
    if (profile.id === 'all') {
      return t('allSounds')
    }
    return profile.name
  }

  const StatCard = ({ icon, label, value, sub, color = 'var(--accent)' }) => (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      flex: 1,
      minWidth: 120
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ color }} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden',
    }}>
      {/* Header - Fixe */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 0 20px',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-chart-bar" style={{ color: 'var(--accent)' }} />
            {t('statsTitle')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {t('statsSub')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${timeRange === range ? 'var(--accent)' : 'var(--border)'}`,
                background: timeRange === range ? 'var(--accent-light)' : 'transparent',
                color: timeRange === range ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {range === 'all' ? t('statsAll') : range === 'week' ? t('statsWeek') : t('statsMonth')}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 20
        }}>
          <StatCard 
            icon="ti-music" 
            label={t('statsTotalSounds')} 
            value={stats.totalSounds} 
          />
          <StatCard 
            icon="ti-player-play" 
            label={t('statsTotalPlays')} 
            value={stats.totalPlays} 
            sub={`${stats.recentPlays} ${t('statsRecent')}`}
            color="var(--success)"
          />
          <StatCard 
            icon="ti-users" 
            label={t('statsProfiles')} 
            value={stats.profileCount} 
          />
          <StatCard 
            icon="ti-tag" 
            label={t('statsTags')} 
            value={stats.tagCount} 
            color="var(--warning)"
          />
          <StatCard 
            icon="ti-star" 
            label={t('statsFavorites')} 
            value={stats.favoriteCount} 
            color="var(--warning)"
          />
          <StatCard 
            icon="ti-user-check" 
            label={t('statsPlayedSounds')} 
            value={`${stats.playedSounds}/${stats.totalSounds}`} 
          />
        </div>

        {/* Top Sons */}
        {stats.topSounds.length > 0 && (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            padding: '16px',
            marginBottom: 16
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <i className="ti ti-trophy" style={{ color: 'var(--warning)' }} />
              {t('statsTopSounds')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.topSounds.map((sound, index) => (
                <div
                  key={sound.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: index === 0 ? 'var(--warning)' : index === 1 ? 'var(--text-secondary)' : index === 2 ? 'var(--text-tertiary)' : 'var(--text-tertiary)',
                    minWidth: 24
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ fontSize: 12, flex: 1 }}>{sound.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {sound.playCount || 0} {t('plays')}
                  </span>
                  {sound.lastPlayed && (
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {formatDate(sound.lastPlayed)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sons par profil */}
        {stats.soundsByProfile.length > 1 && (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            padding: '16px',
            marginBottom: 16
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <i className="ti ti-pie-chart" style={{ color: 'var(--accent)' }} />
              {t('statsSoundsByProfile')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stats.soundsByProfile.map(profile => (
                <div
                  key={profile.id}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 12 }}>
                    {getProfileName(profile)} {/* ✅ Utiliser la fonction de traduction */}
                  </span>
                  <span style={{
                    fontSize: 10,
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    padding: '0 6px',
                    borderRadius: 10
                  }}>
                    {profile.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Espace en bas pour le padding */}
        <div style={{ height: 10 }} />
      </div>
    </div>
  )
}