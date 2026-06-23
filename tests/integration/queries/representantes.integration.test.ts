import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getRepresentantesPorUf } from '@/lib/queries/representantes'
import {
  estatisticaParlamentarAgregada,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/representantes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('filtra por UF e separa senadores de deputados', async () => {
    await db
      .insert(parlamentar)
      .values([
        buildParlamentar({ nome: 'Sen SP', casa: 'SENADO', uf: 'SP' }),
        buildParlamentar({ nome: 'Dep SP 1', casa: 'CAMARA', uf: 'SP' }),
        buildParlamentar({ nome: 'Dep SP 2', casa: 'CAMARA', uf: 'SP' }),
        buildParlamentar({ nome: 'Dep RJ', casa: 'CAMARA', uf: 'RJ' }),
      ])

    const r = await getRepresentantesPorUf('SP')
    expect(r.senadores).toHaveLength(1)
    expect(r.deputados).toHaveLength(2)
    expect(r.senadores[0]?.nome).toBe('Sen SP')
    expect(r.deputados.every((d) => d.uf === 'SP')).toBe(true)
  })

  it('exclui parlamentares fora de exercício (afastado/licença/suplência)', async () => {
    await db.insert(parlamentar).values([
      buildParlamentar({
        nome: 'Em Exercício',
        casa: 'CAMARA',
        uf: 'SP',
        situacaoMandato: 'EXERCICIO',
      }),
      buildParlamentar({
        nome: 'Afastado',
        casa: 'CAMARA',
        uf: 'SP',
        situacaoMandato: 'AFASTADO',
      }),
      buildParlamentar({
        nome: 'Suplente',
        casa: 'SENADO',
        uf: 'SP',
        situacaoMandato: 'SUPLENCIA',
      }),
    ])

    const r = await getRepresentantesPorUf('SP')
    expect(r.deputados).toHaveLength(1)
    expect(r.deputados[0]?.nome).toBe('Em Exercício')
    expect(r.senadores).toHaveLength(0)
  })

  it('ordena parlamentares com agregado de alinhamento antes dos sem dado', async () => {
    // 'Ana' vem antes de 'Bruno' no alfabeto, mas só Bruno tem agregado:
    // alinhamento-primeiro deve colocá-lo no topo dentro da casa.
    const ana = buildParlamentar({ nome: 'Ana', casa: 'CAMARA', uf: 'SP' })
    const bruno = buildParlamentar({ nome: 'Bruno', casa: 'CAMARA', uf: 'SP' })
    await db.insert(parlamentar).values([ana, bruno])
    await db.insert(estatisticaParlamentarAgregada).values({
      parlamentarId: bruno.id as string,
      pctAlinhamento: '82.50',
      votacoesAnalisadas: 120,
    })

    const r = await getRepresentantesPorUf('SP')
    expect(r.deputados.map((d) => d.nome)).toEqual(['Bruno', 'Ana'])
    expect(r.deputados[0]?.pctAlinhamento).toBe('82.50')
    expect(r.deputados[1]?.pctAlinhamento).toBeNull()
  })

  it('UF sem parlamentares → listas vazias', async () => {
    const r = await getRepresentantesPorUf('AC')
    expect(r).toEqual({ senadores: [], deputados: [] })
  })
})
