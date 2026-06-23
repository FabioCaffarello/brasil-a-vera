import { describe, expect, it } from 'vitest'

import { type FiltrosProposicao, proposicoesFiltrosKey } from './proposicoes'

// `proposicoesFiltrosKey` compõe o fragmento de filtros das cache keys de
// `listProposicoes` e `countProposicoes` (ADR-018). A correção do cache
// depende de duas garantias puras, testáveis sem DB:
//
//  1. Determinismo: o mesmo recorte de filtros produz sempre a mesma key.
//  2. Sem colisão: recortes diferentes produzem keys diferentes (senão um
//     resultado cacheado vazaria para o filtro errado).
//
// O cursor e a ordem NÃO entram aqui de propósito — o count compartilha a
// key entre todas as páginas de um mesmo recorte (COUNT ignora ORDER/LIMIT).
describe('proposicoesFiltrosKey', () => {
  it('é determinístico para o mesmo recorte de filtros', () => {
    const f: FiltrosProposicao = {
      tipo: 'PL',
      ano: 2024,
      situacao: 'TRAMITANDO',
      tema: 42,
      q: 'saúde',
    }
    expect(proposicoesFiltrosKey(f)).toBe(proposicoesFiltrosKey({ ...f }))
  })

  it('ignora ordem e cursor (não fazem parte do fragmento)', () => {
    const base: FiltrosProposicao = { tipo: 'PL', situacao: 'TRAMITANDO' }
    expect(proposicoesFiltrosKey({ ...base, ordem: 'recente' })).toBe(
      proposicoesFiltrosKey({ ...base, ordem: 'parada' }),
    )
  })

  it('trima `q` para casar com o WHERE efetivamente aplicado', () => {
    expect(proposicoesFiltrosKey({ q: '  lei  ' })).toBe(
      proposicoesFiltrosKey({ q: 'lei' }),
    )
  })

  it('trata filtro ausente e `q` vazio como o mesmo slot neutro', () => {
    expect(proposicoesFiltrosKey({})).toBe(proposicoesFiltrosKey({ q: '   ' }))
  })

  it('não colide entre recortes distintos', () => {
    const keys = [
      proposicoesFiltrosKey({}),
      proposicoesFiltrosKey({ tipo: 'PL' }),
      proposicoesFiltrosKey({ tipo: 'PEC' }),
      proposicoesFiltrosKey({ ano: 2024 }),
      proposicoesFiltrosKey({ ano: 2025 }),
      proposicoesFiltrosKey({ situacao: 'APROVADA' }),
      proposicoesFiltrosKey({ tema: 1 }),
      proposicoesFiltrosKey({ tema: 2 }),
      proposicoesFiltrosKey({ q: 'lei' }),
      proposicoesFiltrosKey({ tipo: 'PL', ano: 2024 }),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('distingue um filtro com valor de um campo vizinho preenchido', () => {
    // Guard contra colisão por concatenação ingênua: tipo='PL' sozinho não
    // pode gerar a mesma string que ano=PL (campos têm rótulo na key).
    expect(proposicoesFiltrosKey({ tipo: 'PL' })).not.toBe(
      proposicoesFiltrosKey({ ano: 2024, tipo: 'PL' }),
    )
  })
})
