import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FeaturesGrid } from './features-grid'

describe('FeaturesGrid', () => {
  it('renderiza os 6 cards de features', () => {
    render(<FeaturesGrid />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(6)
  })

  it('renderiza títulos esperados', () => {
    render(<FeaturesGrid />)
    expect(screen.getByText('Dados oficiais')).toBeDefined()
    expect(screen.getByText('Atualizado diariamente')).toBeDefined()
    expect(screen.getByText('Open source')).toBeDefined()
    expect(screen.getByText('Pirâmide de Confiança')).toBeDefined()
    expect(screen.getByText('Sem cadastro')).toBeDefined()
    expect(screen.getByText('Custo zero')).toBeDefined()
  })

  it('usa h3 para cada título (hierarquia abaixo do h2 da seção parent)', () => {
    render(<FeaturesGrid />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(6)
  })

  it('ícones são decorativos (aria-hidden)', () => {
    const { container } = render(<FeaturesGrid />)
    const iconContainers = container.querySelectorAll('[aria-hidden="true"]')
    expect(iconContainers.length).toBeGreaterThanOrEqual(6)
  })

  it('layout grid responsivo: 1 col mobile, 2 sm, 3 lg', () => {
    const { container } = render(<FeaturesGrid />)
    const grid = container.firstChild as HTMLElement
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('sm:grid-cols-2')
    expect(grid.className).toContain('lg:grid-cols-3')
  })

  it('preserva className do consumer', () => {
    const { container } = render(<FeaturesGrid className="custom-grid" />)
    expect((container.firstChild as HTMLElement).className).toContain(
      'custom-grid',
    )
  })
})
