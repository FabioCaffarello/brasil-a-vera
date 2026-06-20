import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getFidelidadeBancada,
  getFidelidadeOrientacao,
  getTimelineMigracao,
} from '@/lib/queries/fidelidade'
import {
  filiacaoPartidaria,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { buildFiliacao, buildParlamentar } from '../fixtures/parlamentares'
import {
  buildOrientacao,
  buildVotacao,
  buildVotoNominal,
} from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

// Cenário de troca de partido (ADR-043 D3): P estava no PARTIDO_A em 2024 e
// migrou para o PARTIDO_B em 2025. A fidelidade de cada voto é medida contra o
// partido VIGENTE NA DATA do voto, não contra o atual.
//
//   v1 (2024-06): P no A. Bancada A = {P(NAO), A1(SIM), A2(SIM)} → maioria SIM,
//                 quórum ok (3/3). P=NAO → DIVERGENTE.
//   v2 (2025-06): P no B. Bancada B = {P(SIM), B1(SIM), B2(NAO)} → maioria SIM,
//                 quórum ok. P=SIM → ALINHADO.
//   v3 (2025-07): P no B. Só P registra voto válido (B1 abstém, B2 ausente) →
//                 quórum não atingido (1*2 < 3) → INDEFINIDA → IGNORADO.
async function seedTrocaDePartido() {
  const p = buildParlamentar({ nome: 'P Trocou', partidoSigla: 'PB' })
  const a1 = buildParlamentar({ nome: 'A1', partidoSigla: 'PA' })
  const a2 = buildParlamentar({ nome: 'A2', partidoSigla: 'PA' })
  const b1 = buildParlamentar({ nome: 'B1', partidoSigla: 'PB' })
  const b2 = buildParlamentar({ nome: 'B2', partidoSigla: 'PB' })
  await db.insert(parlamentar).values([p, a1, a2, b1, b2])

  const pid = p.id as string
  await db.insert(filiacaoPartidaria).values([
    buildFiliacao({
      parlamentarId: pid,
      partidoSigla: 'PA',
      dataInicio: '2024-01-01',
      dataFim: '2024-12-31',
    }),
    buildFiliacao({
      parlamentarId: pid,
      partidoSigla: 'PB',
      dataInicio: '2025-01-01',
      dataFim: null,
    }),
    buildFiliacao({
      parlamentarId: a1.id as string,
      partidoSigla: 'PA',
      dataInicio: '2024-01-01',
    }),
    buildFiliacao({
      parlamentarId: a2.id as string,
      partidoSigla: 'PA',
      dataInicio: '2024-01-01',
    }),
    buildFiliacao({
      parlamentarId: b1.id as string,
      partidoSigla: 'PB',
      dataInicio: '2025-01-01',
    }),
    buildFiliacao({
      parlamentarId: b2.id as string,
      partidoSigla: 'PB',
      dataInicio: '2025-01-01',
    }),
  ])

  const v1 = buildVotacao({ dataHora: new Date('2024-06-01T12:00:00Z') })
  const v2 = buildVotacao({ dataHora: new Date('2025-06-01T12:00:00Z') })
  const v3 = buildVotacao({ dataHora: new Date('2025-07-01T12:00:00Z') })
  await db.insert(votacao).values([v1, v2, v3])

  const v1id = v1.id as string
  const v2id = v2.id as string
  const v3id = v3.id as string
  await db.insert(votoNominal).values([
    buildVotoNominal({ votacaoId: v1id, parlamentarId: pid, voto: 'NAO' }),
    buildVotoNominal({
      votacaoId: v1id,
      parlamentarId: a1.id as string,
      voto: 'SIM',
    }),
    buildVotoNominal({
      votacaoId: v1id,
      parlamentarId: a2.id as string,
      voto: 'SIM',
    }),
    buildVotoNominal({ votacaoId: v2id, parlamentarId: pid, voto: 'SIM' }),
    buildVotoNominal({
      votacaoId: v2id,
      parlamentarId: b1.id as string,
      voto: 'SIM',
    }),
    buildVotoNominal({
      votacaoId: v2id,
      parlamentarId: b2.id as string,
      voto: 'NAO',
    }),
    buildVotoNominal({ votacaoId: v3id, parlamentarId: pid, voto: 'SIM' }),
    buildVotoNominal({
      votacaoId: v3id,
      parlamentarId: b1.id as string,
      voto: 'ABSTENCAO',
    }),
    buildVotoNominal({
      votacaoId: v3id,
      parlamentarId: b2.id as string,
      voto: 'AUSENTE',
    }),
  ])

  // Orientação da liderança do partido VIGENTE em cada data (as-of).
  await db.insert(orientacao).values([
    buildOrientacao({
      votacaoId: v1id,
      partidoSigla: 'PA',
      orientacao: 'SIM',
    }),
    buildOrientacao({
      votacaoId: v2id,
      partidoSigla: 'PB',
      orientacao: 'SIM',
    }),
    buildOrientacao({
      votacaoId: v3id,
      partidoSigla: 'PB',
      orientacao: 'SIM',
    }),
  ])

  return { pid }
}

describe('queries/fidelidade (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('getFidelidadeBancada: usa o partido as-of e respeita quórum (ADR-043 D1/D3)', async () => {
    const { pid } = await seedTrocaDePartido()
    const r = await getFidelidadeBancada(pid)

    // v3 cai fora (sem quórum). v1 divergente, v2 alinhado.
    expect(r.stats.total).toBe(2)
    expect(r.stats.alinhados).toBe(1)
    expect(r.stats.divergentes).toBe(1)
    expect(r.stats.percentual).toBe(50)
    expect(r.amostraInsuficiente).toBe(true) // 2 < 50

    expect(r.topDivergencias).toHaveLength(1)
    expect(r.topDivergencias[0]?.party).toBe('PA') // as-of em 2024
    expect(r.topConvergencias).toHaveLength(1)
    expect(r.topConvergencias[0]?.party).toBe('PB') // as-of em 2025
  })

  it('getFidelidadeBancada: EMPTY para parlamentar inexistente', async () => {
    const r = await getFidelidadeBancada('00000000-0000-7000-8000-000000000000')
    expect(r.stats.total).toBe(0)
    expect(r.stats.percentual).toBeNull()
    expect(r.topDivergencias).toEqual([])
  })

  it('getFidelidadeOrientacao: casa orientação pelo partido as-of, não pelo atual', async () => {
    const { pid } = await seedTrocaDePartido()
    const r = await getFidelidadeOrientacao(pid)

    // v1 casa com orientação do PA (partido de P em 2024), apesar de P estar
    // hoje no PB — prova a reconstrução as-of. v1 divergente, v2/v3 alinhados.
    expect(r.stats.total).toBe(3)
    expect(r.stats.alinhados).toBe(2)
    expect(r.stats.divergentes).toBe(1)
    expect(r.stats.percentual).toBe(67)
    expect(r.topDivergencias[0]?.party).toBe('PA')
    expect(r.topDivergencias[0]?.orientacao).toBe('SIM')
  })

  it('getTimelineMigracao: ordena períodos e conta a troca', async () => {
    const { pid } = await seedTrocaDePartido()
    const t = await getTimelineMigracao(pid)
    expect(t.periodos.map((p) => p.partidoSigla)).toEqual(['PA', 'PB'])
    expect(t.trocas).toBe(1)
  })

  it('getFidelidadeBancada: ignora votação em data sem filiação (lacuna, fail-closed)', async () => {
    const p = buildParlamentar({ partidoSigla: 'PA' })
    await db.insert(parlamentar).values(p)
    const pid = p.id as string
    // Filiação só a partir de 2025; voto em 2024 fica sem cobertura.
    await db.insert(filiacaoPartidaria).values(
      buildFiliacao({
        parlamentarId: pid,
        partidoSigla: 'PA',
        dataInicio: '2025-01-01',
      }),
    )
    const v = buildVotacao({ dataHora: new Date('2024-06-01T12:00:00Z') })
    await db.insert(votacao).values(v)
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: pid,
        voto: 'SIM',
      }),
    )

    const r = await getFidelidadeBancada(pid)
    expect(r.stats.total).toBe(0)
  })
})
