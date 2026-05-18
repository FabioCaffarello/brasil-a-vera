import { describe, expect, it } from 'vitest'

import {
  buildKpiSlotsDetalhe,
  LIMITE_DIAS_OBSOLETOS_DETALHE,
  type ProposicaoStatsInput,
} from './kpi-detalhe'

const baseStats: ProposicaoStatsInput = {
  diasEmTramitacao: 100,
  diasDesdeUltimaTramitacao: 30,
  nAutores: 5,
  nPartidosAutores: 3,
  nUfsAutores: 4,
  nVotacoes: 2,
  nVotacoesAprovadas: 1,
  nVotacoesRejeitadas: 1,
  nEventosTramitacao: 10,
  ultimoOrgao: 'CCJ',
  medianaDiasTipoReferencia: 200,
}

describe('buildKpiSlotsDetalhe — Slot 1 Situação', () => {
  it('TRAMITANDO com tramitação ativa: label + hint "Última mov. há N dias em X"', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: baseStats,
    })
    expect(situacao.label).toBe('Situação')
    expect(situacao.value).toBe('Tramitando')
    expect(situacao.hint).toBe('Última mov. há 30 dias em CCJ')
    expect(situacao.tone).toBe('default')
  })

  it('TRAMITANDO obsoleto (> 365 dias sem mov.): tone warning', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        diasDesdeUltimaTramitacao: LIMITE_DIAS_OBSOLETOS_DETALHE + 1,
      },
    })
    expect(situacao.tone).toBe('warning')
  })

  it('APROVADA herda tone success', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'APROVADA',
      stats: baseStats,
    })
    expect(situacao.value).toBe('Aprovada')
    expect(situacao.tone).toBe('success')
  })

  it('REJEITADA herda tone destructive', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'REJEITADA',
      stats: baseStats,
    })
    expect(situacao.tone).toBe('destructive')
  })

  it('stats = null: suprime hint (P2 — sem dado, sem inventar)', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: null,
    })
    expect(situacao.value).toBe('Tramitando')
    expect(situacao.hint).toBeUndefined()
  })

  it('n_eventos_tramitacao = 0: suprime hint', () => {
    const [situacao] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nEventosTramitacao: 0 },
    })
    expect(situacao.hint).toBeUndefined()
  })
})

describe('buildKpiSlotsDetalhe — Slot 2 Idade', () => {
  it('com tramitação + mediana: value + hint comparativo', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: baseStats,
    })
    expect(idade.label).toBe('Idade')
    expect(idade.value).toBe('100 dias')
    expect(idade.hint).toBe('vs mediana 200 dias para PL')
  })

  it('idade >= 1.5x mediana: tone warning (parada vs pares)', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PEC',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        diasEmTramitacao: 300,
        medianaDiasTipoReferencia: 200,
      },
    })
    expect(idade.tone).toBe('warning')
  })

  it('idade <= 0.5x mediana: tone success (rápida)', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PEC',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        diasEmTramitacao: 50,
        medianaDiasTipoReferencia: 200,
      },
    })
    expect(idade.tone).toBe('success')
  })

  it('mediana NULL: suprime hint (amostra insuficiente — P2)', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PRC',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, medianaDiasTipoReferencia: null },
    })
    expect(idade.value).toBe('100 dias')
    expect(idade.hint).toBeUndefined()
  })

  it('n_eventos_tramitacao = 0: "Idade não calculável"', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nEventosTramitacao: 0 },
    })
    expect(idade.value).toBe('Idade não calculável')
    expect(idade.tone).toBe('muted')
  })

  it('singular "1 dia" (não "1 dias")', () => {
    const [, idade] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, diasEmTramitacao: 1 },
    })
    expect(idade.value).toBe('1 dia')
  })
})

describe('buildKpiSlotsDetalhe — Slot 3 Apoio', () => {
  it('N autores + hint "P partidos · U UFs"', () => {
    const [, , apoio] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: baseStats,
    })
    expect(apoio.value).toBe('5 autores')
    expect(apoio.hint).toBe('3 partidos · 4 UFs')
  })

  it('n_autores = 0: "Autoria não cadastrada" muted', () => {
    const [, , apoio] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nAutores: 0 },
    })
    expect(apoio.value).toBe('Autoria não cadastrada')
    expect(apoio.tone).toBe('muted')
  })

  it('autoria só por órgão (n_partidos = 0): hint "Autoria por órgão"', () => {
    const [, , apoio] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nPartidosAutores: 0, nUfsAutores: 0 },
    })
    expect(apoio.value).toBe('5 autores')
    expect(apoio.hint).toBe('Autoria por órgão')
    expect(apoio.tone).toBe('muted')
  })

  it('1 autor (singular)', () => {
    const [, , apoio] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nAutores: 1, nPartidosAutores: 1, nUfsAutores: 1 },
    })
    expect(apoio.value).toBe('1 autor')
    expect(apoio.hint).toBe('1 partido · 1 UF')
  })

  it('sem UFs (só partidos): hint sem fragmento "UFs"', () => {
    const [, , apoio] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nUfsAutores: 0 },
    })
    expect(apoio.hint).toBe('3 partidos')
  })
})

describe('buildKpiSlotsDetalhe — Slot 4 Votações', () => {
  it('com aprovadas predominando: tone success', () => {
    const [, , , vot] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        nVotacoes: 5,
        nVotacoesAprovadas: 4,
        nVotacoesRejeitadas: 1,
      },
    })
    expect(vot.value).toBe('5 votações')
    expect(vot.hint).toBe('4 aprovadas · 1 rejeitadas')
    expect(vot.tone).toBe('success')
  })

  it('com rejeitadas predominando: tone destructive', () => {
    const [, , , vot] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        nVotacoes: 5,
        nVotacoesAprovadas: 1,
        nVotacoesRejeitadas: 4,
      },
    })
    expect(vot.tone).toBe('destructive')
  })

  it('empate aprovadas/rejeitadas: tone default', () => {
    const [, , , vot] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: baseStats, // 1 aprovada, 1 rejeitada
    })
    expect(vot.tone).toBe('default')
  })

  it('n_votacoes = 0: "Nenhuma ainda" muted', () => {
    const [, , , vot] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: { ...baseStats, nVotacoes: 0 },
    })
    expect(vot.value).toBe('Nenhuma ainda')
    expect(vot.tone).toBe('muted')
  })

  it('1 votação (singular)', () => {
    const [, , , vot] = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: {
        ...baseStats,
        nVotacoes: 1,
        nVotacoesAprovadas: 1,
        nVotacoesRejeitadas: 0,
      },
    })
    expect(vot.value).toBe('1 votação')
  })
})

describe('buildKpiSlotsDetalhe — retorno', () => {
  it('retorna sempre tuple de 4 slots na ordem cravada', () => {
    const slots = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: null,
    })
    expect(slots).toHaveLength(4)
    expect(slots[0].label).toBe('Situação')
    expect(slots[1].label).toBe('Idade')
    expect(slots[2].label).toBe('Apoio')
    expect(slots[3].label).toBe('Votações')
  })

  it('stats = null: todos os 4 slots em fallback honesto', () => {
    const slots = buildKpiSlotsDetalhe({
      tipo: 'PL',
      situacao: 'TRAMITANDO',
      stats: null,
    })
    expect(slots[0].hint).toBeUndefined()
    expect(slots[1].value).toBe('Idade não calculável')
    expect(slots[2].value).toBe('Autoria não cadastrada')
    expect(slots[3].value).toBe('Nenhuma ainda')
  })
})
