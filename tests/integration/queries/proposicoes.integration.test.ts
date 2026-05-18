import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import {
  getAnosDistintos,
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
  getTramitacaoByProposicao,
  getVotacoesByProposicao,
  listProposicoes,
} from '@/lib/queries/proposicoes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
  tramitacao,
} from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import {
  buildProposicao,
  buildProposicaoAutor,
  buildProposicaoTema,
  buildTramitacao,
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
      expect(result.rows).toEqual([])
      expect(result.nextCursor).toBeNull()
    })

    it('filtra por tipo', async () => {
      await db
        .insert(proposicao)
        .values([
          buildProposicao({ tipo: 'PL', numero: 1, ano: 2026 }),
          buildProposicao({ tipo: 'PEC', numero: 2, ano: 2026 }),
        ])

      const result = await listProposicoes({ tipo: 'PL' })
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]?.tipo).toBe('PL')
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
      expect(result.rows.map((r) => `${r.ano}/${r.numero}`)).toEqual([
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

  describe('getTramitacaoByProposicao', () => {
    it('retorna eventos ordenados por desc(data)', async () => {
      const p = buildProposicao()
      await db.insert(proposicao).values(p)
      await db.insert(tramitacao).values([
        buildTramitacao({
          proposicaoId: p.id as string,
          sourceId: '1',
          descricaoResumida: 'antiga',
          data: new Date('2026-01-01T10:00:00Z'),
        }),
        buildTramitacao({
          proposicaoId: p.id as string,
          sourceId: '2',
          descricaoResumida: 'recente',
          data: new Date('2026-05-01T10:00:00Z'),
        }),
      ])

      const result = await getTramitacaoByProposicao(p.id as string)
      expect(result).toHaveLength(2)
      expect(result[0]?.descricaoResumida).toBe('recente')
      expect(result[1]?.descricaoResumida).toBe('antiga')
    })

    it('retorna array vazio quando proposição não tem eventos', async () => {
      const p = buildProposicao()
      await db.insert(proposicao).values(p)
      const result = await getTramitacaoByProposicao(p.id as string)
      expect(result).toEqual([])
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

  describe('source_id por casa (issue #74)', () => {
    // Cada par de testes simula o INSERT ... ON CONFLICT DO UPDATE feito
    // pelos ingestores. O essencial é provar que o UPDATE de um ingestor
    // NÃO sobrescreve os campos da casa contrária — preservando rastro
    // independente das duas casas em proposições compartilhadas.

    it('Câmara seguida de Senado preserva source_id_camara e seta source_id_senado', async () => {
      // Simula ingestion/camara/proposicoes.ts:
      await db.insert(proposicao).values({
        sourceId: 'CAMARA-1',
        sourceIdCamara: 'CAMARA-1',
        tipo: 'PL',
        numero: 5000,
        ano: 2026,
        ementa: 'PL shared',
        situacao: 'TRAMITANDO',
        trustLevel: 'L1',
        sourceUrl:
          'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-1',
        sourceUrlCamara:
          'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-1',
      })

      // Simula ingestion/senado/proposicoes.ts rodando depois para a mesma
      // proposição (PL 5000/2026): mesmo (tipo, numero, ano).
      await db
        .insert(proposicao)
        .values({
          sourceId: 'SENADO-1',
          sourceIdSenado: 'SENADO-1',
          tipo: 'PL',
          numero: 5000,
          ano: 2026,
          ementa: 'PL shared (revisado pelo Senado)',
          situacao: 'TRAMITANDO',
          trustLevel: 'L1',
          sourceUrl: 'https://www25.senado.leg.br/.../SENADO-1',
          sourceUrlSenado: 'https://www25.senado.leg.br/.../SENADO-1',
        })
        .onConflictDoUpdate({
          target: [proposicao.tipo, proposicao.numero, proposicao.ano],
          set: {
            sourceId: 'SENADO-1',
            sourceIdSenado: 'SENADO-1',
            ementa: 'PL shared (revisado pelo Senado)',
            sourceUrl: 'https://www25.senado.leg.br/.../SENADO-1',
            sourceUrlSenado: 'https://www25.senado.leg.br/.../SENADO-1',
          },
        })

      const result = await getProposicaoByChave('PL', 5000, 2026)
      expect(result).not.toBeNull()
      expect(result?.sourceIdCamara).toBe('CAMARA-1')
      expect(result?.sourceIdSenado).toBe('SENADO-1')
      expect(result?.sourceUrlCamara).toContain('dadosabertos.camara')
      expect(result?.sourceUrlSenado).toContain('senado.leg.br')
      // source_id legado reflete o "último ingestor" — Senado neste caso.
      expect(result?.sourceId).toBe('SENADO-1')
    })

    it('Senado seguido de Câmara preserva source_id_senado e seta source_id_camara', async () => {
      await db.insert(proposicao).values({
        sourceId: 'SENADO-2',
        sourceIdSenado: 'SENADO-2',
        tipo: 'PEC',
        numero: 99,
        ano: 2026,
        ementa: 'PEC originada no Senado',
        situacao: 'TRAMITANDO',
        trustLevel: 'L1',
        sourceUrl: 'https://www25.senado.leg.br/.../SENADO-2',
        sourceUrlSenado: 'https://www25.senado.leg.br/.../SENADO-2',
      })

      await db
        .insert(proposicao)
        .values({
          sourceId: 'CAMARA-2',
          sourceIdCamara: 'CAMARA-2',
          tipo: 'PEC',
          numero: 99,
          ano: 2026,
          ementa: 'PEC revisada pela Câmara',
          situacao: 'TRAMITANDO',
          trustLevel: 'L1',
          sourceUrl:
            'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-2',
          sourceUrlCamara:
            'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-2',
        })
        .onConflictDoUpdate({
          target: [proposicao.tipo, proposicao.numero, proposicao.ano],
          set: {
            sourceId: 'CAMARA-2',
            sourceIdCamara: 'CAMARA-2',
            ementa: 'PEC revisada pela Câmara',
            sourceUrl:
              'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-2',
            sourceUrlCamara:
              'https://dadosabertos.camara.leg.br/api/v2/proposicoes/CAMARA-2',
          },
        })

      const result = await getProposicaoByChave('PEC', 99, 2026)
      expect(result).not.toBeNull()
      expect(result?.sourceIdSenado).toBe('SENADO-2')
      expect(result?.sourceIdCamara).toBe('CAMARA-2')
      expect(result?.sourceUrlSenado).toContain('senado.leg.br')
      expect(result?.sourceUrlCamara).toContain('dadosabertos.camara')
      expect(result?.sourceId).toBe('CAMARA-2')
    })
  })
})
