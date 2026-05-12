import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getGastosResumo,
  getParlamentarById,
  getPartidosDistintos,
  getProposicoesAutoradas,
  getTop5Afinidade,
  getUfsDistintos,
  getVotosRecentes,
  listParlamentares,
} from '@/lib/queries/parlamentares'
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

describe('queries/parlamentares (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('listParlamentares', () => {
    it('retorna array vazio em DB vazio', async () => {
      const result = await listParlamentares()
      expect(result).toEqual([])
    })

    it('filtra por casa', async () => {
      await db
        .insert(parlamentar)
        .values([
          buildParlamentar({ nome: 'Dep Câmara', casa: 'CAMARA' }),
          buildParlamentar({ nome: 'Sen Senado', casa: 'SENADO' }),
        ])

      const result = await listParlamentares({ casa: 'CAMARA' })
      expect(result).toHaveLength(1)
      expect(result[0]?.nome).toBe('Dep Câmara')
    })

    it('combina filtros partido + uf', async () => {
      await db
        .insert(parlamentar)
        .values([
          buildParlamentar({ nome: 'PT-SP', partidoSigla: 'PT', uf: 'SP' }),
          buildParlamentar({ nome: 'PT-RJ', partidoSigla: 'PT', uf: 'RJ' }),
          buildParlamentar({ nome: 'PL-SP', partidoSigla: 'PL', uf: 'SP' }),
        ])

      const result = await listParlamentares({ partido: 'PT', uf: 'SP' })
      expect(result).toHaveLength(1)
      expect(result[0]?.nome).toBe('PT-SP')
    })
  })

  describe('getParlamentarById', () => {
    it('retorna parlamentar quando id existe', async () => {
      const p = buildParlamentar({ nome: 'Existente' })
      await db.insert(parlamentar).values(p)

      const result = await getParlamentarById(p.id as string)
      expect(result).not.toBeNull()
      expect(result?.nome).toBe('Existente')
    })

    it('retorna null para uuid inexistente', async () => {
      const result = await getParlamentarById(
        '00000000-0000-7000-8000-000000000000',
      )
      expect(result).toBeNull()
    })
  })

  describe('getVotosRecentes', () => {
    it('ordena por dataHora desc e respeita limit', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)

      const votacoes = [
        buildVotacao({
          descricao: 'V mais antiga',
          dataHora: new Date('2026-01-01T10:00:00Z'),
        }),
        buildVotacao({
          descricao: 'V intermediária',
          dataHora: new Date('2026-03-01T10:00:00Z'),
        }),
        buildVotacao({
          descricao: 'V mais recente',
          dataHora: new Date('2026-05-01T10:00:00Z'),
        }),
      ]
      await db.insert(votacao).values(votacoes)
      await db.insert(votoNominal).values(
        votacoes.map((v) =>
          buildVotoNominal({
            votacaoId: v.id as string,
            parlamentarId: p.id as string,
          }),
        ),
      )

      const result = await getVotosRecentes(p.id as string, 2)
      expect(result).toHaveLength(2)
      expect(result[0]?.descricao).toBe('V mais recente')
      expect(result[1]?.descricao).toBe('V intermediária')
    })
  })

  describe('getProposicoesAutoradas', () => {
    it('retorna proposições autoradas pelo parlamentar', async () => {
      const p = buildParlamentar({ nome: 'Autor' })
      await db.insert(parlamentar).values(p)

      const props = [
        buildProposicao({ numero: 100, ano: 2026, tipo: 'PL' }),
        buildProposicao({ numero: 200, ano: 2026, tipo: 'PEC' }),
      ]
      await db.insert(proposicao).values(props)
      await db.insert(proposicaoAutor).values(
        props.map((prop) =>
          buildProposicaoAutor({
            proposicaoId: prop.id as string,
            parlamentarId: p.id as string,
            nome: 'Autor',
          }),
        ),
      )

      const result = await getProposicoesAutoradas(p.id as string, 5)
      expect(result).toHaveLength(2)
      // Ordenação desc(ano), desc(numero): PEC 200/2026 vem antes de PL 100/2026
      expect(result[0]?.numero).toBe(200)
      expect(result[1]?.numero).toBe(100)
    })
  })

  describe('getGastosResumo', () => {
    it('agrega por categoria com totalGeral e ordem por valor desc', async () => {
      const p = buildParlamentar()
      await db.insert(parlamentar).values(p)

      await db.insert(gasto).values([
        buildGasto({
          parlamentarId: p.id as string,
          categoriaCodigo: 1,
          categoriaDescricao: 'PASSAGEM AÉREA',
          valor: '100.00',
          dataEmissao: '2026-03-15',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          categoriaCodigo: 1,
          categoriaDescricao: 'PASSAGEM AÉREA',
          valor: '200.00',
          dataEmissao: '2026-04-10',
        }),
        buildGasto({
          parlamentarId: p.id as string,
          categoriaCodigo: 2,
          categoriaDescricao: 'COMBUSTIVEL',
          valor: '500.00',
          dataEmissao: '2026-05-01',
        }),
      ])

      const result = await getGastosResumo(p.id as string, 2026)
      expect(result.totalGeral).toBe('800.00')
      expect(result.totalRegistros).toBe(3)
      expect(result.porCategoria).toHaveLength(2)
      // Maior soma primeiro (COMBUSTIVEL 500 > PASSAGEM AÉREA 300)
      expect(result.porCategoria[0]?.categoriaDescricao).toBe('COMBUSTIVEL')
      expect(result.porCategoria[1]?.categoriaDescricao).toBe('PASSAGEM AÉREA')
    })
  })

  describe('getTop5Afinidade', () => {
    it('retorna outros parlamentares com count de votos coincidentes', async () => {
      const p1 = buildParlamentar({ nome: 'P1', partidoSigla: 'PT' })
      const p2 = buildParlamentar({ nome: 'P2', partidoSigla: 'PL' })
      const p3 = buildParlamentar({ nome: 'P3', partidoSigla: 'PSDB' })
      const p4 = buildParlamentar({ nome: 'P4', partidoSigla: 'MDB' })
      await db.insert(parlamentar).values([p1, p2, p3, p4])

      // 5 votações em comum para passar amostraMinima (default 5)
      const votacoes = Array.from({ length: 5 }, () => buildVotacao())
      await db.insert(votacao).values(votacoes)

      // P1 vota SIM em todas as 5
      // P2 vota SIM em 4, NAO em 1 → 4/5 coincidentes
      // P3 vota SIM em 3, NAO em 2 → 3/5 coincidentes
      // P4 participa de apenas 4 votações → não passa amostraMinima
      const votosP1 = votacoes.map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p1.id as string,
          voto: 'SIM',
        }),
      )
      const votosP2 = votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p2.id as string,
          voto: i === 0 ? 'NAO' : 'SIM',
        }),
      )
      const votosP3 = votacoes.map((v, i) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p3.id as string,
          voto: i < 2 ? 'NAO' : 'SIM',
        }),
      )
      const votosP4 = votacoes.slice(0, 4).map((v) =>
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p4.id as string,
          voto: 'SIM',
        }),
      )

      await db
        .insert(votoNominal)
        .values([...votosP1, ...votosP2, ...votosP3, ...votosP4])

      const result = await getTop5Afinidade(p1.id as string)
      expect(result).toHaveLength(2)
      // Order by coincidentes DESC: P2 (4) primeiro, P3 (3) depois
      expect(result[0]?.nome).toBe('P2')
      expect(result[0]?.votosCoincidentes).toBe(4)
      expect(result[0]?.totalVotosEmComum).toBe(5)
      expect(result[0]?.percentualAfinidade).toBe(80)
      expect(result[1]?.nome).toBe('P3')
      expect(result[1]?.votosCoincidentes).toBe(3)
      expect(result[1]?.percentualAfinidade).toBe(60)
    })
  })

  describe('getPartidosDistintos', () => {
    it('retorna partidos distintos ordenados alfabeticamente', async () => {
      await db
        .insert(parlamentar)
        .values([
          buildParlamentar({ partidoSigla: 'PT' }),
          buildParlamentar({ partidoSigla: 'MDB' }),
          buildParlamentar({ partidoSigla: 'PT' }),
          buildParlamentar({ partidoSigla: 'PL' }),
        ])

      const result = await getPartidosDistintos()
      expect(result).toEqual(['MDB', 'PL', 'PT'])
    })
  })

  describe('getUfsDistintos', () => {
    it('retorna UFs distintas ordenadas alfabeticamente', async () => {
      await db
        .insert(parlamentar)
        .values([
          buildParlamentar({ uf: 'SP' }),
          buildParlamentar({ uf: 'AC' }),
          buildParlamentar({ uf: 'SP' }),
          buildParlamentar({ uf: 'RJ' }),
        ])

      const result = await getUfsDistintos()
      expect(result).toEqual(['AC', 'RJ', 'SP'])
    })
  })
})
