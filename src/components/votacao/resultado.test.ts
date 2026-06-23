import { describe, expect, it } from 'vitest'

import { resultadoStatus } from './resultado'

describe('resultadoStatus — fonte única do badge de resultado (ADR-053)', () => {
  it('aprovada → success', () => {
    expect(resultadoStatus(true)).toEqual({
      label: 'Aprovada',
      tone: 'success',
    })
  })

  it('rejeitada → error', () => {
    expect(resultadoStatus(false)).toEqual({
      label: 'Rejeitada',
      tone: 'error',
    })
  })
})
