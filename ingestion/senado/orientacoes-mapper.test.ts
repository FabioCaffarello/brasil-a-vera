import { describe, expect, it } from 'vitest'

import {
  buildOrientacoes,
  classifyTipoLideranca,
  mapVotoOrientacao,
  materiaSessaoKey,
  orientacoesRunFailed,
} from './orientacoes-mapper'

describe('mapVotoOrientacao', () => {
  it('mapeia os votos conhecidos', () => {
    expect(mapVotoOrientacao('SIM')).toBe('SIM')
    expect(mapVotoOrientacao('NÃO')).toBe('NAO')
    expect(mapVotoOrientacao('LIVRE')).toBe('LIBERADO')
    expect(mapVotoOrientacao('OBSTRUÇÃO')).toBe('OBSTRUCAO')
  })

  it('normaliza acento e caixa', () => {
    expect(mapVotoOrientacao('não')).toBe('NAO')
    expect(mapVotoOrientacao(' NAO ')).toBe('NAO')
    expect(mapVotoOrientacao('obstrucao')).toBe('OBSTRUCAO')
  })

  it('retorna null para null/secreto/desconhecido (fail-closed)', () => {
    expect(mapVotoOrientacao(null)).toBeNull()
    expect(mapVotoOrientacao(undefined)).toBeNull()
    expect(mapVotoOrientacao('SECRETO')).toBeNull()
    expect(mapVotoOrientacao('')).toBeNull()
    expect(mapVotoOrientacao('TALVEZ')).toBeNull()
  })
})

describe('classifyTipoLideranca (A1 prime)', () => {
  it("blocos institucionais/temáticos → 'B'", () => {
    for (const b of ['Governo', 'Oposição', 'Maioria', 'Minoria', 'Banc Fem']) {
      expect(classifyTipoLideranca(b)).toBe('B')
    }
  })

  it("normaliza acento/caixa do bloco → 'B'", () => {
    expect(classifyTipoLideranca('oposicao')).toBe('B')
    expect(classifyTipoLideranca(' GOVERNO ')).toBe('B')
  })

  it("partidos (inclusive siglas históricas) → 'P'", () => {
    for (const p of ['PL', 'PT', 'PSDB', 'Republica', 'PSL', 'DEM', 'PPS']) {
      expect(classifyTipoLideranca(p)).toBe('P')
    }
  })

  it("falha fechado: sigla desconhecida → 'P'", () => {
    expect(classifyTipoLideranca('Banc Masc')).toBe('P')
    expect(classifyTipoLideranca('XYZ')).toBe('P')
  })
})

describe('buildOrientacoes', () => {
  it('monta linhas, classifica e mapeia voto', () => {
    const r = buildOrientacoes([
      { partido: 'PL', voto: 'SIM' },
      { partido: 'Governo', voto: 'NÃO' },
      { partido: 'Banc Fem', voto: 'LIVRE' },
    ])
    expect(r.rows).toEqual([
      { partidoSigla: 'PL', orientacao: 'SIM', tipoLideranca: 'P' },
      { partidoSigla: 'Governo', orientacao: 'NAO', tipoLideranca: 'B' },
      { partidoSigla: 'Banc Fem', orientacao: 'LIBERADO', tipoLideranca: 'B' },
    ])
    expect(r.nullSkipped).toBe(0)
    expect(r.unmappedSkipped).toBe(0)
  })

  it('pula voto null e conta; pula não-mapeável e conta', () => {
    const r = buildOrientacoes([
      { partido: 'PL', voto: 'SIM' },
      { partido: 'PT', voto: null },
      { partido: 'PSD', voto: 'SECRETO' },
    ])
    expect(r.rows).toHaveLength(1)
    expect(r.nullSkipped).toBe(1)
    expect(r.unmappedSkipped).toBe(1)
  })

  it('deduplica por partido_sigla mantendo o último', () => {
    const r = buildOrientacoes([
      { partido: 'PL', voto: 'SIM' },
      { partido: 'PL', voto: 'NÃO' },
    ])
    expect(r.rows).toEqual([
      { partidoSigla: 'PL', orientacao: 'NAO', tipoLideranca: 'P' },
    ])
  })
})

describe('materiaSessaoKey', () => {
  it('monta a chave normalizada', () => {
    expect(
      materiaSessaoKey({
        sigla: 'pec',
        numero: 6,
        ano: 2019,
        numeroSessao: 183,
      }),
    ).toBe('PEC|6|2019|183')
  })

  it('retorna null se qualquer parte faltar', () => {
    expect(
      materiaSessaoKey({ sigla: null, numero: 6, ano: 2019, numeroSessao: 1 }),
    ).toBeNull()
    expect(
      materiaSessaoKey({
        sigla: 'PEC',
        numero: null,
        ano: 2019,
        numeroSessao: 1,
      }),
    ).toBeNull()
    expect(
      materiaSessaoKey({
        sigla: 'PEC',
        numero: 6,
        ano: 2019,
        numeroSessao: null,
      }),
    ).toBeNull()
    expect(
      materiaSessaoKey({ sigla: '  ', numero: 6, ano: 2019, numeroSessao: 1 }),
    ).toBeNull()
  })
})

describe('orientacoesRunFailed (canário de saída)', () => {
  it('run 100% colisão NÃO é falha (fail-closed legítimo)', () => {
    // Reproduz o incidente 2026-07-17→20: 5 matérias votadas 2× na sessão.
    expect(orientacoesRunFailed({ matched: 0, unmatchedSemVotacao: 0 })).toBe(
      false,
    )
  })

  it('nada casou por votação inexistente É falha (votacoes não rodou/chave driftou)', () => {
    expect(orientacoesRunFailed({ matched: 0, unmatchedSemVotacao: 5 })).toBe(
      true,
    )
  })

  it('qualquer match torna o run bem-sucedido, mesmo com misses', () => {
    expect(orientacoesRunFailed({ matched: 1, unmatchedSemVotacao: 9 })).toBe(
      false,
    )
  })

  it('janela vazia (nada a casar) não é falha', () => {
    expect(orientacoesRunFailed({ matched: 0, unmatchedSemVotacao: 0 })).toBe(
      false,
    )
  })
})
