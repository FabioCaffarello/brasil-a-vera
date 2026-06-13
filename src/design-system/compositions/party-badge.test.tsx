import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PartyBadge } from './party-badge'

describe('PartyBadge composition', () => {
  it('renderiza sigla em uppercase', () => {
    render(<PartyBadge sigla="pt" />)
    expect(screen.getByText('PT')).toBeDefined()
  })

  it('normaliza trim + uppercase antes do lookup', () => {
    render(<PartyBadge sigla="  pl  " />)
    expect(screen.getByText('PL')).toBeDefined()
  })

  it('aplica cor mapeada para sigla conhecida (PT → red)', () => {
    render(<PartyBadge sigla="PT" />)
    const badge = screen.getByText('PT')
    expect(badge.className).toContain('bg-red-500/15')
    expect(badge.className).toContain('text-red-300')
    expect(badge.className).toContain('border-red-500/30')
  })

  it('aplica cor mapeada para sigla conhecida (PL → emerald)', () => {
    render(<PartyBadge sigla="PL" />)
    const badge = screen.getByText('PL')
    expect(badge.className).toContain('bg-emerald-500/15')
  })

  it('aplica variante default para sigla desconhecida', () => {
    render(<PartyBadge sigla="ZZZ" />)
    const badge = screen.getByText('ZZZ')
    expect(badge.className).toContain('bg-surface-raised')
    expect(badge.className).toContain('text-fg-tertiary')
    expect(badge.className).toContain('border-line-default')
  })

  it('renderiza como <abbr> com title expandido quando name fornecido', () => {
    render(<PartyBadge sigla="PT" name="Partido dos Trabalhadores" />)
    const abbr = screen.getByText('PT')
    expect(abbr.tagName).toBe('ABBR')
    expect(abbr.getAttribute('title')).toBe('Partido Partido dos Trabalhadores')
  })

  it('title cai em "Partido {sigla}" sem name', () => {
    render(<PartyBadge sigla="PT" />)
    expect(screen.getByText('PT').getAttribute('title')).toBe('Partido PT')
  })

  it('size sm aplica classes menores', () => {
    render(<PartyBadge sigla="PT" size="sm" />)
    const badge = screen.getByText('PT')
    expect(badge.className).toContain('px-1.5')
    expect(badge.className).toContain('py-0.5')
    expect(badge.className).toContain('text-xs')
  })

  it('size md (default) aplica classes maiores', () => {
    render(<PartyBadge sigla="PT" />)
    const badge = screen.getByText('PT')
    expect(badge.className).toContain('px-2')
    expect(badge.className).toContain('text-sm')
  })

  it('UNIÃO e UNIAO mapeiam para mesma variante (acento opcional)', () => {
    const { rerender } = render(<PartyBadge sigla="UNIÃO" />)
    const withAcento = screen.getByText('UNIÃO').className
    rerender(<PartyBadge sigla="UNIAO" />)
    const withoutAcento = screen.getByText('UNIAO').className
    expect(withAcento).toBe(withoutAcento)
  })

  it('preserva className do consumer', () => {
    render(<PartyBadge sigla="PT" className="custom-badge" />)
    expect(screen.getByText('PT').className).toContain('custom-badge')
  })
})
