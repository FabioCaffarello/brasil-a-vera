import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getPresencaFisica } from '@/lib/queries/presenca-fisica'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { presencaSessao, sessao } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildPresencaSessao, buildSessao } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/presenca-fisica (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('conta sessões presentes/elegíveis na janela; ausência no meio conta (ADR-046)', async () => {
    const d = buildParlamentar({ casa: 'CAMARA' })
    const e = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values([d, e])

    const s1 = buildSessao({ dataHora: new Date('2026-01-01T12:00:00Z') })
    const s2 = buildSessao({ dataHora: new Date('2026-02-01T12:00:00Z') })
    const s3 = buildSessao({ dataHora: new Date('2026-03-01T12:00:00Z') })
    await db.insert(sessao).values([s1, s2, s3])

    // D presente em s1 e s3 (ausente em s2, no meio da janela). E em todas.
    await db.insert(presencaSessao).values([
      buildPresencaSessao({
        sessaoId: s1.id as string,
        parlamentarId: d.id as string,
      }),
      buildPresencaSessao({
        sessaoId: s3.id as string,
        parlamentarId: d.id as string,
      }),
      buildPresencaSessao({
        sessaoId: s1.id as string,
        parlamentarId: e.id as string,
      }),
      buildPresencaSessao({
        sessaoId: s2.id as string,
        parlamentarId: e.id as string,
      }),
      buildPresencaSessao({
        sessaoId: s3.id as string,
        parlamentarId: e.id as string,
      }),
    ])

    const r = await getPresencaFisica(d.id as string)
    expect(r.elegiveis).toBe(3) // s1..s3 (janela cobre s1→s3)
    expect(r.presentes).toBe(2)
    expect(r.ausencias).toBe(1)
    expect(r.percentual).toBe(67)
  })

  it('só conta sessões da casa do parlamentar', async () => {
    const dep = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values(dep)
    const sCam = buildSessao({
      casa: 'CAMARA',
      dataHora: new Date('2026-01-01T12:00:00Z'),
    })
    const sSen = buildSessao({
      casa: 'SENADO',
      dataHora: new Date('2026-01-01T12:00:00Z'),
    })
    await db.insert(sessao).values([sCam, sSen])
    await db.insert(presencaSessao).values(
      buildPresencaSessao({
        sessaoId: sCam.id as string,
        parlamentarId: dep.id as string,
      }),
    )

    const r = await getPresencaFisica(dep.id as string)
    expect(r.elegiveis).toBe(1) // só a sessão da Câmara
    expect(r.percentual).toBe(100)
  })

  it('sem participação → elegiveis 0, percentual null', async () => {
    const r = await getPresencaFisica('00000000-0000-7000-8000-000000000000')
    expect(r.elegiveis).toBe(0)
    expect(r.percentual).toBeNull()
  })
})
