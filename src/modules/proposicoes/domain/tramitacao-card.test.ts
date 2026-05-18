import { describe, expect, it } from 'vitest'

import {
  classifyTramitacaoCard,
  inferirMarcoAtual,
  LIMITE_DIAS_OBSOLETOS,
  MARCOS_TRAMITACAO,
  MIN_EVENTOS_BARRA,
} from './tramitacao-card'

// Regra crítica para honestidade do dado (P2): a mini-barra de progresso
// só renderiza quando há marcos suficientes. Testes protegem contra
// regressão silenciosa do threshold e do contrato de 4 estados (rodada 2
// §Contratos de fallback — ProposicaoCard v2).

describe('classifyTramitacaoCard', () => {
  it('sem_tramitacao_registrada quando n_eventos é 0', () => {
    expect(
      classifyTramitacaoCard({
        nEventosTramitacao: 0,
        ultimoOrgao: null,
        diasEmTramitacao: 0,
        diasDesdeUltimaTramitacao: null,
      }),
    ).toEqual({ kind: 'sem_tramitacao_registrada' })
  })

  it('sem_tramitacao_registrada quando n_eventos é null (sem agregada)', () => {
    expect(
      classifyTramitacaoCard({
        nEventosTramitacao: null,
        ultimoOrgao: null,
        diasEmTramitacao: null,
        diasDesdeUltimaTramitacao: null,
      }),
    ).toEqual({ kind: 'sem_tramitacao_registrada' })
  })

  it('sem_marcos_relevantes quando 0 < n_eventos < MIN_EVENTOS_BARRA', () => {
    const result = classifyTramitacaoCard({
      nEventosTramitacao: 2,
      ultimoOrgao: 'CCJ',
      diasEmTramitacao: 42,
      diasDesdeUltimaTramitacao: 10,
    })
    expect(result).toEqual({
      kind: 'sem_marcos_relevantes',
      diasEmTramitacao: 42,
    })
  })

  it('sem_marcos_relevantes quando n_eventos >= MIN mas ultimoOrgao é null', () => {
    const result = classifyTramitacaoCard({
      nEventosTramitacao: 5,
      ultimoOrgao: null,
      diasEmTramitacao: 100,
      diasDesdeUltimaTramitacao: 30,
    })
    expect(result).toEqual({
      kind: 'sem_marcos_relevantes',
      diasEmTramitacao: 100,
    })
  })

  it('com_marcos quando n_eventos >= MIN_EVENTOS_BARRA AND ultimoOrgao presente', () => {
    const result = classifyTramitacaoCard({
      nEventosTramitacao: MIN_EVENTOS_BARRA,
      ultimoOrgao: 'CCJ',
      diasEmTramitacao: 100,
      diasDesdeUltimaTramitacao: 30,
    })
    expect(result).toEqual({
      kind: 'com_marcos',
      ultimoOrgao: 'CCJ',
      diasEmTramitacao: 100,
      obsoleto: false,
    })
  })

  it('com_marcos com obsoleto=true quando dias_desde_ultima > LIMITE_DIAS_OBSOLETOS', () => {
    const result = classifyTramitacaoCard({
      nEventosTramitacao: 10,
      ultimoOrgao: 'Plenário',
      diasEmTramitacao: 500,
      diasDesdeUltimaTramitacao: LIMITE_DIAS_OBSOLETOS + 1,
    })
    expect(result).toEqual({
      kind: 'com_marcos',
      ultimoOrgao: 'Plenário',
      diasEmTramitacao: 500,
      obsoleto: true,
    })
  })

  it('com_marcos com obsoleto=false no limite exato (365 dias)', () => {
    const result = classifyTramitacaoCard({
      nEventosTramitacao: 10,
      ultimoOrgao: 'Plenário',
      diasEmTramitacao: 500,
      diasDesdeUltimaTramitacao: LIMITE_DIAS_OBSOLETOS,
    })
    expect(result).toEqual({
      kind: 'com_marcos',
      ultimoOrgao: 'Plenário',
      diasEmTramitacao: 500,
      obsoleto: false,
    })
  })

  it('MIN_EVENTOS_BARRA é 3 conforme rodada 2 do plano', () => {
    expect(MIN_EVENTOS_BARRA).toBe(3)
  })

  it('LIMITE_DIAS_OBSOLETOS é 365 conforme rodada 2 do plano', () => {
    expect(LIMITE_DIAS_OBSOLETOS).toBe(365)
  })
})

describe('inferirMarcoAtual', () => {
  it('situação APROVADA força marco 5 (Sanção), ignorando órgão textual', () => {
    expect(inferirMarcoAtual('CCJ', 'APROVADA')).toBe(5)
    expect(inferirMarcoAtual('Plenário', 'APROVADA')).toBe(5)
  })

  it('situação TRANSFORMADA_EM_NORMA força marco 5', () => {
    expect(inferirMarcoAtual('qualquer coisa', 'TRANSFORMADA_EM_NORMA')).toBe(5)
  })

  it('situação REJEITADA / ARQUIVADA força marco 5 (fim do ciclo)', () => {
    expect(inferirMarcoAtual('Comissão', 'REJEITADA')).toBe(5)
    expect(inferirMarcoAtual('Mesa', 'ARQUIVADA')).toBe(5)
  })

  it('matches de Sanção / Veto / Publicação → marco 5', () => {
    expect(inferirMarcoAtual('Sanção Presidencial', 'TRAMITANDO')).toBe(5)
    expect(inferirMarcoAtual('Veto Total', 'TRAMITANDO')).toBe(5)
    expect(inferirMarcoAtual('Publicação Lei', 'TRAMITANDO')).toBe(5)
  })

  it('Senado Federal / Mesa do Senado → marco 4 (câmara revisora)', () => {
    expect(inferirMarcoAtual('Senado Federal', 'TRAMITANDO')).toBe(4)
    expect(inferirMarcoAtual('Mesa do Senado', 'TRAMITANDO')).toBe(4)
  })

  it('Plenário → marco 3', () => {
    expect(inferirMarcoAtual('Plenário', 'TRAMITANDO')).toBe(3)
    expect(inferirMarcoAtual('PLENÁRIO', 'TRAMITANDO')).toBe(3)
    expect(inferirMarcoAtual('plenario sem acento', 'TRAMITANDO')).toBe(3)
  })

  it('Comissões / CCJ / CT-* → marco 2', () => {
    expect(inferirMarcoAtual('Comissão Especial', 'TRAMITANDO')).toBe(2)
    expect(inferirMarcoAtual('CCJ', 'TRAMITANDO')).toBe(2)
    expect(inferirMarcoAtual('CTASP', 'TRAMITANDO')).toBe(2)
  })

  it('órgão não classificado → marco 2 (default)', () => {
    expect(inferirMarcoAtual('Mesa da Câmara', 'TRAMITANDO')).toBe(2)
    expect(inferirMarcoAtual('Diretoria-Geral', 'TRAMITANDO')).toBe(2)
  })

  it('terminal vence Senado quando situação é APROVADA pelo Senado', () => {
    // Caso real: proposição aprovada no Senado, situação = APROVADA.
    // Mesmo com ultimoOrgao="Senado Federal", marco vira 5 (não 4).
    expect(inferirMarcoAtual('Senado Federal', 'APROVADA')).toBe(5)
  })
})

describe('MARCOS_TRAMITACAO', () => {
  it('tem exatamente 5 marcos na ordem canônica', () => {
    expect(MARCOS_TRAMITACAO).toEqual([
      'Apresentação',
      'Comissões',
      'Plenário',
      'Câmara revisora',
      'Sanção',
    ])
  })
})
