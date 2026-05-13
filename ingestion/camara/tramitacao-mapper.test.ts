import { describe, expect, it } from 'vitest'

import { mapTramitacaoCamara, truncateAt } from './tramitacao-mapper'

describe('truncateAt', () => {
  it('retorna string original quando menor ou igual ao limite', () => {
    expect(truncateAt('curta', 200)).toBe('curta')
    expect(truncateAt('a'.repeat(200), 200)).toBe('a'.repeat(200))
  })

  it('trunca em fronteira de palavra quando há espaço próximo do fim', () => {
    const s = 'Esta é uma frase razoavelmente longa que deveria ser cortada'
    // limite 30, último espaço perto do fim
    const out = truncateAt(s, 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('…')).toBe(true)
    // não cortou no meio de palavra
    expect(out).toMatch(/\s\S*…$|^\S+…$/)
  })

  it('trunca no caractere quando palavra final é muito longa', () => {
    const s = `prefixo ${'X'.repeat(100)}`
    const out = truncateAt(s, 20)
    expect(out.length).toBeLessThanOrEqual(20)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('mapTramitacaoCamara', () => {
  it('mapeia evento típico com despacho diferente da descricao curta', () => {
    const result = mapTramitacaoCamara({
      dataHora: '2026-04-16T00:00',
      sequencia: 4,
      siglaOrgao: 'MESA',
      descricaoTramitacao: 'Publicação de Documento',
      descricaoSituacao: 'Aguardando Despacho do Presidente',
      despacho: 'Recebido Ofício 271/2024, que encaminha a proposição...',
    })

    expect(result.data).toBeInstanceOf(Date)
    expect(result.orgao).toBe('MESA')
    expect(result.descricaoResumida).toBe('Publicação de Documento')
    expect(result.descricaoCompleta).toBe(
      'Recebido Ofício 271/2024, que encaminha a proposição...',
    )
    expect(result.situacaoResultante).toBe('Aguardando Despacho do Presidente')
    expect(result.sourceId).toBe('4')
  })

  it('completa = null quando despacho é igual à descricao curta', () => {
    const result = mapTramitacaoCamara({
      dataHora: '2026-01-01T10:00',
      sequencia: 1,
      siglaOrgao: 'PLEN',
      descricaoTramitacao: 'Apresentação de Proposição',
      descricaoSituacao: null,
      despacho: 'Apresentação de Proposição',
    })

    expect(result.descricaoCompleta).toBeNull()
    expect(result.situacaoResultante).toBeNull()
  })

  it('completa = null quando despacho está vazio ou ausente', () => {
    expect(
      mapTramitacaoCamara({
        dataHora: '2026-01-01T10:00',
        sequencia: 2,
        siglaOrgao: 'PLEN',
        descricaoTramitacao: 'Algo',
        despacho: '',
      }).descricaoCompleta,
    ).toBeNull()

    expect(
      mapTramitacaoCamara({
        dataHora: '2026-01-01T10:00',
        sequencia: 3,
        siglaOrgao: 'PLEN',
        descricaoTramitacao: 'Algo',
      }).descricaoCompleta,
    ).toBeNull()
  })

  it('trunca descricao curta longa preservando significado', () => {
    const longa = `${'palavra '.repeat(40)}fim`
    const result = mapTramitacaoCamara({
      dataHora: '2026-01-01T10:00',
      sequencia: 1,
      siglaOrgao: 'PLEN',
      descricaoTramitacao: longa,
    })
    expect(result.descricaoResumida.length).toBeLessThanOrEqual(200)
    expect(result.descricaoResumida.endsWith('…')).toBe(true)
  })

  it('sourceId é string convertida de sequencia', () => {
    expect(
      mapTramitacaoCamara({
        dataHora: '2026-01-01T10:00',
        sequencia: 99,
        siglaOrgao: 'PLEN',
        descricaoTramitacao: 'X',
      }).sourceId,
    ).toBe('99')
  })
})
