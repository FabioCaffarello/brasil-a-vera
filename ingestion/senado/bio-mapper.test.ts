import { describe, expect, it } from 'vitest'

import { mapBioSenador } from './bio-mapper'

describe('mapBioSenador', () => {
  it('extrai nascimento e naturalidade dos dados básicos', () => {
    const r = mapBioSenador({
      DetalheParlamentar: {
        Parlamentar: {
          DadosBasicosParlamentar: {
            DataNascimento: '1975-04-03',
            Naturalidade: 'Passo Fundo',
            UfNaturalidade: 'RS',
          },
        },
      },
    })
    expect(r).toEqual({
      dataNascimento: '1975-04-03',
      municipioNascimento: 'Passo Fundo',
      ufNascimento: 'RS',
    })
  })

  it('dados básicos ausentes → tudo null', () => {
    const r = mapBioSenador({
      DetalheParlamentar: { Parlamentar: {} },
    })
    expect(r).toEqual({
      dataNascimento: null,
      municipioNascimento: null,
      ufNascimento: null,
    })
  })
})
