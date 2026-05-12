import { describe, expect, it } from 'vitest'

import {
  avgStorageGb,
  classifyBudget,
  estimateMonthlyCostUsd,
  monthlyComputeHours,
} from './neon-budget-calc'

describe('classifyBudget', () => {
  it('retorna normal abaixo do threshold de info', () => {
    expect(classifyBudget(0)).toEqual({ level: 'normal', thresholdUsd: 0 })
    expect(classifyBudget(2.99)).toEqual({ level: 'normal', thresholdUsd: 0 })
  })

  it('retorna info entre 3 e 7', () => {
    expect(classifyBudget(3)).toEqual({ level: 'info', thresholdUsd: 3 })
    expect(classifyBudget(6.99)).toEqual({ level: 'info', thresholdUsd: 3 })
  })

  it('retorna alert entre 7 e 15', () => {
    expect(classifyBudget(7)).toEqual({ level: 'alert', thresholdUsd: 7 })
    expect(classifyBudget(14.99)).toEqual({ level: 'alert', thresholdUsd: 7 })
  })

  it('retorna critical a partir de 15', () => {
    expect(classifyBudget(15)).toEqual({ level: 'critical', thresholdUsd: 15 })
    expect(classifyBudget(100)).toEqual({ level: 'critical', thresholdUsd: 15 })
  })
})

describe('monthlyComputeHours', () => {
  it('converte lifetime seconds para projection mensal de horas', () => {
    // 30 dias rodando 1h/dia = 3600 * 30 = 108000s lifetime
    // Esperado: ~30 horas/mês
    expect(monthlyComputeHours(108_000, 30)).toBe(30)
  })

  it('extrapola corretamente quando lifetime é menor que 30 dias', () => {
    // 5 dias rodando 2h/dia = 5 * 2 * 3600 = 36000s
    // Run-rate: 2h/dia * 30 = 60h/mês
    expect(monthlyComputeHours(36_000, 5)).toBe(60)
  })

  it('floor de days em 1 para projeto recém-criado', () => {
    // 0 dias é tratado como 1; lifetime 3600 = 1 hora total
    // → run-rate 30h/mês
    expect(monthlyComputeHours(3600, 0)).toBe(30)
  })

  it('retorna 0 para lifetime 0', () => {
    expect(monthlyComputeHours(0, 30)).toBe(0)
  })
})

describe('avgStorageGb', () => {
  it('calcula média de bytes ao longo do lifetime e converte para GiB', () => {
    // 1 GiB de storage constante por 30 dias = 1 * 30 * 24 = 720 GiB-hours
    // → 720 * 1024^3 bytes-hour
    const bytesHour = 720 * 1024 ** 3
    expect(avgStorageGb(bytesHour, 30)).toBeCloseTo(1, 5)
  })

  it('retorna 0 para lifetime 0', () => {
    expect(avgStorageGb(0, 30)).toBe(0)
  })

  it('floor de days em 1 para projeto recém-criado', () => {
    const bytesHour = 24 * 1024 ** 3 // 1 GiB armazenado por 1 dia
    expect(avgStorageGb(bytesHour, 0)).toBeCloseTo(1, 5)
  })
})

describe('estimateMonthlyCostUsd', () => {
  it('retorna 0 para uso zero', () => {
    expect(
      estimateMonthlyCostUsd({ computeHoursMonthly: 0, avgStorageGb: 0 }),
    ).toBe(0)
  })

  it('aplica preço de compute (0.16/h)', () => {
    expect(
      estimateMonthlyCostUsd({ computeHoursMonthly: 100, avgStorageGb: 0 }),
    ).toBe(16)
  })

  it('aplica preço de storage (0.35/GB-mês)', () => {
    expect(
      estimateMonthlyCostUsd({ computeHoursMonthly: 0, avgStorageGb: 10 }),
    ).toBe(3.5)
  })

  it('soma compute e storage', () => {
    // 50h compute = $8 + 5 GB storage = $1.75 = $9.75
    expect(
      estimateMonthlyCostUsd({ computeHoursMonthly: 50, avgStorageGb: 5 }),
    ).toBe(9.75)
  })

  it('arredonda para 2 casas decimais', () => {
    // 10h * 0.16 = 1.6; 1 GB * 0.35 = 0.35; total 1.95
    expect(
      estimateMonthlyCostUsd({ computeHoursMonthly: 10, avgStorageGb: 1 }),
    ).toBe(1.95)
  })
})
