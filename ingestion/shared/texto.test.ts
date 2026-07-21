import { describe, expect, it } from 'vitest'

import { sanitizeTexto, sanitizeTextoNullable, titleCaseNome } from './texto'

describe('sanitizeTexto', () => {
  it('remove soft hyphen (caso "Sa­úde" da auditoria)', () => {
    expect(sanitizeTexto('Agência Nacional de Sa­úde Suplementar')).toBe(
      'Agência Nacional de Saúde Suplementar',
    )
  })

  it('remove zero-widths, BOM e controles C0/C1', () => {
    expect(sanitizeTexto('﻿a​bcd')).toBe('abcd')
  })

  it('preserva quebras de linha e tabs', () => {
    expect(sanitizeTexto('linha1\nlinha2\tfim')).toBe('linha1\nlinha2\tfim')
  })

  it('colapsa espaços duplicados e faz trim', () => {
    expect(sanitizeTexto('  a  b  ')).toBe('a b')
  })

  it('nullable: null/undefined/vazio viram null', () => {
    expect(sanitizeTextoNullable(null)).toBeNull()
    expect(sanitizeTextoNullable(undefined)).toBeNull()
    expect(sanitizeTextoNullable('­')).toBeNull()
    expect(sanitizeTextoNullable(' ok ')).toBe('ok')
  })
})

describe('titleCaseNome', () => {
  it('converte nome todo em caixa alta (caso "ANDRÉ ABDON")', () => {
    expect(titleCaseNome('ANDRÉ ABDON')).toBe('André Abdon')
  })

  it('NÃO altera nome já em casing misto (caso "AJ Albuquerque")', () => {
    expect(titleCaseNome('AJ Albuquerque')).toBe('AJ Albuquerque')
    expect(titleCaseNome('Astronauta Marcos Pontes')).toBe(
      'Astronauta Marcos Pontes',
    )
  })

  it('conectivos ficam minúsculos, exceto na primeira posição', () => {
    expect(titleCaseNome('JOSÉ DA SILVA DOS SANTOS')).toBe(
      'José da Silva dos Santos',
    )
    expect(titleCaseNome('DA SILVA')).toBe('Da Silva')
  })

  it('iniciais de até 2 letras permanecem maiúsculas', () => {
    expect(titleCaseNome('JC OLIVEIRA')).toBe('JC Oliveira')
  })

  it('numerais romanos permanecem maiúsculos', () => {
    expect(titleCaseNome('JOÃO PEDRO II')).toBe('João Pedro II')
    expect(titleCaseNome('FILHO XV')).toBe('Filho XV')
  })

  it('hífen e apóstrofo capitalizam cada segmento', () => {
    expect(titleCaseNome('VILLAS-BOAS')).toBe('Villas-Boas')
    expect(titleCaseNome("D'ÁVILA")).toBe("D'Ávila")
  })

  it('acentos contam como caixa alta (gate não confunde "É" com misto)', () => {
    expect(titleCaseNome('JOSÉ ANDRÉ')).toBe('José André')
  })
})
