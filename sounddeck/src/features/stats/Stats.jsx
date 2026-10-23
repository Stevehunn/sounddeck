/**
 * @file Statistics page — usage overview (sounds, plays, profiles, tags).
 *
 * Aggregates data from `store.sounds`, `store.profiles`, and `store.tags`
 * into 6 KPI cards, a "top 10 most played sounds" list, and a "sounds by
 * profile" breakdown.
 *
 * The `timeRange` filter (`all` / `week` / `month`) only affects the
 * "recent plays" sub-value shown on the plays card — the totals are
 * always global.
 *
 * @see src/features/stats/tutorialSteps.js
 */

import { useState, useMemo } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

/**
 * Returns the current epoch timestamp.
 *
 * Wrapped in a module-level helper so `react-hooks/purity` doesn't flag
 * `Date.now()` inside event handlers — the rule can't statically tell
 * event handlers apart from render code, so any raw `Date.now()` call
 * triggers the warning. The helper keeps the intent readable while
 * staying linter-compatible.
 *
 * @returns {number}
 */
function getTimestamp() {
  return Date.now()
}

/**
 * Small KPI card.
 *
 * Declared at module level (outside `Stats`) so React sees the same
 * component type on every render — otherwise each render creates a new
 * component and remounts the card (`react-hooks/static-components`).
 *
 * @param {Object} props
 * @param {string} props.icon - Tabler icon class.
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.sub]
 * @param {string} [props.color='var(--accent)']
 * @param {string} [props.testId]
 * @returns {JSX.Element}
 */
function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'var(--accent)',
  testId,
}) {
  return (
    <div
      data-testid={testId || 'stat-card'}
      style={{
        padding: '16px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <i className={`ti ${icon}`} style={{ color }} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/**
 * Statistics page.
 *
 * @param {Object} props
 * @param {Object} props.store - App store (sounds, profiles, tags).
 * @returns {JSX.Element}
 */
export default function Stats({ store }) {
  const { t, currentLang } = useLanguage()
  const [timeRange, setTimeRange] = useState('all') // 'all' | 'week' | 'month'

  // Stable "now" snapshot — refreshed whenever the filter changes.
  // Kept in state (not derived in render) so `useMemo` can depend on a
  // pure value, not an impure `Date.now()` call (React 19 purity rule).
  const [now, setNow] = useState(() => getTimestamp())

  const handleTimeRangeChange = (range) => {
    setTimeRange(range)
    setNow(getTimestamp())
  }

  const stats = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    let filterDate = 0
    if (timeRange === 'week') filterDate = weekAgo
    else if (timeRange === 'month') filterDate = monthAgo

    const sounds = store.sounds || []
    const totalSounds = sounds.length

    const playedSounds = sounds.filter((s) => s.playCount > 0)
    const totalPlays = sounds.reduce(
      (sum, s) => sum + (s.playCount || 0),
      0
    )

    const recentSounds =
      filterDate > 0
        ? sounds.filter((s) => (s.lastPlayed || 0) > filterDate)
        : sounds
    const recentPlays = recentSounds.reduce(
      (sum, s) => sum + (s.playCount || 0),
      0
    )

    const topSounds = [...sounds]
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 10)

    const profiles = store.profiles || []
    const profileCount = profiles.filter((p) => p.id !== 'all').length

    const soundsByProfile = profiles.map((p) => ({
      ...p,
      count: sounds.filter((s) => s.profiles?.includes(p.id)).length,
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
      favoriteCount: sounds.filter((s) => s.favorites?.length > 0).length,
    }
  }, [store.sounds, store.profiles, store.tags, timeRange, now])

  /**
   * Formats a timestamp with the current locale.
   * @param {number} timestamp
   * @returns {string}
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString(currentLang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * Returns the display name for a profile (translated for the `all` profile).
   * @param {Object} profile
   * @returns {string}
   */
  const getProfileName = (profile) => {
    if (profile.id === 'all') {
      return t('allSounds')
    }
    return profile.name
  }

  return (
    <div
      data-testid="stats-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Fixed header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 0 20px',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <i
              className="ti ti-chart-bar"
              style={{ color: 'var(--accent)' }}
            />
            {t('statsTitle')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {t('statsSub')}
          </div>
        </div>

        <div data-testid="stats-filters" style={{ display: 'flex', gap: 6 }}>
          {['all', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${
                  timeRange === range ? 'var(--accent)' : 'var(--border)'
                }`,
                background:
                  timeRange === range
                    ? 'var(--accent-light)'
                    : 'transparent',
                color:
                  timeRange === range
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {range === 'all'
                ? t('statsAll')
                : range === 'week'
                  ? t('statsWeek')
                  : t('statsMonth')}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* KPI cards */}
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatCard
            icon="ti-music"
            label={t('statsTotalSounds')}
            value={stats.totalSounds}
            testId="stat-card-total"
          />
          <StatCard
            icon="ti-player-play"
            label={t('statsTotalPlays')}
            value={stats.totalPlays}
            sub={`${stats.recentPlays} ${t('statsRecent')}`}
            color="var(--success)"
            testId="stat-card-plays"
          />
          <StatCard
            icon="ti-users"
            label={t('statsProfiles')}
            value={stats.profileCount}
            testId="stat-card-profiles"
          />
          <StatCard
            icon="ti-tag"
            label={t('statsTags')}
            value={stats.tagCount}
            color="var(--warning)"
            testId="stat-card-tags"
          />
          <StatCard
            icon="ti-star"
            label={t('statsFavorites')}
            value={stats.favoriteCount}
            color="var(--warning)"
            testId="stat-card-favorites"
          />
          <StatCard
            icon="ti-user-check"
            label={t('statsPlayedSounds')}
            value={`${stats.playedSounds}/${stats.totalSounds}`}
            testId="stat-card-played"
          />
        </div>

        {/* Top sounds */}
        {stats.topSounds.length > 0 && (
          <div
            data-testid="stats-top-sounds"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i
                className="ti ti-trophy"
                style={{ color: 'var(--warning)' }}
              />
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
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        index === 0
                          ? 'var(--warning)'
                          : index === 1
                            ? 'var(--text-secondary)'
                            : 'var(--text-tertiary)',
                      minWidth: 24,
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span style={{ fontSize: 12, flex: 1 }}>{sound.name}</span>
                  <span
                    style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                  >
                    {sound.playCount || 0} {t('plays')}
                  </span>
                  {sound.lastPlayed && (
                    <span
                      style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
                    >
                      {formatDate(sound.lastPlayed)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sounds by profile */}
        {stats.soundsByProfile.length > 1 && (
          <div
            data-testid="stats-profiles"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i
                className="ti ti-pie-chart"
                style={{ color: 'var(--accent)' }}
              />
              {t('statsSoundsByProfile')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stats.soundsByProfile.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12 }}>
                    {getProfileName(profile)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                      padding: '0 6px',
                      borderRadius: 10,
                    }}
                  >
                    {profile.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 10 }} />
      </div>
    </div>
  )
}