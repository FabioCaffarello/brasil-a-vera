import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FilterChip, FilterChips } from './filter-chips'

describe('FilterChip', () => {
  it('renderiza como button por default', () => {
    render(<FilterChip>Câmara</FilterChip>)
    expect(screen.getByRole('button', { name: /câmara/i })).toBeDefined()
  })

  it('aplica estilo selected quando prop=true', () => {
    render(<FilterChip selected>Senado</FilterChip>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-fg-brand')
    expect(btn.className).toContain('bg-fg-brand/10')
    expect(btn.className).toContain('text-fg-brand')
    expect(btn.getAttribute('data-selected')).toBe('true')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('aplica estilo neutro quando não selected', () => {
    render(<FilterChip>Senado</FilterChip>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-line-default')
    expect(btn.className).toContain('bg-surface-base')
    expect(btn.className).toContain('text-fg-tertiary')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('renderiza count como sub-badge', () => {
    render(<FilterChip count={513}>Câmara</FilterChip>)
    expect(screen.getByText('513')).toBeDefined()
  })

  it('count tem estilo destacado quando selected', () => {
    const { container } = render(
      <FilterChip count={81} selected>
        Senado
      </FilterChip>,
    )
    const countSpan = container.querySelector('.bg-fg-brand\\/20')
    expect(countSpan?.textContent).toBe('81')
  })

  it('asChild polimórfico renderiza filho como container', () => {
    render(
      <FilterChip asChild>
        <a href="?casa=camara">Câmara</a>
      </FilterChip>,
    )
    const link = screen.getByRole('link', { name: /câmara/i })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('?casa=camara')
    // Estilos do chip ficam aplicados no <a>
    expect(link.className).toContain('border-line-default')
  })

  it('asChild + selected aplica style no filho', () => {
    render(
      <FilterChip asChild selected>
        <a href="?casa=camara">Câmara</a>
      </FilterChip>,
    )
    expect(screen.getByRole('link').className).toContain('border-fg-brand')
  })

  it('inclui focus ring via token RDS line-focus', () => {
    render(<FilterChip>x</FilterChip>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('focus-visible:ring-line-focus')
    expect(btn.className).toContain('focus-visible:ring-2')
  })

  it('preserva className do consumer', () => {
    render(<FilterChip className="custom-chip">x</FilterChip>)
    expect(screen.getByRole('button').className).toContain('custom-chip')
  })
})

describe('FilterChips (wrapper)', () => {
  it('renderiza role=group', () => {
    render(
      <FilterChips label="Casa">
        <FilterChip>Câmara</FilterChip>
      </FilterChips>,
    )
    expect(screen.getByRole('group', { name: 'Casa' })).toBeDefined()
  })

  it('renderiza label visível quando fornecido', () => {
    render(
      <FilterChips label="Filtros">
        <FilterChip>x</FilterChip>
      </FilterChips>,
    )
    expect(screen.getByText('Filtros')).toBeDefined()
  })

  it('renderiza sem label quando ausente', () => {
    const { container } = render(
      <FilterChips>
        <FilterChip>x</FilterChip>
      </FilterChips>,
    )
    // O grupo só deve ter o flex container com chips — sem div de label antes.
    const group = container.querySelector('[role="group"]') as HTMLElement
    expect(group.children).toHaveLength(1)
  })

  it('renderiza múltiplos chips em flex row', () => {
    render(
      <FilterChips>
        <FilterChip>A</FilterChip>
        <FilterChip>B</FilterChip>
        <FilterChip>C</FilterChip>
      </FilterChips>,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <FilterChips className="custom-group">
        <FilterChip>x</FilterChip>
      </FilterChips>,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'custom-group',
    )
  })
})
