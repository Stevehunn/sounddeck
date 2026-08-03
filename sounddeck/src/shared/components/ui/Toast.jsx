import { useState, useEffect } from 'react'

// Compteur global pour générer des IDs uniques
let toastCounter = 0

export default function Toast({ toasts }) {
  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`ti ${
            t.type === 'success' ? 'ti-check' :
            t.type === 'error' ? 'ti-x' : 'ti-info-circle'
          }`} />
          {t.message}
        </div>
      ))}
    </div>
  )
}