// src/plugins/myinstants/CategoryEditorModal.jsx
import React from 'react'
import { CATEGORIES_LIST } from './categories'

export default function CategoryEditorModal({
  isOpen,
  tempSelectedCategories,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  onReset,
  onCancel,
  onSave,
  t,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        data-testid="discover-category-editor-modal"
        style={{ width: 480, maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-edit" style={{ color: 'var(--accent)' }} />
          {t('myinstantsCategoryEditor')}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t('myinstantsCategoryEditorDesc')}
          <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>
            ({tempSelectedCategories.length} {t('myinstantsSelected')})
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          <button className="btn-secondary btn-sm" onClick={onSelectAll}>
            <i className="ti ti-checkbox" /> {t('myinstantsCategoryEditorSelectAll')}
          </button>
          <button className="btn-secondary btn-sm" onClick={onDeselectAll}>
            <i className="ti ti-checkbox" /> {t('myinstantsCategoryEditorDeselectAll')}
          </button>
          <button className="btn-ghost btn-sm" onClick={onReset}>
            <i className="ti ti-refresh" /> {t('myinstantsCategoryEditorReset')}
          </button>
        </div>

        <div style={{
          maxHeight: 300,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          padding: '4px 0',
        }}>
          {CATEGORIES_LIST.map(cat => {
            const isSelected = tempSelectedCategories.includes(cat.id)
            const categoryLabel = t(cat.labelKey) || cat.labelKey

            return (
              <label
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleCategory(cat.id)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <span style={{ fontSize: 14 }}>{cat.emoji || cat.icon}</span>
                <span style={{ fontSize: 12 }}>{categoryLabel}</span>
              </label>
            )
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-secondary btn-lg" onClick={onCancel}>
            <i className="ti ti-x" /> {t('myinstantsCategoryEditorCancel')}
          </button>
          <button className="btn-primary btn-lg" onClick={onSave}>
            <i className="ti ti-check" /> {t('myinstantsCategoryEditorSave')}
          </button>
        </div>
      </div>
    </div>
  )
}