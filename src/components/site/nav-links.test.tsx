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

  it('renderiza os 4 links principais', () => {
    render(<NavLinks />)
    expect(screen.getByRole('link', { name: 'Parlamentares' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Proposições' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Votações' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeDefined()
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

  it('todos os links idle têm tratamento neutro (text-fg-tertiary, sem text-brand)', () => {
    mockedPathname.mockReturnValue('/votacoes')
    render(<NavLinks />)
    const parlamentares = screen.getByRole('link', { name: 'Parlamentares' })
    const docs = screen.getByRole('link', { name: 'Docs' })
    expect(parlamentares.className).toContain('text-fg-tertiary')
    expect(parlamentares.className).not.toContain('text-brand')
    expect(docs.className).toContain('text-fg-tertiary')
  })

  it('link active tem bg-fg-primary/10 + ring-fg-primary/10 (uniforme para todos)', () => {
    mockedPathname.mockReturnValue('/parlamentares')
    render(<NavLinks />)
    const parlamentares = screen.getByRole('link', { name: 'Parlamentares' })
    expect(parlamentares.className).toContain('bg-fg-primary/10')
    expect(parlamentares.className).toContain('ring-fg-primary/10')
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

describe('NavLinks com personalLink (Hotfix 10.3)', () => {
  beforeEach(() => {
    mockedPathname.mockReset()
    mockedPathname.mockReturnValue('/')
  })

  it('quando personalLink é definido, renderiza-o como primeiro link', () => {
    render(<NavLinks personalLink={{ href: '/painel', label: 'Painel' }} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)
    expect(links[0].textContent).toBe('Painel')
    expect(links[0].getAttribute('href')).toBe('/painel')
    expect(links[1].textContent).toBe('Quem me representa')
  })

  it('marca Painel active quando pathname é /painel ou sub-rota', () => {
    mockedPathname.mockReturnValue('/painel/parlamentares')
    render(<NavLinks personalLink={{ href: '/painel', label: 'Painel' }} />)
    const painel = screen.getByRole('link', { name: 'Painel' })
    expect(painel.getAttribute('aria-current')).toBe('page')
  })

  it('quando personalLink é null, NÃO renderiza link extra (paridade anônima)', () => {
    render(<NavLinks personalLink={null} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(screen.queryByRole('link', { name: 'Painel' })).toBeNull()
  })
})
