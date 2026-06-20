import { describe, expect, it } from 'vitest'

import {
  calcularFidelidadeBancada,
  classificarVsBancada,
  construirTimelineMigracao,
  type PeriodoFiliacao,
  partidoVigenteEm,
  posicaoBancada,
} from './fidelidade'

describe('partidoVigenteEm (reconstrução as-of, ADR-043 D3)', () => {
  const filiacoes: PeriodoFiliacao[] = [
    { partidoSigla: 'PSDB', dataInicio: '2018-01-01', dataFim: '2021-12-31' },
    { partidoSigla: 'PL', dataInicio: '2022-01-01', dataFim: null },
  ]

  it('retorna o partido do período que cobre a data', () => {
    expect(partidoVigenteEm(filiacoes, '2020-06-15')).toBe('PSDB')
    expect(partidoVigenteEm(filiacoes, '2026-03-10')).toBe('PL')
  })

  it('inclui os limites dataInicio e dataFim (intervalo fechado)', () => {
    expect(partidoVigenteEm(filiacoes, '2018-01-01')).toBe('PSDB')
    expect(partidoVigenteEm(filiacoes, '2021-12-31')).toBe('PSDB')
    expect(partidoVigenteEm(filiacoes, '2022-01-01')).toBe('PL')
  })

  it('período vigente (dataFim null) cobre qualquer data futura', () => {
    expect(partidoVigenteEm(filiacoes, '2099-01-01')).toBe('PL')
  })

  it('fail-closed: lacuna sem cobertura → null', () => {
    const comLacuna: PeriodoFiliacao[] = [
      { partidoSigla: 'PSDB', dataInicio: '2018-01-01', dataFim: '2020-12-31' },
      { partidoSigla: 'PL', dataInicio: '2022-01-01', dataFim: null },
    ]
    expect(partidoVigenteEm(comLacuna, '2021-06-01')).toBeNull()
  })

  it('fail-closed: data anterior à primeira filiação → null', () => {
    expect(partidoVigenteEm(filiacoes, '2010-01-01')).toBeNull()
  })

  it('fail-closed: sobreposição com siglas diferentes → null', () => {
    const ambiguo: PeriodoFiliacao[] = [
      { partidoSigla: 'PSDB', dataInicio: '2022-01-01', dataFim: '2022-06-30' },
      { partidoSigla: 'PL', dataInicio: '2022-06-01', dataFim: null },
    ]
    expect(partidoVigenteEm(ambiguo, '2022-06-15')).toBeNull()
  })

  it('sobreposição com a MESMA sigla não é ambígua', () => {
    const mesma: PeriodoFiliacao[] = [
      { partidoSigla: 'PT', dataInicio: '2020-01-01', dataFim: '2022-06-30' },
      { partidoSigla: 'PT', dataInicio: '2022-06-01', dataFim: null },
    ]
    expect(partidoVigenteEm(mesma, '2022-06-15')).toBe('PT')
  })

  it('lista vazia → null', () => {
    expect(partidoVigenteEm([], '2026-01-01')).toBeNull()
  })
})

describe('posicaoBancada (quórum + maioria, ADR-043 D1)', () => {
  it('maioria SIM com quórum atingido', () => {
    expect(posicaoBancada({ sim: 7, nao: 2, totalMembros: 10 })).toBe('SIM')
  })

  it('maioria NÃO com quórum atingido', () => {
    expect(posicaoBancada({ sim: 1, nao: 6, totalMembros: 10 })).toBe('NAO')
  })

  it('quórum exatamente na metade dos membros é suficiente', () => {
    // 5 votos válidos numa bancada de 10 = metade → atinge quórum.
    expect(posicaoBancada({ sim: 5, nao: 0, totalMembros: 10 })).toBe('SIM')
  })

  it('fail-closed: votos válidos abaixo da metade → INDEFINIDA', () => {
    // 4 válidos numa bancada de 10 = 40% < 50%.
    expect(posicaoBancada({ sim: 3, nao: 1, totalMembros: 10 })).toBe(
      'INDEFINIDA',
    )
  })

  it('fail-closed: empate → INDEFINIDA mesmo com quórum', () => {
    expect(posicaoBancada({ sim: 5, nao: 5, totalMembros: 10 })).toBe(
      'INDEFINIDA',
    )
  })

  it('fail-closed: bancada vazia → INDEFINIDA', () => {
    expect(posicaoBancada({ sim: 0, nao: 0, totalMembros: 0 })).toBe(
      'INDEFINIDA',
    )
  })

  it('abstenção/ausência não entram no denominador (só sim+nao)', () => {
    // sim+nao = 6 numa bancada de 10 → quórum ok; SIM vence.
    expect(posicaoBancada({ sim: 4, nao: 2, totalMembros: 10 })).toBe('SIM')
  })
})

