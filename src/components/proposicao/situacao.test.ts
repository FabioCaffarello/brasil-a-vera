import { describe, expect, it } from 'vitest'

import { situacaoLabel, situacaoStatus } from './situacao'

describe('situacaoStatus — fonte única do badge de situação (ADR-053)', () => {
  it('mapeia cada situação conhecida para rótulo + tone do DataBadge', () => {
    expect(situacaoStatus('TRAMITANDO')).toEqual({
      label: 'Tramitando',
      tone: 'primary',
    })
    expect(situacaoStatus('APROVADA')).toEqual({
      label: 'Aprovada',
      tone: 'success',
    })
    expect(situacaoStatus('REJEITADA')).toEqual({
      label: 'Rejeitada',
      tone: 'error',
    })
    expect(situacaoStatus('ARQUIVADA')).toEqual({
      label: 'Arquivada',
      tone: 'neutral',
    })
    expect(situacaoStatus('TRANSFORMADA_EM_NORMA')).toEqual({
      label: 'Virou norma',
      tone: 'success',
    })
  })

  it('situação desconhecida: tone neutro (ARQUIVADA) + rótulo cru', () => {
    expect(situacaoStatus('DESPACHADA_QUALQUER')).toEqual({
      label: 'DESPACHADA_QUALQUER',
      tone: 'neutral',
    })
  })

  it('situacaoLabel devolve o valor cru quando não há rótulo conhecido', () => {
    expect(situacaoLabel('FOO')).toBe('FOO')
    expect(situacaoLabel('APROVADA')).toBe('Aprovada')
  })
})
