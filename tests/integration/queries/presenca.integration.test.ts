import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getPresencaPlenario,
  getPresencaPlenarioBatch,
} from '@/lib/queries/presenca'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildVotacao, buildVotoNominal } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/presenca (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('Câmara: ausência no meio da janela conta; comissão fica de fora (ADR-045)', async () => {
    const d = buildParlamentar({ nome: 'Dep', casa: 'CAMARA' })
    const e = buildParlamentar({ nome: 'Outro', casa: 'CAMARA' })
    await db.insert(parlamentar).values([d, e])

    const v1 = buildVotacao({ dataHora: new Date('2026-01-01T12:00:00Z') })
    const v2 = buildVotacao({ dataHora: new Date('2026-02-01T12:00:00Z') })
    const v3 = buildVotacao({ dataHora: new Date('2026-03-01T12:00:00Z') })
    const v4 = buildVotacao({ dataHora: new Date('2026-04-01T12:00:00Z') })
    // Votação de comissão dentro da janela — deve ser ignorada (não-plenário).
    const vc = buildVotacao({
      orgao: 'CCJC',
      dataHora: new Date('2026-02-15T12:00:00Z'),
    })
    await db.insert(votacao).values([v1, v2, v3, v4, vc])

    // E vota em todas as plenárias → são nominais de plenário.
    await db.insert(votoNominal).values(
      [v1, v2, v3, v4].map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: e.id as string,
          voto: 'SIM',
        }),
      ),
    )
    // D: presente em v1, v3, v4; AUSENTE no meio (v2, sem linha); vota na comissão.
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v1.id as string,
        parlamentarId: d.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v3.id as string,
        parlamentarId: d.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v4.id as string,
        parlamentarId: d.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: vc.id as string,
        parlamentarId: d.id as string,
        voto: 'SIM',
      }),
    ])

    const r = await getPresencaPlenario(d.id as string)
    expect(r.elegiveis).toBe(4) // v1..v4; comissão fora
    expect(r.presentes).toBe(3)
    expect(r.ausencias).toBe(1) // v2
    expect(r.percentual).toBe(75)
  })

  it('não conta votações de plenário ANTES da primeira participação (janela)', async () => {
    const d = buildParlamentar({ casa: 'CAMARA' })
    const e = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values([d, e])

    const antiga = buildVotacao({ dataHora: new Date('2025-01-01T12:00:00Z') })
    const nova = buildVotacao({ dataHora: new Date('2026-01-01T12:00:00Z') })
    await db.insert(votacao).values([antiga, nova])
    // Ambas nominais (E vota nas duas).
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: antiga.id as string,
        parlamentarId: e.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: nova.id as string,
        parlamentarId: e.id as string,
        voto: 'SIM',
      }),
      // D só aparece na nova → janela começa nela; a antiga não conta.
      buildVotoNominal({
        votacaoId: nova.id as string,
        parlamentarId: d.id as string,
        voto: 'SIM',
      }),
    ])

    const r = await getPresencaPlenario(d.id as string)
    expect(r.elegiveis).toBe(1) // só a nova (a antiga é pré-janela)
    expect(r.presentes).toBe(1)
    expect(r.percentual).toBe(100)
  })

  it('Senado: voto AUSENTE explícito conta como ausência', async () => {
    const s = buildParlamentar({ casa: 'SENADO' })
    const outro = buildParlamentar({ casa: 'SENADO' })
    await db.insert(parlamentar).values([s, outro])

    const v1 = buildVotacao({
      casa: 'SENADO',
      dataHora: new Date('2026-01-01T12:00:00Z'),
    })
    const v2 = buildVotacao({
      casa: 'SENADO',
      dataHora: new Date('2026-02-01T12:00:00Z'),
    })
    await db.insert(votacao).values([v1, v2])
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v1.id as string,
        parlamentarId: s.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v2.id as string,
        parlamentarId: s.id as string,
        voto: 'AUSENTE',
      }),
      buildVotoNominal({
        votacaoId: v2.id as string,
        parlamentarId: outro.id as string,
        voto: 'SIM',
      }),
    ])

    const r = await getPresencaPlenario(s.id as string)
    expect(r.elegiveis).toBe(2)
    expect(r.presentes).toBe(1) // v2 é AUSENTE
    expect(r.percentual).toBe(50)
  })

  it('sem votos → elegiveis 0, percentual null', async () => {
    const r = await getPresencaPlenario('00000000-0000-7000-8000-000000000000')
    expect(r.elegiveis).toBe(0)
    expect(r.percentual).toBeNull()
  })

  it('batch retorna um resultado por parlamentar', async () => {
    const a = buildParlamentar({ casa: 'CAMARA' })
    const b = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values([a, b])
    const v = buildVotacao({ dataHora: new Date('2026-01-01T12:00:00Z') })
    await db.insert(votacao).values(v)
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: a.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: b.id as string,
        voto: 'SIM',
      }),
    ])

    const map = await getPresencaPlenarioBatch([a.id as string, b.id as string])
    expect(map.size).toBe(2)
    expect(map.get(a.id as string)?.percentual).toBe(100)
    expect(map.get(b.id as string)?.percentual).toBe(100)
  })
})
