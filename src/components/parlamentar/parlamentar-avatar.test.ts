import { describe, expect, it } from 'vitest'

import { iniciais } from './parlamentar-avatar'

describe('iniciais — fallback do ParlamentarAvatar (ADR-053)', () => {
  it('primeiro + último nome', () => {
    expect(iniciais('Maria Souza')).toBe('MS')
    expect(iniciais('Maria da Silva Souza')).toBe('MS')
  })

  it('nome único → 1 letra', () => {
    expect(iniciais('Maria')).toBe('M')
  })

  it('normaliza espaços e caixa', () => {
    expect(iniciais('  ana  lima  ')).toBe('AL')
  })

  it('vazio → "?"', () => {
    expect(iniciais('')).toBe('?')
    expect(iniciais('   ')).toBe('?')
  })
})
