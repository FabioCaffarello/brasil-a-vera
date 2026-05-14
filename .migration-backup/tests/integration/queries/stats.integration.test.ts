import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getDbStats } from '@/lib/queries/stats'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildProposicao } from '../fixtures/proposicoes'
import { buildVotacao } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/stats (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  describe('getDbStats', () => {
    it('em DB vazio retorna rowCounts zerados e lastIngestion null', async () => {
      const result = await getDbStats()

      expect(result.database.sizeBytes).toBeGreaterThan(0)
      expect(result.database.sizeMb).toBeGreaterThan(0)

      // 11 tabelas em ROW_COUNT_TABLES
      expect(Object.keys(result.rowCounts).length).toBe(11)
      for (const v of Object.values(result.rowCounts)) {
        expect(v).toBe(0)
      }

      // 4 roots em LAST_INGESTION_TABLES, todos null em DB vazio
      expect(result.lastIngestion).toEqual({
        parlamentar: null,
        proposicao: null,
        votacao: null,
        gasto: null,
      })
    })

    it('com dados retorna counts corretos e lastIngestion como ISO string', async () => {
      await db
        .insert(parlamentar)
        .values([buildParlamentar(), buildParlamentar()])
      await db.insert(proposicao).values(buildProposicao())
      await db.insert(votacao).values(buildVotacao())

      const result = await getDbStats()

      expect(result.rowCounts['parlamentares.parlamentar']).toBe(2)
      expect(result.rowCounts['proposicoes.proposicao']).toBe(1)
      expect(result.rowCounts['votacoes.votacao']).toBe(1)
      expect(result.rowCounts['gastos.gasto']).toBe(0)

      // lastIngestion: ingestedAt tem default now() → string parseável como
      // Date. Formato exato difere entre drivers (`neon-http` retorna Date
      // serializável como ISO; `pg` retorna Postgres native string como
      // "2026-05-12 23:24:36.740714+00"). Limitação documentada em ADR-015.
      // Teste valida o que importa pro consumidor: string parseável como
      // Date válida.
      expect(result.lastIngestion.parlamentar).not.toBeNull()
      const parsed = new Date(result.lastIngestion.parlamentar as string)
      expect(Number.isNaN(parsed.getTime())).toBe(false)
      expect(result.lastIngestion.gasto).toBeNull()
    })
  })
})
