import { describe, expect, it } from 'vitest'

import { mapBioDeputado } from './bio-mapper'

describe('mapBioDeputado', () => {
  it('extrai bio do detalhe + profissão da primeira entrada', () => {
    const r = mapBioDeputado(
      {
        dados: {
          id: '204554',
          escolaridade: 'Superior Incompleto',
          dataNascimento: '1965-02-13',
          municipioNascimento: 'Salvador',
          ufNascimento: 'BA',
        },
      },
      { dados: [{ titulo: 'Empresário' }, { titulo: 'Advogado' }] },
    )
    expect(r).toEqual({
      escolaridade: 'Superior Incompleto',
      dataNascimento: '1965-02-13',
      municipioNascimento: 'Salvador',
      ufNascimento: 'BA',
      profissao: 'Empresário',
    })
  })

  it('campos ausentes/vazios → null', () => {
    const r = mapBioDeputado(
      { dados: { id: '1', escolaridade: '  ', dataNascimento: null } },
      { dados: [] },
    )
    expect(r).toEqual({
      escolaridade: null,
      dataNascimento: null,
      municipioNascimento: null,
      ufNascimento: null,
      profissao: null,
    })
  })
})
