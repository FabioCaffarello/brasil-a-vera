import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getTema, getTemas } from '@/lib/queries/temas'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
} from '@/modules/proposicoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildProposicao,
  buildProposicaoAutor,
  buildProposicaoTema,
} from '../fixtures/proposicoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/temas (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  async function seed() {
    const a = buildParlamentar({ nome: 'Autor A' })
    await db.insert(parlamentar).values(a)
    const p1 = buildProposicao({ numero: 1, ano: 2025 })
    const p2 = buildProposicao({ numero: 2, ano: 2026 })
    const p3 = buildProposicao({ numero: 3, ano: 2026 })
    await db.insert(proposicao).values([p1, p2, p3])
    await db.insert(proposicaoTema).values([
      buildProposicaoTema({
        proposicaoId: p1.id as string,
        codigoTema: 1,
        nomeTema: 'Saúde',
      }),
      buildProposicaoTema({
        proposicaoId: p2.id as string,
        codigoTema: 1,
        nomeTema: 'Saúde',
      }),
      buildProposicaoTema({
        proposicaoId: p3.id as string,
        codigoTema: 2,
        nomeTema: 'Educação',
      }),
    ])
    await db.insert(proposicaoAutor).values([
      buildProposicaoAutor({
        proposicaoId: p1.id as string,
        parlamentarId: a.id as string,
        nome: 'Autor A',
      }),
      buildProposicaoAutor({
        proposicaoId: p2.id as string,
        parlamentarId: a.id as string,
        nome: 'Autor A',
      }),
      buildProposicaoAutor({
        proposicaoId: p3.id as string,
        parlamentarId: a.id as string,
        nome: 'Autor A',
      }),
    ])
    return { autorId: a.id as string }
  }

  it('getTemas lista temas com contagem, ordenado desc', async () => {
    await seed()
    const temas = await getTemas()
    expect(temas).toEqual([
      { codigo: 1, nome: 'Saúde', proposicoes: 2 },
      { codigo: 2, nome: 'Educação', proposicoes: 1 },
    ])
  })

  it('getTema agrega autores e proposições do tema', async () => {
    const { autorId } = await seed()
    const t = await getTema(1)
    expect(t?.nome).toBe('Saúde')
    expect(t?.total).toBe(2)
    expect(t?.parlamentares).toHaveLength(1)
    expect(t?.parlamentares[0]?.id).toBe(autorId)
    expect(t?.parlamentares[0]?.proposicoes).toBe(2)
    expect(t?.proposicoes).toHaveLength(2)
    expect(t?.proposicoes[0]?.ano).toBe(2026) // mais recente primeiro
  })

  it('getTema inexistente → null', async () => {
    await seed()
    expect(await getTema(999)).toBeNull()
  })
})
