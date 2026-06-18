import { describe, expect, it } from 'vitest'

import { emFederacao, FEDERACOES, federacaoDoPartido } from './federacoes'

describe('federacaoDoPartido', () => {
  it('detecta cada sigla-membro das 3 federações vigentes', () => {
    expect(federacaoDoPartido('PT')?.nome).toContain('Esperança')
    expect(federacaoDoPartido('PCdoB')?.nome).toContain('Esperança')
    expect(federacaoDoPartido('PV')?.nome).toContain('Esperança')
    expect(federacaoDoPartido('PSOL')?.nome).toBe('Federação PSOL REDE')
    expect(federacaoDoPartido('REDE')?.nome).toBe('Federação PSOL REDE')
    expect(federacaoDoPartido('PSDB')?.nome).toBe('Federação PSDB Cidadania')
    expect(federacaoDoPartido('Cidadania')?.nome).toBe(
      'Federação PSDB Cidadania',
    )
  })

  it('é case-insensitive e tolera espaços (grafia varia entre fontes)', () => {
    expect(federacaoDoPartido('pcdob')?.nome).toContain('Esperança')
    expect(federacaoDoPartido('  CIDADANIA  ')?.nome).toBe(
      'Federação PSDB Cidadania',
    )
  })

  it('retorna null para partido não federado', () => {
    for (const sigla of ['PL', 'PP', 'UNIÃO', 'MDB', 'NOVO', 'PSD']) {
      expect(federacaoDoPartido(sigla)).toBeNull()
    }
  })

  it('retorna null para entrada vazia/ausente', () => {
    expect(federacaoDoPartido(null)).toBeNull()
    expect(federacaoDoPartido(undefined)).toBeNull()
    expect(federacaoDoPartido('')).toBeNull()
  })
})

describe('emFederacao', () => {
  it('reflete federacaoDoPartido como booleano', () => {
    expect(emFederacao('PT')).toBe(true)
    expect(emFederacao('PL')).toBe(false)
    expect(emFederacao(null)).toBe(false)
  })
})

describe('FEDERACOES (invariantes da allowlist)', () => {
  it('todas as siglas estão em UPPERCASE (contrato de normalização)', () => {
    for (const f of FEDERACOES) {
      for (const s of f.siglas) expect(s).toBe(s.toUpperCase())
    }
  })

  it('nenhuma sigla pertence a duas federações', () => {
    const todas = FEDERACOES.flatMap((f) => f.siglas)
    expect(new Set(todas).size).toBe(todas.length)
  })
})
