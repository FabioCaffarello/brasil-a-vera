import { describe, expect, it } from 'vitest'

import { agregarTemas } from './temas'

describe('agregarTemas', () => {
  it('separa por vírgula, conta frequência e ordena (maior primeiro)', () => {
    const r = agregarTemas(
      ['Agronegócio, Governo federal', 'Agronegócio, Saúde', 'Agronegócio'],
      10,
    )
    expect(r).toEqual([
      { termo: 'Agronegócio', count: 3 },
      { termo: 'Governo federal', count: 1 },
      { termo: 'Saúde', count: 1 },
    ])
  })

  it('desempata alfabeticamente', () => {
    const r = agregarTemas(['Zeta, Alfa'], 10)
    expect(r.map((t) => t.termo)).toEqual(['Alfa', 'Zeta'])
  })

  it('respeita o top-N', () => {
    const r = agregarTemas(['a,a,b,b,b,c'], 2)
    expect(r).toEqual([
      { termo: 'b', count: 3 },
      { termo: 'a', count: 2 },
    ])
  })

  it('ignora null/vazios e espaços', () => {
    const r = agregarTemas([null, '', '  ', 'Tema , , Tema'], 10)
    expect(r).toEqual([{ termo: 'Tema', count: 2 }])
  })

  it('lista vazia → []', () => {
    expect(agregarTemas([], 10)).toEqual([])
  })
})
