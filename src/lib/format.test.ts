import { describe, expect, it } from 'vitest'

import {
  formatBRL,
  formatDataBR,
  formatProposicaoRef,
  getTipoVotoStyle,
} from './format'

describe('formatBRL', () => {
  it('formata número como BRL', () => {
    expect(formatBRL(1234.56)).toMatch(/R\$\s*1\.234,56/)
  })

  it('formata string numérica (vinda do Drizzle)', () => {
    expect(formatBRL('1234.56')).toMatch(/R\$\s*1\.234,56/)
  })

  it('retorna — para null/undefined', () => {
    expect(formatBRL(null)).toBe('—')
    expect(formatBRL(undefined)).toBe('—')
  })

  it('retorna — para strings inválidas', () => {
    expect(formatBRL('abc')).toBe('—')
  })
})

describe('formatDataBR', () => {
  it('formata data ISO como DD/MM/YYYY', () => {
    expect(formatDataBR('2025-05-15')).toBe('15/05/2025')
  })

  it('aceita objeto Date', () => {
    expect(formatDataBR(new Date('2025-12-01T00:00:00Z'))).toBe('01/12/2025')
  })

  it('retorna — para inválidos', () => {
    expect(formatDataBR(null)).toBe('—')
    expect(formatDataBR('not-a-date')).toBe('—')
  })
})

describe('formatProposicaoRef', () => {
  it('formata como SIGLA NUM/ANO', () => {
    expect(formatProposicaoRef('PL', 1234, 2025)).toBe('PL 1234/2025')
    expect(formatProposicaoRef('PEC', 6, 2026)).toBe('PEC 6/2026')
  })
})

describe('getTipoVotoStyle', () => {
  it('retorna label canônico para os tipos do enum', () => {
    expect(getTipoVotoStyle('SIM').label).toBe('SIM')
    expect(getTipoVotoStyle('NAO').label).toBe('NÃO')
    expect(getTipoVotoStyle('ABSTENCAO').label).toBe('Abstenção')
  })

  it('cai em default para tipos desconhecidos', () => {
    const s = getTipoVotoStyle('XYZ')
    expect(s.label).toBe('XYZ')
    expect(s.classes).toContain('bg-surface-raised')
  })
})
