import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { uuidv7 } from 'uuidv7'
import { getGabineteParlamentar } from '@/lib/queries/gabinete'
import {
  comissionadoGabinete,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

function buildComissionado(
  args: { parlamentarId: string } & Partial<
    typeof comissionadoGabinete.$inferInsert
  >,
): typeof comissionadoGabinete.$inferInsert {
  return {
    id: uuidv7(),
    casa: 'CAMARA',
    nome: 'FULANO DO GABINETE',
    grupo: 'Secretário Parlamentar',
    cargo: 'SP09C',
    remuneracaoBasica: null,
    mesReferencia: null,
    sourceId: null,
    trustLevel: 'L1',
    sourceUrl: 'https://dadosabertos.camara.leg.br/arquivos/funcionarios',
    ...args,
  }
}

describe('queries/gabinete (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('total 0 quando o parlamentar não tem comissionados (fail-closed na page)', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const view = await getGabineteParlamentar(p.id as string)
    expect(view.total).toBe(0)
    expect(view.custoBasicoMensalCentavos).toBeNull()
  })

  it('Senado: soma custo em centavos, competência e ordena por remuneração desc', async () => {
    const p = buildParlamentar({ casa: 'SENADO' })
    await db.insert(parlamentar).values(p)
    const pid = p.id as string
    await db.insert(comissionadoGabinete).values([
      buildComissionado({
        parlamentarId: pid,
        casa: 'SENADO',
        nome: 'MENOR',
        remuneracaoBasica: '789.41',
        mesReferencia: '2026-06-01',
      }),
      buildComissionado({
        parlamentarId: pid,
        casa: 'SENADO',
        nome: 'MAIOR',
        remuneracaoBasica: '11928.00',
        mesReferencia: '2026-06-01',
      }),
      buildComissionado({
        parlamentarId: pid,
        casa: 'SENADO',
        nome: 'SEM VALOR',
        remuneracaoBasica: null,
      }),
    ])

    const view = await getGabineteParlamentar(pid)
    expect(view.total).toBe(3)
    expect(view.custoBasicoMensalCentavos).toBe(1271741)
    expect(view.mesReferencia).toBe('2026-06-01')
    expect(view.pessoas[0].nome).toBe('MAIOR')
    expect(view.pessoas.at(-1)?.nome).toBe('SEM VALOR')
  })

  it('não vaza comissionados de outro parlamentar', async () => {
    const p1 = buildParlamentar()
    const p2 = buildParlamentar({ nome: 'Outro Nome' })
    await db.insert(parlamentar).values([p1, p2])
    await db
      .insert(comissionadoGabinete)
      .values(buildComissionado({ parlamentarId: p2.id as string }))

    expect((await getGabineteParlamentar(p1.id as string)).total).toBe(0)
  })
})
