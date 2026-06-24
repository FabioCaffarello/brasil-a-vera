import { describe, expect, it } from 'vitest'
import { mapLiderancasSenado } from './liderancas-mapper'
import type { SenadoLiderancasEnvelope } from './liderancas-schema'

const mapaSenadoresSimples = new Map([
  ['5322', 'uuid-padilha'],
  ['9999', 'uuid-senadora'],
])

function buildEnvelope(
  sigla: string,
  membros: Array<{ CodigoParlamentar: string; Papel?: string }>,
): SenadoLiderancasEnvelope {
  return {
    ListaLiderancas: {
      Lideranca: [
        {
          SiglaLideranca: sigla,
          NomeLideranca: sigla,
          DescricaoLideranca: sigla,
          Membros: {
            Membro: membros.map((m) => ({
              CodigoParlamentar: m.CodigoParlamentar,
              NomeParlamentar: 'Senador Teste',
              Papel: m.Papel ?? 'Lider',
            })),
          },
        },
      ],
    },
  }
}

describe('mapLiderancasSenado', () => {
  it('mapeia líder de partido → LIDER_PARTIDO', () => {
    const envelope = buildEnvelope('PT', [{ CodigoParlamentar: '5322' }])
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      parlamentarId: 'uuid-padilha',
      tipo: 'LIDER_PARTIDO',
      entidade: 'PT',
      casa: 'SENADO',
      legislatura: 57,
    })
  })

  it('mapeia vice-líder de partido → VICE_LIDER_PARTIDO', () => {
    const envelope = buildEnvelope('MDB', [
      { CodigoParlamentar: '9999', Papel: 'Vice-Lider' },
    ])
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('VICE_LIDER_PARTIDO')
  })

  it('mapeia líder do Governo → LIDER_GOVERNO', () => {
    const envelope = buildEnvelope('Governo', [{ CodigoParlamentar: '5322' }])
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('LIDER_GOVERNO')
  })

  it('mapeia líder da Oposição (com acento) → LIDER_OPOSICAO', () => {
    const envelope = buildEnvelope('Oposição', [{ CodigoParlamentar: '5322' }])
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('LIDER_OPOSICAO')
  })

  it('ignora parlamentar fora da base', () => {
    const envelope = buildEnvelope('PT', [{ CodigoParlamentar: '0000' }])
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(0)
  })

  it('envelope sem Liderancas retorna array vazio', () => {
    const envelope: SenadoLiderancasEnvelope = {
      ListaLiderancas: {},
    }
    const rows = mapLiderancasSenado(envelope, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(0)
  })
})
