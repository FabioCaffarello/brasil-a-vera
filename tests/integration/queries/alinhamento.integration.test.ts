import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildOrientacao,
  buildVotacao,
  buildVotoNominal,
} from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/alinhamento (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('retorna EMPTY para parlamentar inexistente', async () => {
    const r = await getAlinhamentoParlamentar(
      '00000000-0000-7000-8000-000000000000',
    )
    expect(r.partidoSigla).toBeNull()
    expect(r.percentual).toBeNull()
    expect(r.total).toBe(0)
    expect(r.amostraInsuficiente).toBe(true)
  })

  it('retorna 100% alinhado quando todos os votos batem com orientação', async () => {
    // Sigla não-federada: o caminho de cálculo (ADR-041 curto-circuita federados).
    const p = buildParlamentar({ partidoSigla: 'PL' })
    const v1 = buildVotacao({
      dataHora: new Date('2026-01-01T10:00:00Z'),
    })
    const v2 = buildVotacao({
      dataHora: new Date('2026-02-01T10:00:00Z'),
    })
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values([v1, v2])
    await db.insert(orientacao).values([
      buildOrientacao({
        votacaoId: v1.id as string,
        partidoSigla: 'PL',
        orientacao: 'SIM',
      }),
      buildOrientacao({
        votacaoId: v2.id as string,
        partidoSigla: 'PL',
        orientacao: 'NAO',
      }),
    ])
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v1.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v2.id as string,
        parlamentarId: p.id as string,
        voto: 'NAO',
      }),
    ])

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.partidoSigla).toBe('PL')
    expect(r.percentual).toBe(100)
    expect(r.total).toBe(2)
    expect(r.alinhados).toBe(2)
    expect(r.divergentes).toBe(0)
    expect(r.topDivergencias).toEqual([])
    expect(r.topConvergencias).toHaveLength(2)
  })

  it('retorna 50% alinhado misto', async () => {
    const p = buildParlamentar({ partidoSigla: 'PL' })
    const v1 = buildVotacao({ dataHora: new Date('2026-01-01T10:00:00Z') })
    const v2 = buildVotacao({ dataHora: new Date('2026-02-01T10:00:00Z') })
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values([v1, v2])
    await db.insert(orientacao).values([
      buildOrientacao({
        votacaoId: v1.id as string,
        partidoSigla: 'PL',
        orientacao: 'SIM',
      }),
      buildOrientacao({
        votacaoId: v2.id as string,
        partidoSigla: 'PL',
        orientacao: 'SIM',
      }),
    ])
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v1.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
      buildVotoNominal({
        votacaoId: v2.id as string,
        parlamentarId: p.id as string,
        voto: 'NAO',
      }),
    ])

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.percentual).toBe(50)
    expect(r.alinhados).toBe(1)
    expect(r.divergentes).toBe(1)
  })

  it('ignora LIBERADO e AUSENTE no denominador', async () => {
    const p = buildParlamentar({ partidoSigla: 'MDB' })
    const v1 = buildVotacao({ dataHora: new Date('2026-01-01T10:00:00Z') })
    const v2 = buildVotacao({ dataHora: new Date('2026-02-01T10:00:00Z') })
    const v3 = buildVotacao({ dataHora: new Date('2026-03-01T10:00:00Z') })
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values([v1, v2, v3])
    await db.insert(orientacao).values([
      buildOrientacao({
        votacaoId: v1.id as string,
        partidoSigla: 'MDB',
        orientacao: 'SIM',
      }),
      buildOrientacao({
        votacaoId: v2.id as string,
        partidoSigla: 'MDB',
        orientacao: 'LIBERADO',
      }),
      buildOrientacao({
        votacaoId: v3.id as string,
        partidoSigla: 'MDB',
        orientacao: 'SIM',
      }),
    ])
    await db.insert(votoNominal).values([
      buildVotoNominal({
        votacaoId: v1.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
      // v2: vota SIM mas orientação LIBERADO → ignorado
      buildVotoNominal({
        votacaoId: v2.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
      // v3: AUSENTE → ignorado
      buildVotoNominal({
        votacaoId: v3.id as string,
        parlamentarId: p.id as string,
        voto: 'AUSENTE',
      }),
    ])

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.total).toBe(1)
    expect(r.alinhados).toBe(1)
    expect(r.percentual).toBe(100)
  })

  it('amostraInsuficiente=true quando total < 50', async () => {
    const p = buildParlamentar({ partidoSigla: 'PL' })
    const v = buildVotacao()
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values(v)
    await db.insert(orientacao).values(
      buildOrientacao({
        votacaoId: v.id as string,
        partidoSigla: 'PL',
        orientacao: 'SIM',
      }),
    )
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
    )

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.total).toBe(1)
    expect(r.amostraInsuficiente).toBe(true)
    expect(r.percentual).toBe(100) // ainda calcula, mas UI sinaliza
  })

  it('topDivergencias e topConvergencias respeitam limite 5 e ordem desc(dataHora)', async () => {
    const p = buildParlamentar({ partidoSigla: 'PL' })
    await db.insert(parlamentar).values(p)

    // 7 divergentes e 7 alinhados, datas crescentes; top 5 deve ser os 5 mais recentes
    const votacoes = Array.from({ length: 14 }, (_, i) =>
      buildVotacao({
        descricao: `V${i}`,
        dataHora: new Date(
          `2026-${String((i % 12) + 1).padStart(2, '0')}-01T10:00:00Z`,
        ),
      }),
    )
    await db.insert(votacao).values(votacoes)
    await db.insert(orientacao).values(
      votacoes.map((v, i) =>
        buildOrientacao({
          votacaoId: v.id as string,
          partidoSigla: 'PL',
          orientacao: i < 7 ? 'SIM' : 'NAO',
        }),
      ),
    )
    await db.insert(votoNominal).values(
      votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p.id as string,
          voto: i < 7 ? 'NAO' : 'NAO', // divergente nos 7 primeiros, alinhado nos 7 últimos
        }),
      ),
    )

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.topDivergencias).toHaveLength(5)
    expect(r.topConvergencias).toHaveLength(5)
    expect(r.total).toBe(14)
  })

  it('ignora orientação de outro partido', async () => {
    const p = buildParlamentar({ partidoSigla: 'MDB' })
    const v = buildVotacao()
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values(v)
    // Orientação apenas para PL (não MDB) — ambos não-federados, então o
    // total=0 vem do filtro do join, não do short-circuit de federação.
    await db.insert(orientacao).values(
      buildOrientacao({
        votacaoId: v.id as string,
        partidoSigla: 'PL',
        orientacao: 'SIM',
      }),
    )
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
    )

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.partidoSigla).toBe('MDB')
    expect(r.total).toBe(0) // não há orientação do MDB
    expect(r.emFederacao).toBe(false)
  })

  it('curto-circuita partido federado: sinaliza sem calcular (ADR-041)', async () => {
    // PT integra a Federação Brasil da Esperança. Mesmo havendo orientação 'PT'
    // e voto que casaria, o alinhamento partidário NÃO é calculado — a Câmara
    // publica orientação pela federação, não pela sigla. Ver #480.
    const p = buildParlamentar({ partidoSigla: 'PT' })
    const v = buildVotacao()
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values(v)
    await db.insert(orientacao).values(
      buildOrientacao({
        votacaoId: v.id as string,
        partidoSigla: 'PT',
        orientacao: 'SIM',
      }),
    )
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: p.id as string,
        voto: 'SIM',
      }),
    )

    const r = await getAlinhamentoParlamentar(p.id as string)
    expect(r.emFederacao).toBe(true)
    expect(r.federacaoNome).toContain('Esperança')
    expect(r.partidoSigla).toBe('PT')
    // Suprimido por construção, apesar do match 'PT' existente no banco.
    expect(r.percentual).toBeNull()
    expect(r.total).toBe(0)
    expect(r.topConvergencias).toEqual([])
  })
})
