// src/popup/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import SoundPopupWindow from '@features/sequencer/components/SoundPopupWindow'
import '../index.css'

// Marqueur sur <body> pour scoper les overrides CSS
// (fond transparent, pas de scrollbar, etc.)
document.body.classList.add('popup-window')
document.documentElement.classList.add('popup-window')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SoundPopupWindow />
  </React.StrictMode>
)