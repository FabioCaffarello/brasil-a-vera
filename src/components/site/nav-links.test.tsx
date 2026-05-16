import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedPathname = vi.fn<() => string>(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: () => mockedPathname(),
}))

// Import after mock to ensure the module sees the mocked usePathname.
import { NavLinks } from './nav-links'

describe('NavLinks', () => {
  beforeEach(() => {
    mockedPathname.mockReset()
    mockedPathname.mockReturnValue('/')
  })

  it('renderiza os 5 links principais', () => {
    render(<NavLinks />)
    expect(screen.getByRole('link', { name: /meu parlamentar/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /^parlamentares$/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Proposições' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Votações' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeDefined()
  })

  it('"Meu parlamentar" tem href /o-meu-parlamentar', () => {
    render(<NavLinks />)
    expect(
      screen
        .getByRole('link', { name: /meu parlamentar/i })
        .getAttribute('href'),
    ).toBe('/o-meu-parlamentar')
  })

  it('marca link active com aria-current=page quando pathname=/o-meu-parlamentar', () => {
    mockedPathname.mockReturnValue('/o-meu-parlamentar')
    render(<NavLinks />)
    const active = screen.getByRole('link', { name: /meu parlamentar/i })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('marca link active quando pathname é sub-rota (/parlamentares/123)', () => {
    mockedPathname.mockReturnValue('/parlamentares/123')
    render(<NavLinks />)
    const active = screen.getByRole('link', { name: /^parlamentares$/i })
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

  it('link brand sem active state tem cor text-brand', () => {
    mockedPathname.mockReturnValue('/votacoes')
    render(<NavLinks />)
    const meuPar = screen.getByRole('link', { name: /meu parlamentar/i })
    expect(meuPar.className).toContain('text-brand')
  })

  it('link brand active tem bg-brand/10 + text-brand', () => {
    mockedPathname.mockReturnValue('/o-meu-parlamentar')
    render(<NavLinks />)
    const meuPar = screen.getByRole('link', { name: /meu parlamentar/i })
    expect(meuPar.className).toContain('bg-brand/10')
    expect(meuPar.className).toContain('text-brand')
  })

  it('link neutro active tem bg-surface-elevated + text-foreground', () => {
    mockedPathname.mockReturnValue('/proposicoes')
    render(<NavLinks />)
    const prop = screen.getByRole('link', { name: 'Proposições' })
    expect(prop.className).toContain('bg-surface-elevated')
    expect(prop.className).toContain('text-foreground')
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
