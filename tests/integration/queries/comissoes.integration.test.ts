import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getComissoesParlamentar } from '@/lib/queries/comissoes'
import {
  membroComissao,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import {
  buildMembroComissao,
  buildParlamentar,
} from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/comissoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('separa ativa (data_fim null) do histórico encerrado no mandato', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    await db.insert(membroComissao).values([
      buildMembroComissao({
        parlamentarId: p.id as string,
        comissaoSigla: 'CCJC',
        comissaoSourceId: 'o1',
        dataFim: null,
      }),
      buildMembroComissao({
        parlamentarId: p.id as string,
        comissaoSigla: 'CVT',
        comissaoSourceId: 'o2',
        dataInicio: '2023-09-05',
        dataFim: '2023-11-21',
      }),
    ])

    const view = await getComissoesParlamentar(p.id as string)
    expect(view.ativas.map((a) => a.sigla)).toEqual(['CCJC'])
    expect(view.totalHistoricas).toBe(1)
    expect(view.historicasSiglas).toEqual(['CVT'])
  })

  it('exclui comissão encerrada antes do mandato (history all-time do Senado)', async () => {
    const p = buildParlamentar({ casa: 'SENADO', uf: 'BA' })
    await db.insert(parlamentar).values(p)
    await db.insert(membroComissao).values([
      // Vínculo antigo (mandato anterior) — deve sumir no escopo da leg.57.
      buildMembroComissao({
        parlamentarId: p.id as string,
        comissaoSigla: 'CAE',
        comissaoSourceId: 'o1',
        dataInicio: '2015-03-01',
        dataFim: '2018-12-31',
      }),
      // Encerrado dentro do mandato corrente — deve aparecer.
      buildMembroComissao({
        parlamentarId: p.id as string,
        comissaoSigla: 'CCJ',
        comissaoSourceId: 'o2',
        dataInicio: '2023-04-01',
        dataFim: '2024-02-01',
      }),
    ])

    const view = await getComissoesParlamentar(p.id as string)
    expect(view.ativas).toHaveLength(0)
    expect(view.historicasSiglas).toEqual(['CCJ'])
    expect(view.totalHistoricas).toBe(1)
  })

  it('parlamentar sem comissão → view vazia', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)

    const view = await getComissoesParlamentar(p.id as string)
    expect(view).toEqual({
      ativas: [],
      historicasSiglas: [],
      totalHistoricas: 0,
    })
  })

  it('destaca cargo de liderança nas ativas', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    await db.insert(membroComissao).values(
      buildMembroComissao({
        parlamentarId: p.id as string,
        comissaoSigla: 'CCJC',
        comissaoSourceId: 'o1',
        cargoOrigem: 'Presidente',
        dataFim: null,
      }),
    )

    const view = await getComissoesParlamentar(p.id as string)
    expect(view.ativas[0]).toMatchObject({
      sigla: 'CCJC',
      cargo: 'Presidente',
      lideranca: true,
    })
  })
})
