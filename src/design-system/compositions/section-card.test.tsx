import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionCard } from './section-card'

describe('SectionCard composition', () => {
  it('renderiza título como h2', () => {
    render(<SectionCard title="Análise">conteúdo</SectionCard>)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('Análise')
  })

  it('renderiza children', () => {
    render(
      <SectionCard title="x">
        <p>Conteúdo da seção</p>
      </SectionCard>,
    )
    expect(screen.getByText('Conteúdo da seção')).toBeDefined()
  })

  it('renderiza subtitle quando fornecido', () => {
    render(
      <SectionCard title="x" subtitle="últimos 30 dias">
        body
      </SectionCard>,
    )
    expect(screen.getByText('últimos 30 dias')).toBeDefined()
  })

  it('renderiza badge slot quando fornecido', () => {
    render(
      <SectionCard title="x" badge={<span data-testid="trust-badge">L2</span>}>
        body
      </SectionCard>,
    )
    expect(screen.getByTestId('trust-badge')).toBeDefined()
  })

  it('renderiza ícone com aria-hidden quando fornecido', () => {
    const { container } = render(
      <SectionCard title="x" icon={<span data-testid="icon">★</span>}>
        body
      </SectionCard>,
    )
    const hidden = container.querySelector('[aria-hidden="true"]')
    expect(hidden).not.toBeNull()
    expect(screen.getByTestId('icon')).toBeDefined()
  })

  it('quando id fornecido, aplica aria-labelledby + id no h2', () => {
    render(
      <SectionCard title="Votações" id="votacoes">
        body
      </SectionCard>,
    )
    const section = screen.getByRole('region', { name: 'Votações' })
    expect(section.id).toBe('votacoes')
    expect(section.getAttribute('aria-labelledby')).toBe('votacoes-title')
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.id).toBe('votacoes-title')
  })

  it('quando id ausente, NÃO aplica aria-labelledby (evita ref quebrada)', () => {
    const { container } = render(<SectionCard title="x">body</SectionCard>)
    const section = container.querySelector('section')
    expect(section?.getAttribute('aria-labelledby')).toBeNull()
    expect(section?.id).toBe('')
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <SectionCard title="x" className="custom-section">
        body
      </SectionCard>,
    )
    expect(container.querySelector('section')?.className).toContain(
      'custom-section',
    )
  })
})
