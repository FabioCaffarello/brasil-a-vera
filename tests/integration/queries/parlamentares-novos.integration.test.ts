import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getAlinhamentoMensal,
  getComparacoesCasa,
  getGastosCategoriasDistintas,
  getGastosDetalhe,
  getGastosMensalMedianaCasa,
  getGastosTopFornecedores,
} from '@/lib/queries/parlamentares'
import { gasto } from '@/modules/gastos/domain/schema'
import {
  estatisticaParlamentarAgregada,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { buildGasto } from '../fixtures/gastos'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildOrientacao,
  buildVotacao,
  buildVotoNominal,
} from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

const NONEXISTENT_UUID = '00000000-0000-7000-8000-000000000000'
const ANO_ATUAL = new Date().getUTCFullYear()

describe('queries/parlamentares (Sprint 7.0 PR4 — novos)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('getAlinhamentoMensal', () => {
    it('retorna array vazio para parlamentar sem votos', async () => {
      const p = buildParlamentar({ partidoSigla: 'PT' })
      await db.insert(parlamentar).values(p)

      const r = await getAlinhamentoMensal(p.id as string)
      expect(r).toEqual([])
    })

    it('retorna array vazio para parlamentar inexistente', async () => {
      const r = await getAlinhamentoMensal(NONEXISTENT_UUID)
      expect(r).toEqual([])
    })

    it('agrupa votos por mês e calcula percentual', async () => {
      const p = buildParlamentar({ partidoSigla: 'PT' })
      const vJan = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-01-15T10:00:00Z`),
      })
      const vJan2 = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-01-22T10:00:00Z`),
      })
      const vFev = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-02-10T10:00:00Z`),
      })
      await db.insert(parlamentar).values(p)
      await db.insert(votacao).values([vJan, vJan2, vFev])
      await db.insert(orientacao).values([
        buildOrientacao({
          votacaoId: vJan.id as string,
          partidoSigla: 'PT',
          orientacao: 'SIM',
        }),
        buildOrientacao({
          votacaoId: vJan2.id as string,
          partidoSigla: 'PT',
          orientacao: 'NAO',
        }),
        buildOrientacao({
          votacaoId: vFev.id as string,
          partidoSigla: 'PT',
          orientacao: 'SIM',
        }),
      ])
      await db.insert(votoNominal).values([
        // jan: 1 alinhado + 1 divergente = 50%
        buildVotoNominal({
          votacaoId: vJan.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: vJan2.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM', // orientacao era NAO -> divergente
        }),
        // fev: 1 alinhado = 100%
        buildVotoNominal({
          votacaoId: vFev.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM',
        }),
      ])

      const r = await getAlinhamentoMensal(p.id as string)
      expect(r).toHaveLength(2)
      expect(r[0]).toEqual({
        mes: `${ANO_ATUAL}-01`,
        total: 2,
        percentual: 50,
      })
      expect(r[1]).toEqual({
        mes: `${ANO_ATUAL}-02`,
        total: 1,
        percentual: 100,
      })
    })

    it('exclui votos AUSENTE e orientações LIBERADO', async () => {
      const p = buildParlamentar({ partidoSigla: 'PT' })
      const v1 = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-03-15T10:00:00Z`),
      })
      const v2 = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-03-22T10:00:00Z`),
      })
      const v3 = buildVotacao({
        dataHora: new Date(`${ANO_ATUAL}-03-29T10:00:00Z`),
      })
      await db.insert(parlamentar).values(p)
      await db.insert(votacao).values([v1, v2, v3])
      await db.insert(orientacao).values([
        buildOrientacao({
          votacaoId: v1.id as string,
          partidoSigla: 'PT',
          orientacao: 'SIM',
        }),
        buildOrientacao({
          votacaoId: v2.id as string,
          partidoSigla: 'PT',
          orientacao: 'LIBERADO', // bancada liberou -> IGNORADO
        }),
        buildOrientacao({
          votacaoId: v3.id as string,
          partidoSigla: 'PT',
          orientacao: 'SIM',
        }),
      ])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: v1.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM', // alinhado
        }),
        buildVotoNominal({
          votacaoId: v2.id as string,
          parlamentarId: p.id as string,
          voto: 'SIM', // ignorado (orientação LIBERADO)
        }),
        buildVotoNominal({
          votacaoId: v3.id as string,
          parlamentarId: p.id as string,
          voto: 'AUSENTE', // ignorado (parlamentar AUSENTE)
        }),
      ])

      const r = await getAlinhamentoMensal(p.id as string)
      expect(r).toHaveLength(1)
      expect(r[0]).toEqual({
        mes: `${ANO_ATUAL}-03`,
        total: 1, // só v1 contou
        percentual: 100,
      })
    })
  })

  describe('getGastosMensalMedianaCasa', () => {
    it('retorna 12 meses (jan-dez) mesmo sem gastos', async () => {
      const p = buildParlamentar({ casa: 'CAMARA' })
      await db.insert(parlamentar).values(p)

      const r = await getGastosMensalMedianaCasa(p.id as string, 2026)
      expect(r).toHaveLength(12)
      expect(r[0]?.mes).toBe('2026-01')
      expect(r[11]?.mes).toBe('2026-12')
      expect(r.every((m) => m.valor === '0' && m.medianaCasa === '0')).toBe(
        true,
      )
    })

    it('calcula mediana sobre parlamentares da mesma casa que gastaram no mês', async () => {
      // 3 deputados (CAMARA) + 1 senador (SENADO).
      // Mês fev/2026: deputados gastaram 100, 200, 300 -> mediana 200.
      // Senador gastou 9999 mas é outra casa -> não conta.
      const dep1 = buildParlamentar({ casa: 'CAMARA' })
      const dep2 = buildParlamentar({ casa: 'CAMARA' })
      const dep3 = buildParlamentar({ casa: 'CAMARA' })
      const sen = buildParlamentar({ casa: 'SENADO' })
      await db.insert(parlamentar).values([dep1, dep2, dep3, sen])
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: dep1.id as string,
          dataEmissao: '2026-02-05',
          valor: '100.00',
        }),
        buildGasto({
          parlamentarId: dep2.id as string,
          dataEmissao: '2026-02-12',
          valor: '200.00',
        }),
        buildGasto({
          parlamentarId: dep3.id as string,
          dataEmissao: '2026-02-20',
          valor: '300.00',
        }),
        buildGasto({
          parlamentarId: sen.id as string,
          dataEmissao: '2026-02-15',
          valor: '9999.00',
        }),
      ])

      const r = await getGastosMensalMedianaCasa(dep1.id as string, 2026)
      const fev = r.find((m) => m.mes === '2026-02')
      expect(fev).toBeDefined()
      // dep1 gastou 100 no mês de fevereiro
      expect(Number(fev?.valor)).toBe(100)
      // Mediana dos 3 deputados (100/200/300) = 200
      expect(Number(fev?.medianaCasa)).toBe(200)
      // Meses sem dado vêm com 0
      expect(r.find((m) => m.mes === '2026-01')?.valor).toBe('0')
      expect(r.find((m) => m.mes === '2026-01')?.medianaCasa).toBe('0')
    })
  })

  describe('getGastosTopFornecedores', () => {
    it('agrupa por CNPJ e ordena por total desc', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        // Fornecedor A (CNPJ x): 2 registros, total 300
        buildGasto({
          parlamentarId: p.id as string,
          fornecedorCnpjCpf: '11111111000111',
          fornecedorNome: 'Fornecedor A',
          valor: '100.00',
          dataEmissao: '2026-01-10',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          fornecedorCnpjCpf: '11111111000111',
          fornecedorNome: 'Fornecedor A',
          valor: '200.00',
          dataEmissao: '2026-02-15',
        }),
        // Fornecedor B (CNPJ y): 1 registro, total 500
        buildGasto({
          parlamentarId: p.id as string,
          fornecedorCnpjCpf: '22222222000122',
          fornecedorNome: 'Fornecedor B',
          valor: '500.00',
          dataEmissao: '2026-03-10',
        }),
      ])

      const r = await getGastosTopFornecedores(p.id as string, 2026)
      expect(r).toHaveLength(2)
      // B veio primeiro (500 > 300)
      expect(r[0]?.cnpj).toBe('22222222000122')
      expect(r[0]?.nome).toBe('Fornecedor B')
      expect(Number(r[0]?.total)).toBe(500)
      expect(r[0]?.registros).toBe(1)
      // A em 2º
      expect(r[1]?.cnpj).toBe('11111111000111')
      expect(Number(r[1]?.total)).toBe(300)
      expect(r[1]?.registros).toBe(2)
    })

    it('respeita o limit', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      // 6 fornecedores diferentes
      await db.insert(gasto).values(
        Array.from({ length: 6 }, (_, i) =>
          buildGasto({
            parlamentarId: p.id as string,
            fornecedorCnpjCpf: `${i + 1}`.padStart(14, '0'),
            fornecedorNome: `Fornecedor ${i}`,
            valor: `${(i + 1) * 100}.00`,
            dataEmissao: '2026-01-10',
          }),
        ),
      )

      const r = await getGastosTopFornecedores(p.id as string, 2026, 3)
      expect(r).toHaveLength(3)
    })

    it('filtra por ano', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          fornecedorCnpjCpf: '11111111000111',
          fornecedorNome: 'A',
          valor: '100.00',
          dataEmissao: '2025-06-10', // ano anterior
        }),
        buildGasto({
          parlamentarId: p.id as string,
          fornecedorCnpjCpf: '22222222000122',
          fornecedorNome: 'B',
          valor: '999.00',
          dataEmissao: '2026-06-10',
        }),
      ])

      const r2025 = await getGastosTopFornecedores(p.id as string, 2025)
      expect(r2025).toHaveLength(1)
      expect(r2025[0]?.nome).toBe('A')

      const r2026 = await getGastosTopFornecedores(p.id as string, 2026)
      expect(r2026).toHaveLength(1)
      expect(r2026[0]?.nome).toBe('B')
    })
  })

  describe('getComparacoesCasa (Sprint 7.2 PR1)', () => {
    it('retorna todos nulos para parlamentar inexistente', async () => {
      const r = await getComparacoesCasa(NONEXISTENT_UUID)
      expect(r.medianaAlinhamentoCasa).toBeNull()
      expect(r.percentilProposicoesCasa).toBeNull()
      expect(r.percentilGastoCasa).toBeNull()
    })

    it('calcula mediana de alinhamento + percentis na mesma casa', async () => {
      // 3 deputados (CAMARA) com agregados:
      //   p1: pct=40, propos=10, percentil_gasto=10
      //   p2: pct=70, propos=30, percentil_gasto=50
      //   p3: pct=90, propos=50, percentil_gasto=90
      // Mediana de pct na CAMARA = 70
      // p1 está no percentil_propos = 0 (1ª posição em ordem ASC)
      const p1 = buildParlamentar({ casa: 'CAMARA' })
      const p2 = buildParlamentar({ casa: 'CAMARA' })
      const p3 = buildParlamentar({ casa: 'CAMARA' })
      await db.insert(parlamentar).values([p1, p2, p3])
      await db.insert(estatisticaParlamentarAgregada).values([
        {
          parlamentarId: p1.id as string,
          pctAlinhamento: '40.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 10,
          gastoTotalAno: '1000.00',
          percentilGastoCasa: '10.00',
          trustLevel: 'L2',
        },
        {
          parlamentarId: p2.id as string,
          pctAlinhamento: '70.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 30,
          gastoTotalAno: '2000.00',
          percentilGastoCasa: '50.00',
          trustLevel: 'L2',
        },
        {
          parlamentarId: p3.id as string,
          pctAlinhamento: '90.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 50,
          gastoTotalAno: '3000.00',
          percentilGastoCasa: '90.00',
          trustLevel: 'L2',
        },
      ])

      const r = await getComparacoesCasa(p1.id as string)
      expect(r.medianaAlinhamentoCasa).toBe(70)
      // PERCENT_RANK do menor = 0
      expect(r.percentilProposicoesCasa).toBe(0)
      expect(r.percentilGastoCasa).toBe(10)
    })

    it('ignora parlamentares de outra casa na mediana', async () => {
      // 1 deputado com pct=50, 2 senadores com pct=10 e 90
      // Mediana da CAMARA = 50 (só o deputado)
      const dep = buildParlamentar({ casa: 'CAMARA' })
      const sen1 = buildParlamentar({ casa: 'SENADO' })
      const sen2 = buildParlamentar({ casa: 'SENADO' })
      await db.insert(parlamentar).values([dep, sen1, sen2])
      await db.insert(estatisticaParlamentarAgregada).values([
        {
          parlamentarId: dep.id as string,
          pctAlinhamento: '50.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 5,
          trustLevel: 'L2',
        },
        {
          parlamentarId: sen1.id as string,
          pctAlinhamento: '10.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 5,
          trustLevel: 'L2',
        },
        {
          parlamentarId: sen2.id as string,
          pctAlinhamento: '90.00',
          votacoesAnalisadas: 100,
          proposicoesCount: 5,
          trustLevel: 'L2',
        },
      ])

      const r = await getComparacoesCasa(dep.id as string)
      expect(r.medianaAlinhamentoCasa).toBe(50)
    })
  })

  describe('getGastosDetalhe (Sprint 7.4 PR3)', () => {
    it('retorna {rows, nextCursor: null} quando < page-size', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-01-15',
          valor: '100.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-02-15',
          valor: '200.00',
        }),
      ])

      const { rows, nextCursor } = await getGastosDetalhe(p.id as string, 2026)
      expect(rows).toHaveLength(2)
      // ORDER BY data_emissao DESC
      expect(rows[0]?.dataEmissao).toContain('2026-02')
      expect(rows[1]?.dataEmissao).toContain('2026-01')
      expect(nextCursor).toBeNull()
    })

    it('retorna nextCursor != null com 25 gastos no ano', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values(
        Array.from({ length: 25 }, (_, i) =>
          buildGasto({
            parlamentarId: p.id as string,
            dataEmissao: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
            valor: `${i + 1}.00`,
          }),
        ),
      )

      const { rows, nextCursor } = await getGastosDetalhe(p.id as string, 2026)
      expect(rows).toHaveLength(20)
      expect(nextCursor).not.toBeNull()
    })

    it('filtra por ano (não retorna gastos de outros anos)', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2025-06-15',
          valor: '999.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-06-15',
          valor: '100.00',
        }),
      ])

      const r2026 = await getGastosDetalhe(p.id as string, 2026)
      expect(r2026.rows).toHaveLength(1)
      expect(r2026.rows[0]?.valor).toBe('100.00')

      const r2025 = await getGastosDetalhe(p.id as string, 2025)
      expect(r2025.rows).toHaveLength(1)
      expect(r2025.rows[0]?.valor).toBe('999.00')
    })

    it('filtra por trimestre (Q1, Q2, Q3, Q4)', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-02-10',
          valor: '100.00',
        }), // Q1
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-05-10',
          valor: '200.00',
        }), // Q2
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-08-10',
          valor: '300.00',
        }), // Q3
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-11-10',
          valor: '400.00',
        }), // Q4
      ])

      const q1 = await getGastosDetalhe(p.id as string, 2026, {
        trimestre: 'Q1',
      })
      expect(q1.rows).toHaveLength(1)
      expect(q1.rows[0]?.valor).toBe('100.00')

      const q3 = await getGastosDetalhe(p.id as string, 2026, {
        trimestre: 'Q3',
      })
      expect(q3.rows).toHaveLength(1)
      expect(q3.rows[0]?.valor).toBe('300.00')

      const tudo = await getGastosDetalhe(p.id as string, 2026, {
        trimestre: 'todo',
      })
      expect(tudo.rows).toHaveLength(4)
    })

    it('filtra por categoria (string exata)', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-03-10',
          categoriaDescricao: 'COMBUSTÍVEL',
          valor: '100.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-04-10',
          categoriaDescricao: 'PASSAGEM AÉREA',
          valor: '200.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-05-10',
          categoriaDescricao: 'COMBUSTÍVEL',
          valor: '150.00',
        }),
      ])

      const combustivel = await getGastosDetalhe(p.id as string, 2026, {
        categoria: 'COMBUSTÍVEL',
      })
      expect(combustivel.rows).toHaveLength(2)
      expect(
        combustivel.rows.every((g) => g.categoriaDescricao === 'COMBUSTÍVEL'),
      ).toBe(true)
    })
  })

  describe('getGastosCategoriasDistintas (Sprint 7.4 PR4)', () => {
    it('retorna lista alfabética das categorias presentes no ano', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)
      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-01-10',
          categoriaDescricao: 'TELEFONIA',
          valor: '50.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-02-10',
          categoriaDescricao: 'COMBUSTÍVEL',
          valor: '100.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2026-03-10',
          categoriaDescricao: 'COMBUSTÍVEL', // duplicada
          valor: '150.00',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          dataEmissao: '2025-12-10',
          categoriaDescricao: 'OUTRO ANO', // ano diferente
          valor: '50.00',
        }),
      ])

      const r = await getGastosCategoriasDistintas(p.id as string, 2026)
      expect(r).toEqual(['COMBUSTÍVEL', 'TELEFONIA'])
    })
  })
})
