import { describe, expect, it } from 'vitest'
import { classifyAlinhamentoCard } from './alinhamento-card'

describe('classifyAlinhamentoCard', () => {
  it('retorna com_amostra quando votacoes ≥ 50 e pct não nulo', () => {
    expect(classifyAlinhamentoCard(80, '75.5', 'CAMARA', 'PT')).toEqual({
      kind: 'com_amostra',
      percentual: 75.5,
      votacoes: 80,
    })
  })

  it('retorna amostra_insuficiente quando 0 < votacoes < 50', () => {
    expect(classifyAlinhamentoCard(30, '60.0', 'CAMARA', 'PT')).toEqual({
      kind: 'amostra_insuficiente',
      votacoes: 30,
    })
  })

  it('retorna amostra_insuficiente quando votacoes ≥ 50 mas pct é null', () => {
    expect(classifyAlinhamentoCard(60, null, 'CAMARA', 'PT')).toEqual({
      kind: 'amostra_insuficiente',
      votacoes: 60,
    })
  })

  it('retorna federacao quando votacoes = 0 e partido está em federação', () => {
    // PT está na Federação Brasil da Esperança (FE BRASIL)
    expect(classifyAlinhamentoCard(0, null, 'CAMARA', 'PT')).toEqual({
      kind: 'federacao',
    })
  })

  it('retorna federacao para PSOL (Federação PSOL REDE)', () => {
    expect(classifyAlinhamentoCard(0, null, 'CAMARA', 'PSOL')).toEqual({
      kind: 'federacao',
    })
  })

  it('retorna federacao para PSDB (Federação PSDB Cidadania)', () => {
    expect(classifyAlinhamentoCard(0, null, 'CAMARA', 'PSDB')).toEqual({
      kind: 'federacao',
    })
  })

  it('retorna sem_dado quando votacoes = 0 e partido NÃO está em federação (Câmara)', () => {
    expect(classifyAlinhamentoCard(0, null, 'CAMARA', 'PL')).toEqual({
      kind: 'sem_dado',
      senadoLegacy: false,
    })
  })

  it('retorna sem_dado senadoLegacy=true para Senado sem dados', () => {
    expect(classifyAlinhamentoCard(0, null, 'SENADO', 'PL')).toEqual({
      kind: 'sem_dado',
      senadoLegacy: true,
    })
  })

  it('retorna sem_dado quando votacoes é null (sem agregado)', () => {
    expect(classifyAlinhamentoCard(null, null, 'CAMARA', 'PL')).toEqual({
      kind: 'sem_dado',
      senadoLegacy: false,
    })
  })

  it('sem partidoSigla, fallback correto sem federação', () => {
    expect(classifyAlinhamentoCard(0, null, 'CAMARA')).toEqual({
      kind: 'sem_dado',
      senadoLegacy: false,
    })
  })
})
