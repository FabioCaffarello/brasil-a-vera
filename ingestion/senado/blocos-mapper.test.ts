import { describe, expect, it } from 'vitest'
import { mapBlocoSenado } from './blocos-mapper'
import { type SenadoBlocoItem, senadoBlocosListaSchema } from './blocos-schema'

const blocoBase: SenadoBlocoItem = {
  CodigoBloco: '42',
  NomeBloco: 'Bloco Parlamentar da Renovação',
  NomeApelido: 'BPR',
  DataCriacao: '2023-01-01',
  Membros: {
    Membro: [
      {
        Partido: { SiglaPartido: 'PODE', NomePartido: 'Podemos' },
        DataAdesao: '2023-01-01',
      },
      {
        Partido: { SiglaPartido: 'PSDB', NomePartido: 'PSDB' },
        DataAdesao: '2023-01-01',
      },
    ],
  },
}

describe('mapBlocoSenado', () => {
  it('mapeia bloco com partidos corretamente', () => {
    const row = mapBlocoSenado(blocoBase)
    expect(row).toEqual({
      sourceId: '42',
      nome: 'BPR',
      casa: 'SENADO',
      legislatura: 57,
      partidos: ['PODE', 'PSDB'],
    })
  })

  it('usa NomeBloco quando NomeApelido ausente', () => {
    const bloco: SenadoBlocoItem = { ...blocoBase, NomeApelido: undefined }
    expect(mapBlocoSenado(bloco).nome).toBe('Bloco Parlamentar da Renovação')
  })

  it('Membros ausentes → array vazio', () => {
    const bloco: SenadoBlocoItem = { ...blocoBase, Membros: undefined }
    expect(mapBlocoSenado(bloco).partidos).toEqual([])
  })

  it('normaliza siglas para maiúsculo', () => {
    const bloco: SenadoBlocoItem = {
      ...blocoBase,
      Membros: {
        Membro: [{ Partido: { SiglaPartido: 'mdb' }, DataAdesao: null }],
      },
    }
    expect(mapBlocoSenado(bloco).partidos).toEqual(['MDB'])
  })
})

// Regressão #727 item 3: o payload real vem embrulhado em
// `ListaBlocoParlamentar` (+ Metadados) — o schema anterior esperava
// `Blocos` na raiz e falhava TODO parse ("expected object, received
// undefined"). Fixture literal reduzida do payload real de 2026-07-14.
describe('senadoBlocosListaSchema', () => {
  it('aceita o envelope real ListaBlocoParlamentar', () => {
    const raw = {
      ListaBlocoParlamentar: {
        noNamespaceSchemaLocation: 'https://legis.senado.leg.br/…',
        Metadados: { Versao: '14/07/2026 06:20:51', VersaoServico: '4' },
        Blocos: {
          Bloco: [
            {
              CodigoBloco: '346',
              NomeBloco: 'Bloco Parlamentar Aliança',
              NomeApelido: 'BLALIANÇA',
              DataCriacao: '2023-03-20',
              Membros: {
                Membro: [
                  {
                    Partido: { CodigoPartido: '418', SiglaPartido: 'PP' },
                    DataAdesao: '2023-03-20',
                  },
                ],
              },
            },
          ],
        },
      },
    }
    const parsed = senadoBlocosListaSchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const blocos = parsed.data.ListaBlocoParlamentar.Blocos.Bloco ?? []
      expect(blocos).toHaveLength(1)
      expect(mapBlocoSenado(blocos[0]).nome).toBe('BLALIANÇA')
    }
  })

  it('rejeita o shape antigo (Blocos na raiz) — não silencia regressão', () => {
    const antigo = { Blocos: { Bloco: [] } }
    expect(senadoBlocosListaSchema.safeParse(antigo).success).toBe(false)
  })
})
