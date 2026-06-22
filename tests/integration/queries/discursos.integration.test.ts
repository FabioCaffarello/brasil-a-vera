import { uuidv7 } from 'uuidv7'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getDiscursosParlamentar } from '@/lib/queries/discursos'
import { discurso } from '@/modules/discursos/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

function buildDiscurso(args: {
  parlamentarId: string
  data: Date
  tipo?: string
  sumario?: string | null
  keywords?: string | null
  urlTexto?: string | null
}) {
  return {
    id: uuidv7(),
    parlamentarId: args.parlamentarId,
    casa: 'CAMARA' as const,
    data: args.data,
    tipo: args.tipo ?? 'PRONUNCIAMENTO',
    sumario: args.sumario ?? 'Sumário',
    keywords: args.keywords ?? null,
    urlTexto: args.urlTexto ?? null,
    trustLevel: 'L1' as const,
  }
}

describe('queries/discursos (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('agrega temas e lista recentes em ordem (ADR-048)', async () => {
    const p = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values(p)
    const pid = p.id as string

    await db.insert(discurso).values([
      buildDiscurso({
        parlamentarId: pid,
        data: new Date('2026-06-01T10:00:00Z'),
        keywords: 'Saúde, Educação',
        sumario: 'Fala recente',
        urlTexto: 'https://example.test/d1',
      }),
      buildDiscurso({
        parlamentarId: pid,
        data: new Date('2026-03-01T10:00:00Z'),
        keywords: 'Saúde',
        urlTexto: null,
      }),
      buildDiscurso({
        parlamentarId: pid,
        data: new Date('2026-01-01T10:00:00Z'),
        keywords: 'Economia',
      }),
    ])

    const r = await getDiscursosParlamentar(pid)
    expect(r.total).toBe(3)
    expect(r.temas).toEqual([
      { termo: 'Saúde', count: 2 },
      { termo: 'Economia', count: 1 },
      { termo: 'Educação', count: 1 },
    ])
    // Recentes em ordem decrescente de data.
    expect(r.recentes[0]?.sumario).toBe('Fala recente')
    expect(r.recentes[0]?.urlTexto).toBe('https://example.test/d1')
    expect(r.recentes).toHaveLength(3)
  })

  it('parlamentar sem discursos → vazio', async () => {
    const r = await getDiscursosParlamentar(
      '00000000-0000-7000-8000-000000000000',
    )
    expect(r).toEqual({ total: 0, temas: [], recentes: [] })
  })
})
