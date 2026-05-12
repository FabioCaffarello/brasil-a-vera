import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getAnosDistintos,
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
  getVotacoesByProposicao,
  listProposicoes,
} from '@/lib/queries/proposicoes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
} from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildProposicao,
  buildProposicaoAutor,
  buildProposicaoTema,
} from '../fixtures/proposicoes'
import { buildVotacao } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/proposicoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('listProposicoes', () => {
    it('retorna array vazio em DB vazio', async () => {
      const result = await listProposicoes()
      expect(result).toEqual([])
    })

    it('filtra por tipo', async () => {
      await db
        .insert(proposicao)
        .values([
          buildProposicao({ tipo: 'PL', numero: 1, ano: 2026 }),
          buildProposicao({ tipo: 'PEC', numero: 2, ano: 2026 }),
        ])

      const result = await listProposicoes({ tipo: 'PL' })
      expect(result).toHaveLength(1)
      expect(result[0]?.tipo).toBe('PL')
    })

    it('ordena por desc(ano) e desc(numero)', async () => {
      await db
        .insert(proposicao)
        .values([
          buildProposicao({ numero: 10, ano: 2025, tipo: 'PL' }),
          buildProposicao({ numero: 5, ano: 2026, tipo: 'PL' }),
          buildProposicao({ numero: 100, ano: 2026, tipo: 'PL' }),
        ])

      const result = await listProposicoes()
      expect(result.map((r) => `${r.ano}/${r.numero}`)).toEqual([
        '2026/100',
        '2026/5',
        '2025/10',
      ])
    })
  })

  describe('getProposicaoByChave', () => {
    it('retorna proposicao quando tipo+numero+ano batem', async () => {
      const p = buildProposicao({ tipo: 'PEC', numero: 42, ano: 2026 })
      await db.insert(proposicao).values(p)

      const result = await getProposicaoByChave('PEC', 42, 2026)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(p.id)
    })

    it('retorna null quando chave não existe', async () => {
      const result = await getProposicaoByChave('PEC', 999, 2099)
      expect(result).toBeNull()
    })
  })

  describe('getTemasByProposicao', () => {
    it('retorna temas ordenados por nomeTema asc', async () => {
      const p = buildProposicao()
      await db.insert(proposicao).values(p)
      await db.insert(proposicaoTema).values([
        buildProposicaoTema({
          proposicaoId: p.id as string,
          codigoTema: 1,
          nomeTema: 'Saúde',
        }),
        buildProposicaoTema({
          proposicaoId: p.id as string,
          codigoTema: 2,
          nomeTema: 'Educação',
        }),
      ])

      const result = await getTemasByProposicao(p.id as string)
      expect(result.map((r) => r.nomeTema)).toEqual(['Educação', 'Saúde'])
    })
  })

  describe('getAutoresByProposicao', () => {
    it('retorna AUTOR antes de COAUTOR (asc tipoAutoria), depois por nome', async () => {
      const p = buildProposicao()
      const autorParlamentar = buildParlamentar({ nome: 'Maria' })
      const coautorParlamentar = buildParlamentar({ nome: 'João' })
      await db.insert(proposicao).values(p)
      await db
        .insert(parlamentar)
        .values([autorParlamentar, coautorParlamentar])
      await db.insert(proposicaoAutor).values([
        buildProposicaoAutor({
          proposicaoId: p.id as string,
          parlamentarId: coautorParlamentar.id as string,
          nome: 'João',
          tipoAutoria: 'COAUTOR',
        }),
        buildProposicaoAutor({
          proposicaoId: p.id as string,
          parlamentarId: autorParlamentar.id as string,
          nome: 'Maria',
          tipoAutoria: 'AUTOR',
        }),
      ])

      const result = await getAutoresByProposicao(p.id as string)
      expect(result).toHaveLength(2)
      expect(result[0]?.tipoAutoria).toBe('AUTOR')
      expect(result[0]?.nome).toBe('Maria')
      expect(result[0]?.parlamentarPartidoSigla).toBe('PT')
      expect(result[1]?.tipoAutoria).toBe('COAUTOR')
    })
  })

  describe('getVotacoesByProposicao', () => {
    it('retorna votações da proposição ordenadas por desc(dataHora)', async () => {
      const p = buildProposicao()
      await db.insert(proposicao).values(p)
      await db.insert(votacao).values([
        buildVotacao({
          proposicaoId: p.id as string,
          descricao: 'V antiga',
          dataHora: new Date('2026-01-01T10:00:00Z'),
        }),
        buildVotacao({
          proposicaoId: p.id as string,
          descricao: 'V recente',
          dataHora: new Date('2026-05-01T10:00:00Z'),
        }),
      ])

      const result = await getVotacoesByProposicao(p.id as string)
      expect(result).toHaveLength(2)
      expect(result[0]?.descricao).toBe('V recente')
      expect(result[1]?.descricao).toBe('V antiga')
    })
  })

  describe('getAnosDistintos', () => {
    it('retorna anos distintos ordenados desc', async () => {
      await db
        .insert(proposicao)
        .values([
          buildProposicao({ ano: 2024, numero: 1 }),
          buildProposicao({ ano: 2026, numero: 2 }),
          buildProposicao({ ano: 2024, numero: 3 }),
          buildProposicao({ ano: 2025, numero: 4 }),
        ])

      const result = await getAnosDistintos()
      expect(result).toEqual([2026, 2025, 2024])
    })
  })
})
