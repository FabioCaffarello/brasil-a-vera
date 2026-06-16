import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getPatrimonioSnapshot } from '@/lib/queries/patrimonio'
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
})
