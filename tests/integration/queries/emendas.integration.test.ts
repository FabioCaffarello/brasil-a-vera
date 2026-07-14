import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getEmendas } from '@/lib/queries/emendas'
import { emendaParlamentar } from '@/modules/orcamento/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildEmenda } from '../fixtures/emendas'
import { buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/emendas (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('array vazio quando o parlamentar não tem emendas vinculadas', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    expect(await getEmendas(p.id as string)).toEqual([])
  })

  it('agrega por ano (desc), conta emendas distintas e soma em centavos', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const pid = p.id as string
    await db.insert(emendaParlamentar).values([
      buildEmenda({
        parlamentarId: pid,
        ano: 2026,
        codigoEmenda: '202600010001',
        valorEmpenhado: '100000.00',
        valorPago: '40000.00',
      }),
      // Mesma emenda, outra localidade — conta 1 emenda, soma valores.
      buildEmenda({
        parlamentarId: pid,
        ano: 2026,
        codigoEmenda: '202600010001',
        localidade: 'CONTAGEM - MG',
        municipioIbgeCodigo: '3118601',
        municipioNome: 'CONTAGEM',
        valorEmpenhado: '50000.00',
        valorPago: '10000.50',
      }),
      buildEmenda({
        parlamentarId: pid,
        ano: 2025,
        codigoEmenda: '202500010001',
        valorEmpenhado: '80000.00',
        valorPago: '80000.00',
      }),
    ])

    const anos = await getEmendas(pid)
    expect(anos.map((a) => a.ano)).toEqual([2026, 2025])
    const [a2026, a2025] = anos
    expect(a2026.emendas).toBe(1)
    expect(a2026.centavosEmpenhado).toBe(15000000)
    expect(a2026.centavosPago).toBe(5000050)
    expect(a2025.emendas).toBe(1)
    expect(a2025.centavosPago).toBe(8000000)
  })

  it('top municípios ordenados por pago (fallback empenhado) e bucket sem-município', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const pid = p.id as string
    await db.insert(emendaParlamentar).values([
      buildEmenda({
        parlamentarId: pid,
        codigoEmenda: '202600020001',
        valorPago: '10000.00',
      }),
      buildEmenda({
        parlamentarId: pid,
        codigoEmenda: '202600020002',
        localidade: 'CONTAGEM - MG',
        municipioIbgeCodigo: '3118601',
        municipioNome: 'CONTAGEM',
        valorPago: '90000.00',
      }),
      // Sem município (destino múltiplo) → entra no bucket, não no top.
      buildEmenda({
        parlamentarId: pid,
        codigoEmenda: '202600020003',
        localidade: 'MÚLTIPLO',
        municipioIbgeCodigo: null,
        municipioNome: null,
        uf: null,
        valorEmpenhado: '77000.00',
        valorPago: '33000.00',
      }),
    ])

    const [ano] = await getEmendas(pid)
    expect(ano.topMunicipios.map((m) => m.nome)).toEqual([
      'CONTAGEM',
      'BELO HORIZONTE',
    ])
    expect(ano.semMunicipioCentavosPago).toBe(3300000)
    expect(ano.semMunicipioCentavosEmpenhado).toBe(7700000)
  })

  it('não vaza emendas de outro parlamentar', async () => {
    const p1 = buildParlamentar()
    const p2 = buildParlamentar({ nome: 'Outro Nome' })
    await db.insert(parlamentar).values([p1, p2])
    await db
      .insert(emendaParlamentar)
      .values(buildEmenda({ parlamentarId: p2.id as string }))

    expect(await getEmendas(p1.id as string)).toEqual([])
  })
})
