import { describe, expect, it } from 'vitest'

import { isSessaoDeliberativaEncerrada } from './sessoes-mapper'

describe('isSessaoDeliberativaEncerrada', () => {
  it('aceita Sessão Deliberativa encerrada', () => {
    expect(
      isSessaoDeliberativaEncerrada({
        descricaoTipo: 'Sessão Deliberativa',
        situacao: 'Encerrada',
      }),
    ).toBe(true)
  })

  it('rejeita cancelada/futura', () => {
    expect(
      isSessaoDeliberativaEncerrada({
        descricaoTipo: 'Sessão Deliberativa',
        situacao: 'Cancelada',
      }),
    ).toBe(false)
    expect(
      isSessaoDeliberativaEncerrada({
        descricaoTipo: 'Sessão Deliberativa',
        situacao: null,
      }),
    ).toBe(false)
  })

  it('rejeita tipos não-deliberativos e Não Deliberativa', () => {
    for (const tipo of [
      'Sessão Não Deliberativa Solene',
      'Audiência Pública',
      'Seminário',
      'Reunião Deliberativa',
    ]) {
      expect(
        isSessaoDeliberativaEncerrada({
          descricaoTipo: tipo,
          situacao: 'Encerrada',
        }),
      ).toBe(false)
    }
  })
})
