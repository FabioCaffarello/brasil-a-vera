import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getAnosVotacaoDistintos,
  getProposicaoVinculada,
  getVotacaoById,
  getVotosByVotacao,
  getVotosResumoPorPartido,
  listVotacoes,
} from '@/lib/queries/votacoes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildProposicao } from '../fixtures/proposicoes'
import { buildVotacao, buildVotoNominal } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/votacoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('listVotacoes', () => {
    it('retorna array vazio em DB vazio', async () => {
      const result = await listVotacoes()
      expect(result).toEqual([])
    })

    it('filtra por casa', async () => {
      await db
        .insert(votacao)
        .values([
          buildVotacao({ descricao: 'Câmara', casa: 'CAMARA' }),
          buildVotacao({ descricao: 'Senado', casa: 'SENADO' }),
        ])

      const result = await listVotacoes({ casa: 'CAMARA' })
      expect(result).toHaveLength(1)
      expect(result[0]?.descricao).toBe('Câmara')
    })

    it('filtra por ano via extract', async () => {
      await db.insert(votacao).values([
        buildVotacao({
          descricao: '2024',
          dataHora: new Date('2024-06-01T10:00:00Z'),
        }),
        buildVotacao({
          descricao: '2026',
          dataHora: new Date('2026-06-01T10:00:00Z'),
        }),
      ])

      const result = await listVotacoes({ ano: 2026 })
      expect(result).toHaveLength(1)
      expect(result[0]?.descricao).toBe('2026')
    })

    it('filtra por resultado aprovadas', async () => {
      await db
        .insert(votacao)
        .values([
          buildVotacao({ descricao: 'A', aprovada: true }),
          buildVotacao({ descricao: 'R', aprovada: false }),
        ])

      const result = await listVotacoes({ resultado: 'aprovadas' })
      expect(result).toHaveLength(1)
      expect(result[0]?.descricao).toBe('A')
    })

    it('filtra por somenteNominais (exists subquery)', async () => {
      const p = buildParlamentar()
      const vComVoto = buildVotacao({ descricao: 'com voto' })
      const vSemVoto = buildVotacao({ descricao: 'sem voto' })
      await db.insert(parlamentar).values(p)
      await db.insert(votacao).values([vComVoto, vSemVoto])
      await db.insert(votoNominal).values(
        buildVotoNominal({
          votacaoId: vComVoto.id as string,
          parlamentarId: p.id as string,
        }),
      )

      const result = await listVotacoes({ somenteNominais: true })
      expect(result).toHaveLength(1)
      expect(result[0]?.descricao).toBe('com voto')
    })

    it('ordena por desc(dataHora)', async () => {
      await db.insert(votacao).values([
        buildVotacao({
          descricao: 'antiga',
          dataHora: new Date('2026-01-01T10:00:00Z'),
        }),
        buildVotacao({
          descricao: 'recente',
          dataHora: new Date('2026-05-01T10:00:00Z'),
        }),
      ])

      const result = await listVotacoes()
      expect(result.map((r) => r.descricao)).toEqual(['recente', 'antiga'])
    })
  })

  describe('getVotacaoById', () => {
    it('retorna votacao quando id existe', async () => {
      const v = buildVotacao()
      await db.insert(votacao).values(v)
      const result = await getVotacaoById(v.id as string)
      expect(result?.id).toBe(v.id)
    })

    it('retorna null para id inexistente', async () => {
      const result = await getVotacaoById(
        '00000000-0000-7000-8000-000000000000',
      )
      expect(result).toBeNull()
    })
  })

  describe('getProposicaoVinculada', () => {
    it('retorna null quando proposicaoId é null', async () => {
      const result = await getProposicaoVinculada(null)
      expect(result).toBeNull()
    })

    it('retorna proposicao quando id existe', async () => {
      const p = buildProposicao({ tipo: 'PL', numero: 1, ano: 2026 })
      await db.insert(proposicao).values(p)
      const result = await getProposicaoVinculada(p.id as string)
      expect(result?.tipo).toBe('PL')
      expect(result?.numero).toBe(1)
    })
  })

  describe('getVotosByVotacao', () => {
    it('retorna votos com join de parlamentar, ordem partido asc + nome asc', async () => {
      const v = buildVotacao()
      const pPT = buildParlamentar({
        nome: 'Carlos',
        partidoSigla: 'PT',
      })
      const pMDB = buildParlamentar({
        nome: 'Ana',
        partidoSigla: 'MDB',
      })
      await db.insert(votacao).values(v)
      await db.insert(parlamentar).values([pPT, pMDB])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pPT.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pMDB.id as string,
          voto: 'NAO',
        }),
      ])

      const result = await getVotosByVotacao(v.id as string)
      expect(result.map((r) => r.parlamentarPartidoSigla)).toEqual([
        'MDB',
        'PT',
      ])
    })

    it('filtra por tipo de voto quando filtros.voto é passado', async () => {
      const v = buildVotacao()
      const p1 = buildParlamentar({ nome: 'A' })
      const p2 = buildParlamentar({ nome: 'B' })
      await db.insert(votacao).values(v)
      await db.insert(parlamentar).values([p1, p2])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p1.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: p2.id as string,
          voto: 'NAO',
        }),
      ])

      const result = await getVotosByVotacao(v.id as string, { voto: 'SIM' })
      expect(result).toHaveLength(1)
      expect(result[0]?.voto).toBe('SIM')
    })
  })

  describe('getVotosResumoPorPartido', () => {
    it('agrupa votos por partido e ordena por total desc', async () => {
      const v = buildVotacao()
      const pt1 = buildParlamentar({ nome: 'PT-1', partidoSigla: 'PT' })
      const pt2 = buildParlamentar({ nome: 'PT-2', partidoSigla: 'PT' })
      const pt3 = buildParlamentar({ nome: 'PT-3', partidoSigla: 'PT' })
      const pl1 = buildParlamentar({ nome: 'PL-1', partidoSigla: 'PL' })
      await db.insert(votacao).values(v)
      await db.insert(parlamentar).values([pt1, pt2, pt3, pl1])
      await db.insert(votoNominal).values([
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pt1.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pt2.id as string,
          voto: 'SIM',
        }),
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pt3.id as string,
          voto: 'NAO',
        }),
        buildVotoNominal({
          votacaoId: v.id as string,
          parlamentarId: pl1.id as string,
          voto: 'SIM',
        }),
      ])

      const result = await getVotosResumoPorPartido(v.id as string)
      // PT primeiro (3 votos) > PL (1)
      expect(result).toHaveLength(2)
      expect(result[0]?.partidoSigla).toBe('PT')
      expect(result[0]?.sim).toBe(2)
      expect(result[0]?.nao).toBe(1)
      expect(result[0]?.total).toBe(3)
      expect(result[1]?.partidoSigla).toBe('PL')
      expect(result[1]?.sim).toBe(1)
      expect(result[1]?.total).toBe(1)
    })
  })

  describe('getAnosVotacaoDistintos', () => {
    it('retorna anos distintos extraídos de dataHora ordenados desc', async () => {
      await db
        .insert(votacao)
        .values([
          buildVotacao({ dataHora: new Date('2024-01-01T10:00:00Z') }),
          buildVotacao({ dataHora: new Date('2026-06-01T10:00:00Z') }),
          buildVotacao({ dataHora: new Date('2024-12-01T10:00:00Z') }),
        ])

      const result = await getAnosVotacaoDistintos()
      expect(result).toEqual([2026, 2024])
    })
  })
})
