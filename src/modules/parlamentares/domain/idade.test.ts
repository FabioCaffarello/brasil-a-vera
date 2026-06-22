import { describe, expect, it } from 'vitest'

import { calcularIdade } from './idade'

describe('calcularIdade', () => {
  const hoje = new Date('2026-06-22T12:00:00Z')

  it('calcula anos completos', () => {
    expect(calcularIdade('1965-02-13', hoje)).toBe(61)
  })

  it('ainda não fez aniversário no ano → um a menos', () => {
    expect(calcularIdade('1965-12-31', hoje)).toBe(60)
  })

  it('aniversário hoje → conta', () => {
    expect(calcularIdade('2000-06-22', hoje)).toBe(26)
  })

  it('formato inválido → null', () => {
    expect(calcularIdade('13/02/1965', hoje)).toBeNull()
    expect(calcularIdade('', hoje)).toBeNull()
  })

  it('data absurda → null', () => {
    expect(calcularIdade('1800-01-01', hoje)).toBeNull()
  })
})
