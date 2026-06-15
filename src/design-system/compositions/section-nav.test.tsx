import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionNav, type SectionNavItem } from './section-nav'

const items: SectionNavItem[] = [
  { id: 'votos', label: 'Votos' },
  { id: 'alinhamento', label: 'Alinhamento' },
  { id: 'gastos', label: 'Gastos' },
]

describe('SectionNav composition', () => {
  it('renderiza nav com aria-label', () => {
    render(<SectionNav items={items} />)
    expect(screen.getByRole('navigation', { name: /seções/i })).toBeDefined()
  })

  it('renderiza um link por item, apontando para #id', () => {
    render(<SectionNav items={items} />)
    expect(
      screen.getByRole('link', { name: 'Votos' }).getAttribute('href'),
    ).toBe('#votos')
    expect(
      screen.getByRole('link', { name: 'Alinhamento' }).getAttribute('href'),
    ).toBe('#alinhamento')
    expect(
      screen.getByRole('link', { name: 'Gastos' }).getAttribute('href'),
    ).toBe('#gastos')
  })

  it('primeiro item começa marcado como active (aria-current)', () => {
    render(<SectionNav items={items} />)
    const first = screen.getByRole('link', { name: 'Votos' })
    expect(first.getAttribute('aria-current')).toBe('true')
    expect(first.className).toContain('bg-fg-brand/10')
    expect(first.className).toContain('text-fg-brand')
  })

  it('outros itens começam neutros', () => {
    render(<SectionNav items={items} />)
    const second = screen.getByRole('link', { name: 'Alinhamento' })
    expect(second.getAttribute('aria-current')).toBeNull()
    expect(second.className).toContain('text-fg-tertiary')
  })

  it('retorna null quando items=[]', () => {
    const { container } = render(<SectionNav items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('aplica sticky + backdrop-blur classes', () => {
    render(<SectionNav items={items} />)
    const nav = screen.getByRole('navigation')
    expect(nav.className).toContain('sticky')
    expect(nav.className).toContain('backdrop-blur')
  })

  it('aplica stickyTop via style prop', () => {
    render(<SectionNav items={items} stickyTop="4rem" />)
    const nav = screen.getByRole('navigation')
    expect((nav as HTMLElement).style.top).toBe('4rem')
  })

  it('renderiza ícone com aria-hidden quando fornecido', () => {
    const { container } = render(
      <SectionNav
        items={[
          {
            id: 'votos',
            label: 'Votos',
            icon: <span data-testid="nav-icon">★</span>,
          },
        ]}
      />,
    )
    const hidden = container.querySelector('[aria-hidden="true"]')
    expect(hidden).not.toBeNull()
    expect(screen.getByTestId('nav-icon')).toBeDefined()
  })

  it('preserva className do consumer', () => {
    render(<SectionNav items={items} className="custom-nav" />)
    expect(screen.getByRole('navigation').className).toContain('custom-nav')
  })
})
