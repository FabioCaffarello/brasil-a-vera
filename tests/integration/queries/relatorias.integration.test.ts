import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getRelatorAutoria,
  getRelatoriasInfluencia,
} from '@/lib/queries/relatorias'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  relatoria,
} from '@/modules/proposicoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildProposicao,
  buildProposicaoAutor,
  buildRelatoria,
} from '../fixtures/proposicoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

// Cenário (ADR-044): o relator R relatou P1 e P2.
//   P1 autores: A1 (PL), A2 (PT), + um autor externo (Comissão, sem parlamentar)
//   P2 autores: A3 (PL)
// Influência: R relatou 2. Autoria: PL=2 (A1,A3), PT=1 (A2); externo NÃO conta.
async function seedRelatorias() {
  const r = buildParlamentar({ nome: 'Relator R', partidoSigla: 'MDB' })
  const a1 = buildParlamentar({ nome: 'A1', partidoSigla: 'PL' })
  const a2 = buildParlamentar({ nome: 'A2', partidoSigla: 'PT' })
  const a3 = buildParlamentar({ nome: 'A3', partidoSigla: 'PL' })
  await db.insert(parlamentar).values([r, a1, a2, a3])

  const p1 = buildProposicao({ numero: 1, ano: 2025 })
  const p2 = buildProposicao({ numero: 2, ano: 2026 })
  await db.insert(proposicao).values([p1, p2])

  await db.insert(proposicaoAutor).values([
    buildProposicaoAutor({
      proposicaoId: p1.id as string,
      parlamentarId: a1.id as string,
      nome: 'A1',
    }),
    buildProposicaoAutor({
      proposicaoId: p1.id as string,
      parlamentarId: a2.id as string,
      nome: 'A2',
    }),
    // Autor externo (Comissão) — parlamentar_id null, deve ficar de fora.
    {
      proposicaoId: p1.id as string,
      parlamentarId: null,
      nome: 'Comissão de Constituição e Justiça',
      tipoAutoria: 'AUTOR',
    },
    buildProposicaoAutor({
      proposicaoId: p2.id as string,
      parlamentarId: a3.id as string,
      nome: 'A3',
    }),
  ])

  await db.insert(relatoria).values([
    buildRelatoria({
      proposicaoId: p1.id as string,
      parlamentarId: r.id as string,
    }),
    buildRelatoria({
      proposicaoId: p2.id as string,
      parlamentarId: r.id as string,
    }),
  ])

  return { relatorId: r.id as string }
}

describe('queries/relatorias (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('getRelatoriasInfluencia conta as relatorias e lista as mais recentes', async () => {
    const { relatorId } = await seedRelatorias()
    const r = await getRelatoriasInfluencia(relatorId)
    expect(r.total).toBe(2)
    // Ordenado por ano desc → P2 (2026) primeiro.
    expect(r.recentes[0]?.ano).toBe(2026)
    expect(r.recentes.map((p) => p.numero)).toEqual([2, 1])
  })

  it('getRelatorAutoria agrega o partido dos autores; externo fica de fora', async () => {
    const { relatorId } = await seedRelatorias()
    const d = await getRelatorAutoria(relatorId)
    expect(d.total).toBe(3) // A1, A2, A3 — autor externo excluído
    expect(d.distribuicao).toEqual([
      { partido: 'PL', count: 2, pct: 67 },
      { partido: 'PT', count: 1, pct: 33 },
    ])
  })

  it('parlamentar sem relatorias → vazio', async () => {
    const r = await getRelatoriasInfluencia(
      '00000000-0000-7000-8000-000000000000',
    )
    expect(r.total).toBe(0)
    expect(r.recentes).toEqual([])
    const d = await getRelatorAutoria('00000000-0000-7000-8000-000000000000')
    expect(d).toEqual({ total: 0, distribuicao: [] })
  })

  it('bicameral: uma matéria tem relator na Câmara E no Senado (emenda 2026-06-21)', async () => {
    const dep = buildParlamentar({ nome: 'Dep', casa: 'CAMARA' })
    const sen = buildParlamentar({ nome: 'Sen', casa: 'SENADO' })
    const p = buildProposicao({ numero: 7, ano: 2026 })
    await db.insert(parlamentar).values([dep, sen])
    await db.insert(proposicao).values(p)

    // Mesma proposição, um relator por casa — não viola o único (proposicao,casa).
    await db.insert(relatoria).values([
      buildRelatoria({
        proposicaoId: p.id as string,
        casa: 'CAMARA',
        parlamentarId: dep.id as string,
      }),
      buildRelatoria({
        proposicaoId: p.id as string,
        casa: 'SENADO',
        parlamentarId: sen.id as string,
        designadoEm: '2026-05-01',
      }),
    ])

    const rDep = await getRelatoriasInfluencia(dep.id as string)
    const rSen = await getRelatoriasInfluencia(sen.id as string)
    expect(rDep.total).toBe(1)
    expect(rSen.total).toBe(1)
  })
})
