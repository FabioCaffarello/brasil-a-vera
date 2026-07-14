import { describe, expect, it } from 'vitest'
import { mapLiderancasSenado } from './liderancas-mapper'
import type { SenadoLiderancaItem } from './liderancas-schema'

const mapaSenadoresSimples = new Map([
  ['5322', 'uuid-padilha'],
  ['9999', 'uuid-senadora'],
])

function buildItem(
  overrides: Partial<SenadoLiderancaItem>,
): SenadoLiderancaItem {
  return {
    casa: 'SF',
    codigo: '1',
    codigoParlamentar: '5322',
    siglaPartidoFiliacao: 'PT',
    siglaTipoLideranca: 'L',
    siglaTipoUnidadeLideranca: 'PTD',
    descricaoTipoLideranca: 'Líder',
    nomeParlamentar: 'Senador Teste',
    dataDesignacao: '2025-02-01',
    ...overrides,
  }
}

describe('mapLiderancasSenado', () => {
  it('mapeia líder de partido → LIDER_PARTIDO', () => {
    const items: SenadoLiderancaItem[] = [
      buildItem({ siglaTipoUnidadeLideranca: 'PTD', siglaTipoLideranca: 'L' }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
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
    const items: SenadoLiderancaItem[] = [
      buildItem({
        codigoParlamentar: '9999',
        siglaTipoUnidadeLideranca: 'PTD',
        siglaTipoLideranca: 'V',
      }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('VICE_LIDER_PARTIDO')
  })

  it('mapeia líder do Governo → LIDER_GOVERNO', () => {
    const items: SenadoLiderancaItem[] = [
      buildItem({ siglaTipoUnidadeLideranca: 'GOV', siglaTipoLideranca: 'L' }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('LIDER_GOVERNO')
  })

  it('mapeia líder da Oposição → LIDER_OPOSICAO', () => {
    const items: SenadoLiderancaItem[] = [
      buildItem({ siglaTipoUnidadeLideranca: 'OPO', siglaTipoLideranca: 'L' }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows[0]?.tipo).toBe('LIDER_OPOSICAO')
  })

  it('ignora parlamentar fora da base', () => {
    const items: SenadoLiderancaItem[] = [
      buildItem({ codigoParlamentar: '0000' }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(0)
  })

  it('filtra itens de outras casas (CD)', () => {
    const items: SenadoLiderancaItem[] = [buildItem({ casa: 'CD' })]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(0)
  })

  it('array vazio retorna array vazio', () => {
    const rows = mapLiderancasSenado([], 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(0)
  })

  // Regressão #727: a API retorna o mesmo líder com dataDesignacao
  // distintas (redesignações) — o mapper devolve 1:1 (stats distinguem
  // fora-da-base de duplicata); o dedupe é aplicado pelo main via
  // dedupeLiderancas (testado em camara/liderancas-mapper.test.ts).
  it('preserva redesignações 1:1 (dedupe é responsabilidade do main)', () => {
    const items: SenadoLiderancaItem[] = [
      buildItem({ dataDesignacao: '2026-04-14' }),
      buildItem({ dataDesignacao: '2026-04-15' }),
    ]
    const rows = mapLiderancasSenado(items, 57, mapaSenadoresSimples)
    expect(rows).toHaveLength(2)
  })
})
