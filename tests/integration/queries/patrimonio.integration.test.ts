import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getEvolucaoPatrimonial,
  getPatrimonioSnapshot,
} from '@/lib/queries/patrimonio'
import {
  tseBemCandidato,
  tseCandidatura,
} from '@/modules/eleitoral/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildTseBem, buildTseCandidatura } from '../fixtures/patrimonio'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/patrimonio (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('null quando o parlamentar não tem candidatura vinculada', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    // Candidatura existe mas NÃO vinculada (parlamentarId null) + bens.
    const cand = buildTseCandidatura({
      sqCandidato: 900001,
      parlamentarId: null,
    })
    await db.insert(tseCandidatura).values(cand)
    await db
      .insert(tseBemCandidato)
      .values(buildTseBem({ sqCandidato: 900001, valorDeclarado: '50000.00' }))

    expect(await getPatrimonioSnapshot(p.id as string)).toBeNull()
  })

  it('agrega total + composição por categoria do parlamentar vinculado', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)

    const cand = buildTseCandidatura({
      sqCandidato: 900002,
      parlamentarId: p.id as string,
    })
    await db.insert(tseCandidatura).values(cand)

    await db.insert(tseBemCandidato).values([
      buildTseBem({
        sqCandidato: 900002,
        nrOrdemBem: 1,
        cdTipoBem: 12,
        dsTipoBem: 'Casa',
        valorDeclarado: '750000.00',
        dtUltAtualizacao: '2022-12-14',
      }),
      buildTseBem({
        sqCandidato: 900002,
        nrOrdemBem: 2,
        cdTipoBem: 21,
        dsTipoBem: 'Veículo',
        valorDeclarado: '150000.00',
        dtUltAtualizacao: '2023-10-25',
      }),
      buildTseBem({
        sqCandidato: 900002,
        nrOrdemBem: 3,
        cdTipoBem: 21,
        dsTipoBem: 'Veículo',
        valorDeclarado: '100000.00',
        dtUltAtualizacao: null,
      }),
    ])

    const snap = await getPatrimonioSnapshot(p.id as string)
    expect(snap).not.toBeNull()
    expect(snap?.total).toBe('1000000.00')
    expect(snap?.nBens).toBe(3)
    expect(snap?.dtUltAtualizacao).toBe('2023-10-25')
    expect(snap?.categorias).toHaveLength(2)
    // Casa (750k, 75%) antes de Veículo (250k agregado, 25%).
    expect(snap?.categorias[0]?.dsTipoBem).toBe('Casa')
    expect(snap?.categorias[0]?.pct).toBe(75)
    expect(snap?.categorias[1]?.dsTipoBem).toBe('Veículo')
    expect(snap?.categorias[1]?.n).toBe(2)
    expect(snap?.categorias[1]?.pct).toBe(25)
  })

  it('ignora bens de outra candidatura não-vinculada (INNER JOIN por parlamentar_id)', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)

    const minha = buildTseCandidatura({
      sqCandidato: 900003,
      parlamentarId: p.id as string,
    })
    const outra = buildTseCandidatura({
      sqCandidato: 900004,
      parlamentarId: null,
    })
    await db.insert(tseCandidatura).values([minha, outra])

    await db.insert(tseBemCandidato).values([
      buildTseBem({
        sqCandidato: 900003,
        nrOrdemBem: 1,
        valorDeclarado: '10.00',
      }),
      buildTseBem({
        sqCandidato: 900004,
        nrOrdemBem: 1,
        valorDeclarado: '99999.00',
      }),
    ])

    const snap = await getPatrimonioSnapshot(p.id as string)
    expect(snap?.total).toBe('10.00')
    expect(snap?.nBens).toBe(1)
  })

  it('evolução: null com 1 pleito; pontos+deltas com ≥2 pleitos vinculados', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)

    // Só 2022 → sem evolução.
    const c2022 = buildTseCandidatura({
      anoEleicao: 2022,
      sqCandidato: 920221,
      parlamentarId: p.id as string,
    })
    await db.insert(tseCandidatura).values(c2022)
    await db.insert(tseBemCandidato).values(
      buildTseBem({
        anoEleicao: 2022,
        sqCandidato: 920221,
        nrOrdemBem: 1,
        valorDeclarado: '1269.28',
      }),
    )
    expect(await getEvolucaoPatrimonial(p.id as string)).toBeNull()

    // Adiciona 2018 → agora há evolução (2 pontos).
    const c2018 = buildTseCandidatura({
      anoEleicao: 2018,
      sqCandidato: 920181,
      parlamentarId: p.id as string,
    })
    await db.insert(tseCandidatura).values(c2018)
    await db.insert(tseBemCandidato).values(
      buildTseBem({
        anoEleicao: 2018,
        sqCandidato: 920181,
        nrOrdemBem: 1,
        valorDeclarado: '1000.00',
      }),
    )

    const ev = await getEvolucaoPatrimonial(p.id as string)
    expect(ev?.pontos.map((pt) => pt.ano)).toEqual([2018, 2022])
    // 2018: 1000 nominal → 1269.28 corrigido (dez/2022). 2022: 1269.28 (base).
    expect(ev?.pontos[0]?.totalCorrigido).toBe('1269.28')
    expect(ev?.pontos[1]?.totalCorrigido).toBe('1269.28')
    // Mesmo poder de compra → delta corrigido ~0.
    expect(ev?.deltas).toHaveLength(1)
    expect(ev?.deltas[0]?.deltaCorrigido).toBe('0.00')
  })

  it('evolução ignora candidatura não-vinculada', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const minha2018 = buildTseCandidatura({
      anoEleicao: 2018,
      sqCandidato: 930181,
      parlamentarId: p.id as string,
    })
    const outra2014 = buildTseCandidatura({
      anoEleicao: 2014,
      sqCandidato: 930141,
      parlamentarId: null,
    })
    await db.insert(tseCandidatura).values([minha2018, outra2014])
    await db
      .insert(tseBemCandidato)
      .values([
        buildTseBem({ anoEleicao: 2018, sqCandidato: 930181, nrOrdemBem: 1 }),
        buildTseBem({ anoEleicao: 2014, sqCandidato: 930141, nrOrdemBem: 1 }),
      ])
    // Só 1 pleito vinculado (2018) → sem evolução.
    expect(await getEvolucaoPatrimonial(p.id as string)).toBeNull()
  })
})
