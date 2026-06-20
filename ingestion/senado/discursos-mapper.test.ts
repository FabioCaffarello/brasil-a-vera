import { describe, expect, it } from 'vitest'

import { mapDiscursosSenado } from './discursos-mapper'

describe('mapDiscursosSenado', () => {
  it('mapeia pronunciamento com id, resumo e URL do texto', () => {
    const r = mapDiscursosSenado([
      {
        CodigoPronunciamento: '501958',
        DataPronunciamento: '2023-11-07',
        TipoUsoPalavra: { Descricao: 'Pela ordem' },
        TextoResumo: 'Registro da presença em Plenário.',
        Indexacao: 'REGISTRO,PRESENÇA,PLENARIO',
        UrlTexto:
          'https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/texto/501958',
      },
    ])
    expect(r).toEqual([
      {
        sourceId: '501958',
        data: '2023-11-07',
        tipo: 'Pela ordem',
        sumario: 'Registro da presença em Plenário.',
        keywords: 'REGISTRO,PRESENÇA,PLENARIO',
        urlTexto:
          'https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/texto/501958',
      },
    ])
  })

  it('aceita CodigoPronunciamento numérico e default de tipo', () => {
    const r = mapDiscursosSenado([
      { CodigoPronunciamento: 123, DataPronunciamento: '2024-01-01' },
    ])
    expect(r[0].sourceId).toBe('123')
    expect(r[0].tipo).toBe('Pronunciamento')
    expect(r[0].sumario).toBeNull()
  })

  it('ignora pronunciamento sem data', () => {
    const r = mapDiscursosSenado([
      // @ts-expect-error data faltando — defensivo
      { CodigoPronunciamento: '1', DataPronunciamento: '' },
      { CodigoPronunciamento: '2', DataPronunciamento: '2024-02-02' },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].sourceId).toBe('2')
  })
})
