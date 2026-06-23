import { describe, expect, it } from 'vitest'

import { isUfValida, nomeUf, REGIOES, UFS, ufsPorRegiao } from './ufs'

describe('ufs', () => {
  it('tem as 27 unidades da federação', () => {
    expect(UFS).toHaveLength(27)
  })

  it('ufsPorRegiao cobre todas as 27 UFs sem perdas nem duplicatas', () => {
    const grupos = ufsPorRegiao()
    expect(grupos.map((g) => g.regiao)).toEqual(REGIOES)
    const siglas = grupos.flatMap((g) => g.ufs.map((u) => u.sigla))
    expect(siglas).toHaveLength(27)
    expect(new Set(siglas).size).toBe(27)
  })

  it('ufsPorRegiao ordena UFs por nome dentro de cada região', () => {
    const sudeste = ufsPorRegiao().find((g) => g.regiao === 'Sudeste')
    expect(sudeste?.ufs.map((u) => u.sigla)).toEqual(['ES', 'MG', 'RJ', 'SP'])
  })

  it('nomeUf resolve sigla (case-insensitive)', () => {
    expect(nomeUf('SP')).toBe('São Paulo')
    expect(nomeUf('ap')).toBe('Amapá')
    expect(nomeUf('XX')).toBeNull()
  })

  it('isUfValida', () => {
    expect(isUfValida('RJ')).toBe(true)
    expect(isUfValida('rj')).toBe(true)
    expect(isUfValida('ZZ')).toBe(false)
  })
})
