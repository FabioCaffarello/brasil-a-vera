import { render, screen } from '@testing-library/react'
import { Inbox } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renderiza título', () => {
    render(<EmptyState title="Sem dados" />)
    expect(screen.getByText('Sem dados')).toBeDefined()
  })

  it('renderiza descrição opcional', () => {
    render(<EmptyState title="Sem dados" description="Tente outro filtro" />)
    expect(screen.getByText('Tente outro filtro')).toBeDefined()
  })

  it('omite descrição quando não fornecida', () => {
    render(<EmptyState title="Sem dados" />)
    expect(screen.queryByText('Tente outro filtro')).toBeNull()
  })

  it('renderiza ícone Lucide opcional como decorativo (aria-hidden)', () => {
    const { container } = render(<EmptyState icon={Inbox} title="Sem dados" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renderiza ação opcional (ex: link "Limpar filtros")', () => {
    render(
      <EmptyState
        title="Sem dados"
        action={<a href="/parlamentares">Limpar</a>}
      />,
    )
    expect(screen.getByText('Limpar')).toBeDefined()
  })
})
