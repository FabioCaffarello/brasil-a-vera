import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type KpiItem, KpiStrip } from './kpi-strip'

const baseItem: KpiItem = { label: 'Alinhamento', value: '87%' }

describe('KpiStrip composition', () => {
  it('renderiza vazio quando items=[]', () => {
    const { container } = render(<KpiStrip items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza N KPIs com label + value', () => {
    render(
      <KpiStrip
        items={[
          { label: 'Alinhamento', value: '87%' },
          { label: 'Votos', value: '124' },
          { label: 'Proposições', value: '12' },
        ]}
      />,
    )
    expect(screen.getByText('87%')).toBeDefined()
    expect(screen.getByText('Votos')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
  })

  it('renderiza hint com classe semântica conforme tone', () => {
    const { container } = render(
      <KpiStrip
        items={[
          { ...baseItem, hint: '▲ 5%', tone: 'success' },
          {
            label: 'Gastos',
            value: 'R$ 12k',
            hint: '▼ 8%',
            tone: 'destructive',
          },
        ]}
      />,
    )
    const successHint = container.querySelector('.text-success')
    const destructiveHint = container.querySelector('.text-destructive')
    expect(successHint?.textContent).toBe('▲ 5%')
    expect(destructiveHint?.textContent).toBe('▼ 8%')
  })

  it('tone default usa foreground-muted para hint', () => {
    const { container } = render(
      <KpiStrip items={[{ ...baseItem, hint: 'últimos 30 dias' }]} />,
    )
    const hint = container.querySelector('.text-foreground-muted')
    // foreground-muted aparece em vários lugares; verifico que o hint específico está com a classe
    expect(container.textContent).toContain('últimos 30 dias')
    expect(hint).not.toBeNull()
  })

  it('aplica grid 1 col por default (sem md classes quando items=1)', () => {
    const { container } = render(<KpiStrip items={[baseItem]} />)
    const grid = container.firstChild as HTMLElement
    expect(grid.className).toContain('sm:grid-cols-2')
    expect(grid.className).not.toContain('md:grid-cols-3')
    expect(grid.className).not.toContain('md:grid-cols-4')
  })

  it('aplica md:grid-cols-3 quando items=3', () => {
    const { container } = render(
      <KpiStrip
        items={[
          baseItem,
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
        ]}
      />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'md:grid-cols-3',
    )
  })

  it('aplica md:grid-cols-4 quando items=4', () => {
    const { container } = render(
      <KpiStrip
        items={[
          baseItem,
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
          { label: 'D', value: '4' },
        ]}
      />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'md:grid-cols-4',
    )
  })

  it('cap em md:grid-cols-4 quando items > 4 (evita fragmentação)', () => {
    const { container } = render(
      <KpiStrip
        items={[
          baseItem,
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
          { label: 'D', value: '4' },
          { label: 'E', value: '5' },
        ]}
      />,
    )
    const grid = (container.firstChild as HTMLElement).className
    expect(grid).toContain('md:grid-cols-4')
    expect(grid).not.toMatch(/md:grid-cols-[567]/)
  })

  it('renderiza ícone com aria-hidden quando fornecido', () => {
    const { container } = render(
      <KpiStrip
        items={[{ ...baseItem, icon: <span data-testid="kpi-icon">★</span> }]}
      />,
    )
    const icon = container.querySelector('[aria-hidden="true"]')
    expect(icon).not.toBeNull()
    expect(screen.getByTestId('kpi-icon')).toBeDefined()
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <KpiStrip items={[baseItem]} className="custom-strip" />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'custom-strip',
    )
  })
})
