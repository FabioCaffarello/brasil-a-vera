import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getRepresentantesPorUf } from '@/lib/queries/representantes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
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

  it('UF sem parlamentares → listas vazias', async () => {
    const r = await getRepresentantesPorUf('AC')
    expect(r).toEqual({ senadores: [], deputados: [] })
  })
})
