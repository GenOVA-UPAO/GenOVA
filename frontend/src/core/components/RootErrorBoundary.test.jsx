import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { RootErrorBoundary } from './RootErrorBoundary.jsx'

function Boom() {
  throw new Error('explota')
}

describe('RootErrorBoundary', () => {
  it('renderiza los children cuando no hay error', () => {
    render(
      <MemoryRouter>
        <RootErrorBoundary>
          <p>contenido ok</p>
        </RootErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('contenido ok')).toBeInTheDocument()
  })

  it('muestra el fallback accesible cuando un hijo lanza', () => {
    // React imprime el error en consola al capturarlo; lo silenciamos en el test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <MemoryRouter>
        <RootErrorBoundary>
          <Boom />
        </RootErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    spy.mockRestore()
  })
})
