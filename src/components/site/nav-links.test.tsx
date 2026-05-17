import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedPathname = vi.fn<() => string>(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: () => mockedPathname(),
}))

// Import after mock to ensure the module sees the mocked usePathname.
import { isNavLinkActive, NAV_LINKS, NavLinks } from './nav-links'

describe('NavLinks', () => {
  beforeEach(() => {
    mockedPathname.mockReset()
    mockedPathname.mockReturnValue('/')
  })

  it('renderiza os 5 links principais', () => {
    render(<NavLinks />)
    expect(screen.getByRole('link', { name: 'Meu parlamentar' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Parlamentares' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Proposições' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Votações' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeDefined()
  })

  it('"Meu parlamentar" tem href /o-meu-parlamentar', () => {
    render(<NavLinks />)
    expect(
      screen
        .getByRole('link', { name: 'Meu parlamentar' })
        .getAttribute('href'),
    ).toBe('/o-meu-parlamentar')
  })

  it('marca link active com aria-current=page quando pathname=/o-meu-parlamentar', () => {
    mockedPathname.mockReturnValue('/o-meu-parlamentar')
    render(<NavLinks />)
    const active = screen.getByRole('link', { name: 'Meu parlamentar' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('marca link active quando pathname é sub-rota (/parlamentares/123)', () => {
    mockedPathname.mockReturnValue('/parlamentares/123')
    render(<NavLinks />)
    const active = screen.getByRole('link', { name: 'Parlamentares' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('nenhum link active quando pathname não bate com nenhum', () => {
    mockedPathname.mockReturnValue('/comparar')
    render(<NavLinks />)
    const allLinks = screen.getAllByRole('link')
    for (const link of allLinks) {
      expect(link.getAttribute('aria-current')).toBeNull()
    }
  })

  it('todos os links idle têm tratamento neutro (text-foreground-muted, sem text-brand)', () => {
    mockedPathname.mockReturnValue('/votacoes')
    render(<NavLinks />)
    const meuPar = screen.getByRole('link', { name: 'Meu parlamentar' })
    const docs = screen.getByRole('link', { name: 'Docs' })
    expect(meuPar.className).toContain('text-foreground-muted')
    expect(meuPar.className).not.toContain('text-brand')
    expect(docs.className).toContain('text-foreground-muted')
  })

  it('link active tem bg-foreground/10 + ring-foreground/10 (uniforme para todos)', () => {
    mockedPathname.mockReturnValue('/o-meu-parlamentar')
    render(<NavLinks />)
    const meuPar = screen.getByRole('link', { name: 'Meu parlamentar' })
    expect(meuPar.className).toContain('bg-foreground/10')
    expect(meuPar.className).toContain('ring-foreground/10')
  })

  it('"Meu parlamentar" não tem nenhum indicador visual diferenciado (dot)', () => {
    render(<NavLinks />)
    const meuPar = screen.getByRole('link', { name: 'Meu parlamentar' })
    // Texto puro, sem span filho aria-hidden
    expect(meuPar.querySelectorAll('span[aria-hidden]').length).toBe(0)
  })

  it('todos os links têm focus ring via token --ring', () => {
    render(<NavLinks />)
    const links = screen.getAllByRole('link')
    for (const link of links) {
      expect(link.className).toContain('focus-visible:ring-ring')
      expect(link.className).toContain('focus-visible:ring-2')
    }
  })
})

describe('isNavLinkActive', () => {
  it('home só ativa em pathname=/', () => {
    expect(isNavLinkActive('/', '/')).toBe(true)
    expect(isNavLinkActive('/foo', '/')).toBe(false)
  })

  it('sub-rota ativa o link pai', () => {
    expect(isNavLinkActive('/parlamentares/123', '/parlamentares')).toBe(true)
  })

  it('rota desconectada não ativa', () => {
    expect(isNavLinkActive('/votacoes', '/parlamentares')).toBe(false)
  })

  it('pathname null é seguro', () => {
    expect(isNavLinkActive(null, '/parlamentares')).toBe(false)
  })
})

describe('NAV_LINKS', () => {
  it('exporta 5 entradas, todas sem flag brand', () => {
    expect(NAV_LINKS).toHaveLength(5)
    for (const link of NAV_LINKS) {
      expect(link).not.toHaveProperty('brand')
    }
  })
})
