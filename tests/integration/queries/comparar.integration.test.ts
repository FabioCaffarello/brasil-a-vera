import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getCompararParlamentares } from '@/lib/queries/comparar'
import { gasto } from '@/modules/gastos/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
} from '@/modules/proposicoes/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'
import { buildGasto } from '../fixtures/gastos'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildProposicao, buildProposicaoAutor } from '../fixtures/proposicoes'
import { buildVotacao, buildVotoNominal } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/comparar (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('retorna null para menos de 2 IDs', async () => {
    const r = await getCompararParlamentares([])
    expect(r).toBeNull()
    const r2 = await getCompararParlamentares(['x'])
    expect(r2).toBeNull()
  })

  it('retorna null para mais de 3 IDs únicos', async () => {
    const r = await getCompararParlamentares(['a', 'b', 'c', 'd'])
    expect(r).toBeNull()
  })

  it('dedupe + ordena cache key (4 IDs com 2 únicos é aceito)', async () => {
    const p1 = buildParlamentar({ nome: 'P1' })
    const p2 = buildParlamentar({ nome: 'P2' })
    await db.insert(parlamentar).values([p1, p2])

    const r = await getCompararParlamentares([
      p1.id as string,
      p2.id as string,
      p1.id as string, // dup
      p2.id as string, // dup
    ])
    expect(r).not.toBeNull()
    expect(r?.parlamentares).toHaveLength(2)
  })

  it('retorna null quando algum ID não existe', async () => {
    const p1 = buildParlamentar()
    await db.insert(parlamentar).values(p1)

    const r = await getCompararParlamentares([
      p1.id as string,
      '00000000-0000-7000-8000-000000000000',
    ])
    expect(r).toBeNull()
  })

  it('agrega métricas e concordância par a par para 2 parlamentares com votos', async () => {
    const p1 = buildParlamentar({ nome: 'P1' })
    const p2 = buildParlamentar({ nome: 'P2' })
    await db.insert(parlamentar).values([p1, p2])

    // 5 votações para atingir threshold de concordância
    const votacoes = Array.from({ length: 5 }, () => buildVotacao())
    await db.insert(votacao).values(votacoes)

    // P1: SIM em todas. P2: SIM em 4, NAO em 1 → 80% concordância
    await db.insert(votoNominal).values([
      ...votacoes.map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p1.id as string,
          voto: 'SIM',
        }),
      ),
      ...votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p2.id as string,
          voto: i === 0 ? 'NAO' : 'SIM',
        }),
      ),
    ])

    const r = await getCompararParlamentares([p1.id as string, p2.id as string])
    expect(r).not.toBeNull()
    expect(r?.concordancia).toHaveLength(1)
    const par = r?.concordancia[0]
    expect(par?.total).toBe(5)
    expect(par?.coincidentes).toBe(4)
    expect(par?.percentual).toBe(80)
  })

  it('presença ignora AUSENTE no numerador, mantém no denominador', async () => {
    const p = buildParlamentar()
    const pOutro = buildParlamentar()
    await db.insert(parlamentar).values([p, pOutro])

    const votacoes = Array.from({ length: 4 }, () => buildVotacao())
    await db.insert(votacao).values(votacoes)

    // P presente em 3 de 4
    await db.insert(votoNominal).values(
      votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p.id as string,
          voto: i === 3 ? 'AUSENTE' : 'SIM',
        }),
      ),
    )
    // pOutro: presente em todos
    await db.insert(votoNominal).values(
      votacoes.map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pOutro.id as string,
          voto: 'SIM',
        }),
      ),
    )

    const r = await getCompararParlamentares([
      p.id as string,
      pOutro.id as string,
    ])
    const m = r?.metricas.find((mm) => mm.parlamentarId === p.id)
    expect(m?.presenca.presente).toBe(3)
    expect(m?.presenca.total).toBe(4)
    expect(m?.presenca.percentual).toBe(75)
  })

  it('conta apenas autoria primária (AUTOR), não COAUTOR', async () => {
    const p1 = buildParlamentar()
    const p2 = buildParlamentar()
    await db.insert(parlamentar).values([p1, p2])

    const prop1 = buildProposicao({ numero: 1, ano: 2026 })
    const prop2 = buildProposicao({ numero: 2, ano: 2026 })
    const prop3 = buildProposicao({ numero: 3, ano: 2026 })
    await db.insert(proposicao).values([prop1, prop2, prop3])

    // P1: AUTOR em 2 (prop1, prop2), COAUTOR em 1 (prop3) → conta 2
    // P2: COAUTOR em 1 (prop1) → conta 0
    await db.insert(proposicaoAutor).values([
      buildProposicaoAutor({
        proposicaoId: prop1.id as string,
        parlamentarId: p1.id as string,
        nome: 'P1',
        tipoAutoria: 'AUTOR',
      }),
      buildProposicaoAutor({
        proposicaoId: prop2.id as string,
        parlamentarId: p1.id as string,
        nome: 'P1',
        tipoAutoria: 'AUTOR',
      }),
      buildProposicaoAutor({
        proposicaoId: prop3.id as string,
        parlamentarId: p1.id as string,
        nome: 'P1',
        tipoAutoria: 'COAUTOR',
      }),
      buildProposicaoAutor({
        proposicaoId: prop1.id as string,
        parlamentarId: p2.id as string,
        nome: 'P2',
        tipoAutoria: 'COAUTOR',
      }),
    ])

    const r = await getCompararParlamentares([p1.id as string, p2.id as string])
    const m1 = r?.metricas.find((mm) => mm.parlamentarId === p1.id)
    const m2 = r?.metricas.find((mm) => mm.parlamentarId === p2.id)
    expect(m1?.proposicoesAutoriaPrimaria).toBe(2)
    expect(m2?.proposicoesAutoriaPrimaria).toBe(0)
  })

  it('gastos agregados por parlamentar + top 3 categorias do ano corrente', async () => {
    const p = buildParlamentar()
    const pOutro = buildParlamentar()
    await db.insert(parlamentar).values([p, pOutro])

    const anoCorrente = new Date().getFullYear()
    const ymd = (m: number) => `${anoCorrente}-${String(m).padStart(2, '0')}-01`

    await db.insert(gasto).values([
      buildGasto({
        parlamentarId: p.id as string,
        categoriaCodigo: 1,
        categoriaDescricao: 'COMBUSTIVEL',
        valor: '500.00',
        dataEmissao: ymd(3),
      }),
      buildGasto({
        parlamentarId: p.id as string,
        categoriaCodigo: 2,
        categoriaDescricao: 'PASSAGEM AÉREA',
        valor: '300.00',
        dataEmissao: ymd(4),
      }),
      buildGasto({
        parlamentarId: p.id as string,
        categoriaCodigo: 3,
        categoriaDescricao: 'HOSPEDAGEM',
        valor: '150.00',
        dataEmissao: ymd(5),
      }),
      buildGasto({
        parlamentarId: p.id as string,
        categoriaCodigo: 4,
        categoriaDescricao: 'ALIMENTACAO',
        valor: '50.00',
        dataEmissao: ymd(6),
      }),
      // Ano anterior — ignorado
      buildGasto({
        parlamentarId: p.id as string,
        categoriaCodigo: 1,
        categoriaDescricao: 'COMBUSTIVEL',
        valor: '999.99',
        dataEmissao: `${anoCorrente - 1}-12-01`,
      }),
    ])

    const r = await getCompararParlamentares([
      p.id as string,
      pOutro.id as string,
    ])
    const m = r?.metricas.find((mm) => mm.parlamentarId === p.id)
    expect(m?.gastosTotalGeral).toBe('1000.00')
    expect(m?.gastosTotalRegistros).toBe(4)
    expect(m?.gastosTopCategorias).toHaveLength(3)
    expect(m?.gastosTopCategorias[0]?.categoriaDescricao).toBe('COMBUSTIVEL')
    expect(m?.gastosTopCategorias[1]?.categoriaDescricao).toBe('PASSAGEM AÉREA')
    expect(m?.gastosTopCategorias[2]?.categoriaDescricao).toBe('HOSPEDAGEM')
  })

  it('aceita 3 parlamentares e produz 3 pares de concordância', async () => {
    const p1 = buildParlamentar()
    const p2 = buildParlamentar()
    const p3 = buildParlamentar()
    await db.insert(parlamentar).values([p1, p2, p3])

    const r = await getCompararParlamentares([
      p1.id as string,
      p2.id as string,
      p3.id as string,
    ])
    expect(r?.parlamentares).toHaveLength(3)
    expect(r?.concordancia).toHaveLength(3) // 3 pares
  })
})