describe('classificarVsBancada (L2)', () => {
  it('voto igual à posição → ALINHADO', () => {
    expect(classificarVsBancada('SIM', 'SIM')).toBe('ALINHADO')
    expect(classificarVsBancada('NAO', 'NAO')).toBe('ALINHADO')
  })

  it('voto diferente da posição → DIVERGENTE', () => {
    expect(classificarVsBancada('NAO', 'SIM')).toBe('DIVERGENTE')
    expect(classificarVsBancada('ABSTENCAO', 'SIM')).toBe('DIVERGENTE')
    expect(classificarVsBancada('OBSTRUCAO', 'NAO')).toBe('DIVERGENTE')
  })

  it('posição INDEFINIDA → IGNORADO (fail-closed)', () => {
    expect(classificarVsBancada('SIM', 'INDEFINIDA')).toBe('IGNORADO')
  })

  it('voto AUSENTE → IGNORADO', () => {
    expect(classificarVsBancada('AUSENTE', 'SIM')).toBe('IGNORADO')
  })
})

describe('calcularFidelidadeBancada', () => {
  it('agrega alinhados/divergentes e ignora INDEFINIDA/AUSENTE', () => {
    const r = calcularFidelidadeBancada([
      { voto: 'SIM', posicao: 'SIM' }, // alinhado
      { voto: 'NAO', posicao: 'SIM' }, // divergente
      { voto: 'SIM', posicao: 'INDEFINIDA' }, // ignorado
      { voto: 'AUSENTE', posicao: 'NAO' }, // ignorado
    ])
    expect(r.total).toBe(2)
    expect(r.alinhados).toBe(1)
    expect(r.divergentes).toBe(1)
    expect(r.percentual).toBe(50)
  })

  it('percentual null quando não há votações comparáveis', () => {
    const r = calcularFidelidadeBancada([
      { voto: 'SIM', posicao: 'INDEFINIDA' },
    ])
    expect(r.total).toBe(0)
    expect(r.percentual).toBeNull()
  })

  it('lista vazia → zeros e percentual null', () => {
    const r = calcularFidelidadeBancada([])
    expect(r).toEqual({
      total: 0,
      alinhados: 0,
      divergentes: 0,
      percentual: null,
    })
  })
})

describe('construirTimelineMigracao (ADR-043 D3)', () => {
  it('ordena cronologicamente e conta trocas entre siglas distintas', () => {
    const r = construirTimelineMigracao([
      { partidoSigla: 'PL', dataInicio: '2022-01-01', dataFim: null },
      { partidoSigla: 'PSDB', dataInicio: '2014-01-01', dataFim: '2017-12-31' },
      { partidoSigla: 'DEM', dataInicio: '2018-01-01', dataFim: '2021-12-31' },
    ])
    expect(r.periodos.map((p) => p.partidoSigla)).toEqual(['PSDB', 'DEM', 'PL'])
    expect(r.trocas).toBe(2)
  })

  it('A→B→A conta 2 trocas', () => {
    const r = construirTimelineMigracao([
      { partidoSigla: 'PT', dataInicio: '2010-01-01', dataFim: '2014-12-31' },
      { partidoSigla: 'PSB', dataInicio: '2015-01-01', dataFim: '2018-12-31' },
      { partidoSigla: 'PT', dataInicio: '2019-01-01', dataFim: null },
    ])
    expect(r.trocas).toBe(2)
  })

  it('sigla repetida consecutiva não conta troca', () => {
    const r = construirTimelineMigracao([
      { partidoSigla: 'PT', dataInicio: '2010-01-01', dataFim: '2014-12-31' },
      { partidoSigla: 'PT', dataInicio: '2015-01-01', dataFim: null },
    ])
    expect(r.trocas).toBe(0)
  })

  it('filiação única → 0 trocas', () => {
    const r = construirTimelineMigracao([
      { partidoSigla: 'NOVO', dataInicio: '2022-01-01', dataFim: null },
    ])
    expect(r.trocas).toBe(0)
    expect(r.periodos).toHaveLength(1)
  })

  it('lista vazia → 0 trocas, sem períodos', () => {
    const r = construirTimelineMigracao([])
    expect(r.trocas).toBe(0)
    expect(r.periodos).toEqual([])
  })
})
