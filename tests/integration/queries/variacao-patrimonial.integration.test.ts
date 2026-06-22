import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getVariacaoPatrimonial } from '@/lib/queries/variacao-patrimonial'
import {
  tseBemCandidato,
  tseCandidatura,
} from '@/modules/eleitoral/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildTseBem, buildTseCandidatura } from '../fixtures/patrimonio'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

// Cria candidatura+bem de um parlamentar num pleito (vínculo por sqCandidato).
async function seedPleito(
  parlamentarId: string,
  ano: number,
  valor: string,
  sq: number,
) {
  await db
    .insert(tseCandidatura)
    .values(
      buildTseCandidatura({ anoEleicao: ano, sqCandidato: sq, parlamentarId }),
    )
  await db
    .insert(tseBemCandidato)
    .values(
      buildTseBem({ anoEleicao: ano, sqCandidato: sq, valorDeclarado: valor }),
    )
}

describe('queries/variacao-patrimonial (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('variação do último par + percentil vs pares (ADR-047)', async () => {
    const p = buildParlamentar({ casa: 'CAMARA' })
    const q = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values([p, q])

    // P cresce mais que Q (mesmo par 2018→2022, mesma casa).
    await seedPleito(p.id as string, 2018, '100000.00', 10018)
    await seedPleito(p.id as string, 2022, '300000.00', 10022)
    await seedPleito(q.id as string, 2018, '100000.00', 20018)
    await seedPleito(q.id as string, 2022, '110000.00', 20022)

    const vp = await getVariacaoPatrimonial(p.id as string)
    expect(vp?.pleitoDe).toBe(2018)
    expect(vp?.pleitoAte).toBe(2022)
    expect(vp?.nPares).toBe(2)
    expect(vp?.percentil).toBe(100) // maior crescimento real do grupo

    const vq = await getVariacaoPatrimonial(q.id as string)
    expect(vq?.percentil).toBe(0)
  })

  it('< 2 pleitos → null (fail-closed)', async () => {
    const p = buildParlamentar({ casa: 'CAMARA' })
    await db.insert(parlamentar).values(p)
    await seedPleito(p.id as string, 2022, '100000.00', 30022)

    expect(await getVariacaoPatrimonial(p.id as string)).toBeNull()
  })

  it('parlamentar sem bens → null', async () => {
    expect(
      await getVariacaoPatrimonial('00000000-0000-7000-8000-000000000000'),
    ).toBeNull()
  })
})
