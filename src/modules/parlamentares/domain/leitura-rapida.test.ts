import { describe, expect, it } from 'vitest'

import type { AlinhamentoResult } from '@/lib/queries/alinhamento'
import type { CoerenciaStats } from '@/lib/queries/coerencia'

import {
  classificarAlinhamento,
  classificarCoerencia,
  classificarGasto,
  classificarProposicoes,
} from './leitura-rapida'

// Base de AlinhamentoResult — sobrescrita por caso.
const alinhamentoBase: AlinhamentoResult = {
  partidoSigla: 'PT',
  percentual: 87,
  total: 142,
  alinhados: 124,
  divergentes: 18,
  amostraInsuficiente: false,
  emFederacao: false,
  federacaoNome: null,
  topDivergencias: [],
  topConvergencias: [],
}

describe('classificarAlinhamento', () => {
  it('completo quando há votações com orientação', () => {
    const f = classificarAlinhamento(alinhamentoBase, 'CAMARA')
    expect(f).toMatchObject({ kind: 'completo', percentual: 87, total: 142 })
  })

  it('federação tem precedência sobre tudo (ADR-041)', () => {
    const f = classificarAlinhamento(
      { ...alinhamentoBase, emFederacao: true, federacaoNome: 'PT-PCdoB-PV' },
      'CAMARA',
    )
    expect(f).toEqual({ kind: 'federacao', federacaoNome: 'PT-PCdoB-PV' })
  })

  it('senador sem dado = dívida #500 (não "Senado não publica")', () => {
    const f = classificarAlinhamento(
      { ...alinhamentoBase, total: 0, percentual: null, alinhados: 0 },
      'SENADO',
    )
    expect(f).toEqual({ kind: 'senado_sem_dado' })
  })

  it('deputado sem orientação registrada (Câmara, total 0)', () => {
    const f = classificarAlinhamento(
      { ...alinhamentoBase, total: 0, percentual: null, alinhados: 0 },
      'CAMARA',
    )
    expect(f).toEqual({ kind: 'sem_orientacao' })
  })

  it('amostra pequena ainda é completo, mas marca amostraInsuficiente', () => {
    const f = classificarAlinhamento(
      {
        ...alinhamentoBase,
        total: 12,
        alinhados: 9,
        amostraInsuficiente: true,
      },
      'CAMARA',
    )
    expect(f).toMatchObject({ kind: 'completo', amostraInsuficiente: true })
  })
})

describe('classificarGasto', () => {
  it('completo com percentil', () => {
    expect(
      classificarGasto({ totalGeral: '123456.78', totalRegistros: 40 }, 72),
    ).toEqual({ kind: 'completo', total: '123456.78', percentil: 72 })
  })

  it('completo sem percentil (null) ainda mostra o valor', () => {
    expect(
      classificarGasto({ totalGeral: '100.00', totalRegistros: 1 }, null),
    ).toEqual({ kind: 'completo', total: '100.00', percentil: null })
  })

  it('sem gasto cobre senador (sem CEAP) e deputado sem registro', () => {
    expect(
      classificarGasto({ totalGeral: '0.00', totalRegistros: 0 }, null),
    ).toEqual({ kind: 'sem_gasto' })
  })
})

describe('classificarProposicoes', () => {
  it('completo com percentil', () => {
    expect(classificarProposicoes(42, 80, false)).toEqual({
      kind: 'completo',
      count: 42,
      percentil: 80,
      parcial: false,
    })
  })

  it('propaga parcialidade (há mais páginas)', () => {
    expect(classificarProposicoes(20, null, true)).toMatchObject({
      kind: 'completo',
      parcial: true,
    })
  })

  it('nenhuma quando count 0', () => {
    expect(classificarProposicoes(0, null, false)).toEqual({ kind: 'nenhuma' })
  })
})

describe('classificarCoerencia', () => {
  const base: CoerenciaStats = {
    votosClassificados: 300,
    votosTotaisComProposicao: 350,
    paresContraditoriosDetectados: 3,
  }

  it('completo quando há pares', () => {
    expect(classificarCoerencia(base)).toEqual({
      kind: 'completo',
      pares: 3,
      classificaveis: 300,
    })
  })

  it('nenhum quando zero pares', () => {
    expect(
      classificarCoerencia({ ...base, paresContraditoriosDetectados: 0 }),
    ).toEqual({ kind: 'nenhum' })
  })
})
