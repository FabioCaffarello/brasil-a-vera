import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/recomendacoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('UF nula → lista vazia (sem tocar o banco)', async () => {
    const r = await listRecomendacoesByUf({
      uf: null,
      excludeParlamentarIds: [],
    })
    expect(r).toEqual([])
  })

  it('exclui os parlamentares já acompanhados e respeita o limit', async () => {
    const ja = buildParlamentar({
      nome: 'Acompanhado',
      casa: 'CAMARA',
      uf: 'SP',
    })
    const a = buildParlamentar({ nome: 'Bia', casa: 'CAMARA', uf: 'SP' })
    const b = buildParlamentar({ nome: 'Caio', casa: 'CAMARA', uf: 'SP' })
    await db.insert(parlamentar).values([ja, a, b])

    const r = await listRecomendacoesByUf({
      uf: 'SP',
      excludeParlamentarIds: [ja.id as string],
      limit: 1,
    })
    expect(r).toHaveLength(1)
    expect(r.map((p) => p.id)).not.toContain(ja.id)
  })

  it('só inclui parlamentares em exercício da UF pedida', async () => {
    await db.insert(parlamentar).values([
      buildParlamentar({ nome: 'SP Exerc', casa: 'CAMARA', uf: 'SP' }),
      buildParlamentar({
        nome: 'SP Afastado',
        casa: 'CAMARA',
        uf: 'SP',
        situacaoMandato: 'AFASTADO',
      }),
      buildParlamentar({ nome: 'RJ Exerc', casa: 'CAMARA', uf: 'RJ' }),
    ])

    const r = await listRecomendacoesByUf({
      uf: 'SP',
      excludeParlamentarIds: [],
    })
    expect(r.map((p) => p.nome)).toEqual(['SP Exerc'])
  })
})
