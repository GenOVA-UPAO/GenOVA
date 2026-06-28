import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RootErrorBoundary } from './RootErrorBoundary.tsx'

function Boom(): ReactNode {
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
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
    spy.mockRestore()
  })
})
