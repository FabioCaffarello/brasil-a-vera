import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatsGrid } from './stats-grid'

describe('StatsGrid composition', () => {
  it('renderiza null quando items=[]', () => {
    const { container } = render(<StatsGrid items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza N stats com value + label', () => {
    render(
      <StatsGrid
        items={[
          { value: '513', label: 'Deputados' },
          { value: '81', label: 'Senadores' },
          { value: '24', label: 'Comissões' },
        ]}
      />,
    )
    expect(screen.getByText('513')).toBeDefined()
    expect(screen.getByText('Deputados')).toBeDefined()
    expect(screen.getByText('Senadores')).toBeDefined()
  })

  it('renderiza hint quando fornecido', () => {
    render(
      <StatsGrid
        items={[
          { value: '513', label: 'Deputados', hint: 'Câmara dos Deputados' },
        ]}
      />,
    )
    expect(screen.getByText('Câmara dos Deputados')).toBeDefined()
  })

  it('aplica md:grid-cols-3 com items=3', () => {
    const { container } = render(
      <StatsGrid
        items={[
          { value: '1', label: 'A' },
          { value: '2', label: 'B' },
          { value: '3', label: 'C' },
        ]}
      />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'md:grid-cols-3',
    )
  })

  it('aplica md:grid-cols-4 com items=4', () => {
    const { container } = render(
      <StatsGrid
        items={[
          { value: '1', label: 'A' },
          { value: '2', label: 'B' },
          { value: '3', label: 'C' },
          { value: '4', label: 'D' },
        ]}
      />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'md:grid-cols-4',
    )
  })

  it('cap em md:grid-cols-4 com items > 4', () => {
    const { container } = render(
      <StatsGrid
        items={[
          { value: '1', label: 'A' },
          { value: '2', label: 'B' },
          { value: '3', label: 'C' },
          { value: '4', label: 'D' },
          { value: '5', label: 'E' },
        ]}
      />,
    )
    const className = (container.firstChild as HTMLElement).className
    expect(className).toContain('md:grid-cols-4')
    expect(className).not.toMatch(/md:grid-cols-[567]/)
  })

  it('usa <dl>/<dt>/<dd> semantic markup', () => {
    const { container } = render(
      <StatsGrid items={[{ value: '513', label: 'Deputados' }]} />,
    )
    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelector('dt')).not.toBeNull()
    expect(container.querySelector('dd')).not.toBeNull()
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <StatsGrid
        items={[{ value: '1', label: 'A' }]}
        className="custom-grid"
      />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'custom-grid',
    )
  })
})
