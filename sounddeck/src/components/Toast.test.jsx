// sounddeck/src/components/Toast.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  it('ne devrait rien afficher quand la liste est vide', () => {
    render(<Toast toasts={[]} />)
    const container = document.querySelector('.toast-container')
    expect(container).toBeNull()
  })

  it('devrait afficher un toast de type success', () => {
    const toasts = [{ id: '1', message: 'Succès !', type: 'success' }]
    render(<Toast toasts={toasts} />)
    
    expect(screen.getByText('Succès !')).toBeInTheDocument()
    const toast = screen.getByText('Succès !').closest('.toast')
    expect(toast).toHaveClass('success')
  })

  it('devrait afficher un toast de type error', () => {
    const toasts = [{ id: '1', message: 'Erreur !', type: 'error' }]
    render(<Toast toasts={toasts} />)
    
    expect(screen.getByText('Erreur !')).toBeInTheDocument()
    const toast = screen.getByText('Erreur !').closest('.toast')
    expect(toast).toHaveClass('error')
  })

  it('devrait afficher un toast de type info', () => {
    const toasts = [{ id: '1', message: 'Information', type: 'info' }]
    render(<Toast toasts={toasts} />)
    
    expect(screen.getByText('Information')).toBeInTheDocument()
    const toast = screen.getByText('Information').closest('.toast')
    expect(toast).toHaveClass('info')
  })

  it('devrait afficher plusieurs toasts', () => {
    const toasts = [
      { id: '1', message: 'Message 1', type: 'success' },
      { id: '2', message: 'Message 2', type: 'error' },
      { id: '3', message: 'Message 3', type: 'info' }
    ]
    render(<Toast toasts={toasts} />)
    
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
    expect(screen.getByText('Message 3')).toBeInTheDocument()
  })
})