import { describe, expect, it } from 'vitest'

import { mapInformeSenado, truncateAt } from './tramitacao-mapper'

describe('truncateAt (senado)', () => {
  it('retorna string original quando curta', () => {
    expect(truncateAt('curta', 200)).toBe('curta')
  })

  it('trunca em fronteira de palavra quando possível', () => {
    const s =
      'Reunida a CTFC na 4ª reunião extraordinária de 15/04/2026 foi realizada a leitura'
    const out = truncateAt(s, 40)
    expect(out.length).toBeLessThanOrEqual(40)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('mapInformeSenado', () => {
  it('mapeia evento típico com colegiado preenchido', () => {
    const result = mapInformeSenado({
      id: 2285670,
      data: '2026-05-12 16:42:46',
      descricao: 'Reunida a CTFC na 4ª reunião extraordinária...',
      colegiado: {
        sigla: 'CTFC',
        nome: 'Comissão de Transparência, Governança e Controle',
      },
      enteAdministrativo: {
        sigla: 'SACTFC',
        nome: 'Secretaria de Apoio à Comissão',
      },
    })

    expect(result.data).toBeInstanceOf(Date)
    expect(result.data.toISOString()).toMatch(/^2026-05-12T/)
    expect(result.orgao).toBe('CTFC')
    expect(result.descricaoResumida).toContain('Reunida')
    expect(result.situacaoResultante).toBeNull()
    expect(result.sourceId).toBe('2285670')
  })

  it('completa = descrição original quando descricaoResumida foi truncada', () => {
    const longa = `Reunida a CTFC ${'palavra '.repeat(60)}fim do informe`
    const result = mapInformeSenado({
      id: 1,
      data: '2026-01-01 10:00:00',
      descricao: longa,
    })
    expect(result.descricaoResumida.length).toBeLessThanOrEqual(200)
    expect(result.descricaoCompleta).toBe(longa)
  })

  it('completa = null quando não truncou', () => {
    const result = mapInformeSenado({
      id: 1,
      data: '2026-01-01 10:00:00',
      descricao: 'Curta',
    })
    expect(result.descricaoCompleta).toBeNull()
  })

  it('orgao fallback para enteAdministrativo quando colegiado ausente', () => {
    const result = mapInformeSenado({
      id: 1,
      data: '2026-01-01 10:00:00',
      descricao: 'X',
      colegiado: null,
      enteAdministrativo: { sigla: 'SACTFC' },
    })
    expect(result.orgao).toBe('SACTFC')
  })

  it('orgao = "SF" quando todos os fallbacks faltam', () => {
    const result = mapInformeSenado({
      id: 1,
      data: '2026-01-01 10:00:00',
      descricao: 'X',
    })
    expect(result.orgao).toBe('SF')
  })

  it('sourceId é string da id numérica', () => {
    expect(
      mapInformeSenado({
        id: 999,
        data: '2026-01-01 10:00:00',
        descricao: 'X',
      }).sourceId,
    ).toBe('999')
  })
})
