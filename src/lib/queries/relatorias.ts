import { desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  agregarDistribuicaoAutoria,
  type DistribuicaoAutoria,
} from '@/modules/proposicoes/domain/relatorias'
import { db } from '@/shared/db'
import {
  parlamentar,
  proposicao,
  proposicaoAutor,
  relatoria,
} from '@/shared/db/schema'

// Camada de dados do confronto de relatorias (ADR-044). Dois ângulos
// determinísticos, em funções separadas:
//   - getRelatoriasInfluencia → "relatou N proposições" (L2);
//   - getRelatorAutoria       → distribuição partidária dos autores (L2).
// Fail-closed (D3/D4): só conta relatorias com parlamentar mapeado e autores
// que mapeiam um parlamentar (autores externos — Comissão/Mesa — ficam de fora).
// Cache de edge 24h (ADR-018), alinhado à ingestão semanal.

const RECENTES_LIMIT = 10

export interface ProposicaoRelatada {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
}

export interface RelatoriasInfluenciaResult {
  /** Nº de proposições em que é o relator vigente/último (não histórico). */
  total: number
  /** As mais recentes (por ano/número), para exibição. */
  recentes: ProposicaoRelatada[]
}

export async function getRelatoriasInfluencia(
  parlamentarId: string,
): Promise<RelatoriasInfluenciaResult> {
  return cached(
    `parlamentar:relatorias:influencia:${parlamentarId}`,
    TTL.relatorias,
    async () => {
      const rows = await db
        .select({
          proposicaoId: proposicao.id,
          tipo: proposicao.tipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
        })
        .from(relatoria)
        .innerJoin(proposicao, eq(proposicao.id, relatoria.proposicaoId))
        .where(eq(relatoria.parlamentarId, parlamentarId))
        .orderBy(desc(proposicao.ano), desc(proposicao.numero))

      return { total: rows.length, recentes: rows.slice(0, RECENTES_LIMIT) }
    },
  )
}

export async function getRelatorAutoria(
  parlamentarId: string,
): Promise<DistribuicaoAutoria> {
  return cached(
    `parlamentar:relatorias:autoria:${parlamentarId}`,
    TTL.relatorias,
    async () => {
      // Partido (atual) de cada autor das proposições relatadas. innerJoin em
      // parlamentar exclui autores externos sem parlamentar (fail-closed).
      const rows = await db
        .select({ partido: parlamentar.partidoSigla })
        .from(relatoria)
        .innerJoin(
          proposicaoAutor,
          eq(proposicaoAutor.proposicaoId, relatoria.proposicaoId),
        )
        .innerJoin(
          parlamentar,
          eq(parlamentar.id, proposicaoAutor.parlamentarId),
        )
        .where(eq(relatoria.parlamentarId, parlamentarId))

      return agregarDistribuicaoAutoria(rows.map((r) => r.partido))
    },
  )
}
