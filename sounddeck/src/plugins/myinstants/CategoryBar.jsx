// src/plugins/myinstants/CategoryBar.jsx

export default function CategoryBar({
  categories,
  activeCategory,
  cacheInfo,
  showAllCategories,
  onSelectCategory,
  onToggleShowAll,
  onOpenEditor,
  t,
}) {
  if (categories.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '8px',
        color: 'var(--text-tertiary)',
        fontSize: 12,
      }}>
        <i className="ti ti-category" style={{ marginRight: 4 }} />
        {t('myinstantsNoCategories')}
      </div>
    )
  }

  const displayCategories = showAllCategories ? categories : categories.slice(0, 8)

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <i className="ti ti-category" style={{ marginRight: 4 }} />
          {t('myinstantsCategories')} ({categories.length})
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            data-testid="discover-category-editor-button"
            className="btn-ghost btn-sm"
            onClick={onOpenEditor}
            style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
          >
            <i className="ti ti-edit" /> {t('myinstantsCategoryEditor')}
          </button>
          {categories.length > 8 && (
            <button
              className="btn-ghost btn-sm"
              onClick={onToggleShowAll}
              style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
            >
              {showAllCategories ? t('myinstantsShowLess') : t('myinstantsShowMore')}
            </button>
          )}
        </div>
      </div>

      <div
        className="categories-container"
        data-testid="discover-categories"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          maxHeight: showAllCategories ? 'none' : '80px',
          overflow: 'hidden',
        }}
      >
        {displayCategories.map(cat => {
          const isActive = activeCategory === cat.id
          const isCached = cacheInfo[cat.id]?.count > 0
          const categoryLabel = t(cat.labelKey) || cat.labelKey

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 11,
                cursor: 'pointer',
                border: `1px solid ${isActive ? cat.color : 'var(--border)'}`,
                background: isActive ? `${cat.color}22` : 'var(--bg-tertiary)',
                color: isActive ? cat.color : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = cat.color
                  e.currentTarget.style.color = cat.color
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ fontSize: 14 }}>{cat.emoji || cat.icon}</span>
              <span>{categoryLabel}</span>
              {isActive && <i className="ti ti-check" style={{ fontSize: 10, marginLeft: 2 }} />}
              {isCached && !isActive && (
                <span style={{
                  fontSize: 8,
                  marginLeft: 2,
                  color: 'var(--success)',
                  opacity: 0.6,
                }}>
                  💾
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}