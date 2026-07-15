import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getConfrontoEmendasColegio, getEmendas } from '@/lib/queries/emendas'
import {
  tseCandidatura,
  votoCandidatoMunicipio,
} from '@/modules/eleitoral/domain/schema'
import { emendaParlamentar } from '@/modules/orcamento/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { buildVotoMunicipio } from '../fixtures/colegio'
import { buildEmenda } from '../fixtures/emendas'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildTseCandidatura } from '../fixtures/patrimonio'
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

describe('queries/emendas getConfrontoEmendasColegio (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  async function seedColegio(
    parlamentarId: string,
    municipios: Array<{ nome: string; uf: string }>,
  ) {
    const cand = buildTseCandidatura({ parlamentarId })
    await db.insert(tseCandidatura).values(cand)
    await db.insert(votoCandidatoMunicipio).values(
      municipios.map((m) =>
        buildVotoMunicipio({
          sqCandidato: cand.sqCandidato as number,
          municipioNome: m.nome,
          uf: m.uf,
        }),
      ),
    )
  }

  it('null quando não há colégio ou não há emendas com município', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const pid = p.id as string

    // Sem colégio, mesmo com emendas.
    await db
      .insert(emendaParlamentar)
      .values(buildEmenda({ parlamentarId: pid }))
    expect(await getConfrontoEmendasColegio(pid)).toBeNull()

    // Com colégio, mas só emendas sem município.
    await seedColegio(pid, [{ nome: 'BELO HORIZONTE', uf: 'MG' }])
    await db.delete(emendaParlamentar)
    await db.insert(emendaParlamentar).values(
      buildEmenda({
        parlamentarId: pid,
        localidade: 'MÚLTIPLO',
        municipioIbgeCodigo: null,
        municipioNome: null,
        uf: null,
      }),
    )
    expect(await getConfrontoEmendasColegio(pid)).toBeNull()
  })

  it('casa municípios por nome normalizado + UF (ponte TSE↔IBGE)', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const pid = p.id as string
    // Colégio com acento; emenda sem acento — a ponte deve casar.
    await seedColegio(pid, [
      { nome: 'BRASÍLIA', uf: 'DF' },
      { nome: 'CONTAGEM', uf: 'MG' },
    ])
    await db.insert(emendaParlamentar).values([
      buildEmenda({
        parlamentarId: pid,
        codigoEmenda: '202600030001',
        localidade: 'BRASILIA - DF',
        municipioIbgeCodigo: '5300108',
        municipioNome: 'BRASILIA',
        uf: 'DF',
        valorEmpenhado: '75000.00',
        valorPago: '50000.00',
      }),
      // Mesmo nome, UF diferente — NÃO casa (fail-closed).
      buildEmenda({
        parlamentarId: pid,
        codigoEmenda: '202600030002',
        localidade: 'CONTAGEM - XX',
        municipioIbgeCodigo: '9999999',
        municipioNome: 'CONTAGEM',
        uf: 'SP',
        valorEmpenhado: '25000.00',
        valorPago: '0.00',
      }),
    ])

    const confronto = await getConfrontoEmendasColegio(pid)
    expect(confronto).not.toBeNull()
    expect(confronto?.anoPleito).toBe(2022)
    expect(confronto?.centavosEmpenhadoComMunicipio).toBe(10000000)
    expect(confronto?.centavosEmpenhadoNoColegio).toBe(7500000)
    expect(confronto?.centavosPagoNoColegio).toBe(5000000)
    expect(confronto?.municipiosComDestino).toBe(2)
    expect(confronto?.municipiosNoColegio).toBe(1)
  })

  it('usa o pleito mais recente quando há mais de um colégio', async () => {
    const p = buildParlamentar()
    await db.insert(parlamentar).values(p)
    const pid = p.id as string

    const cand2018 = buildTseCandidatura({
      parlamentarId: pid,
      anoEleicao: 2018,
    })
    const cand2022 = buildTseCandidatura({
      parlamentarId: pid,
      anoEleicao: 2022,
    })
    await db.insert(tseCandidatura).values([cand2018, cand2022])
    await db.insert(votoCandidatoMunicipio).values([
      buildVotoMunicipio({
        sqCandidato: cand2018.sqCandidato as number,
        anoEleicao: 2018,
        municipioNome: 'SANTOS',
        uf: 'SP',
      }),
      buildVotoMunicipio({
        sqCandidato: cand2022.sqCandidato as number,
        anoEleicao: 2022,
        municipioNome: 'CAMPINAS',
        uf: 'SP',
      }),
    ])
    // Emenda para o município do colégio ANTIGO — não casa com o de 2022.
    await db.insert(emendaParlamentar).values(
      buildEmenda({
        parlamentarId: pid,
        localidade: 'SANTOS - SP',
        municipioIbgeCodigo: '3548500',
        municipioNome: 'SANTOS',
        uf: 'SP',
      }),
    )

    const confronto = await getConfrontoEmendasColegio(pid)
    expect(confronto?.anoPleito).toBe(2022)
    expect(confronto?.centavosEmpenhadoNoColegio).toBe(0)
    expect(confronto?.municipiosNoColegio).toBe(0)
  })
})
