import { and, desc, eq, gte, isNull, or, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { afastamentoSenador } from '@/shared/db/schema'

// Afastamentos e licenças de senadores (ADR-058).
// Cache 24h (TTL.afastamentos) — ingestão mensal, dado quase-estático.

export interface AfastamentoAtivo {
  motivoSigla: string
  motivoDescricao: string | null
  dataInicio: string
  dataFim: string | null
}

// Retorna as licenças em curso: data_fim IS NULL (aberta) ou >= hoje.
// Senado-only — para deputados chamar com parlamentarId não existente
// retorna [] sem erro (tabela filtra por parlamentar_id).
export async function getAfastamentosAtivosSenador(
  parlamentarId: string,
): Promise<AfastamentoAtivo[]> {
  return cached(
    `parlamentar:afastamentos:${parlamentarId}`,
    TTL.afastamentos,
    async () => {
      const rows = await db
        .select({
          motivoSigla: afastamentoSenador.motivoSigla,
          motivoDescricao: afastamentoSenador.motivoDescricao,
          dataInicio: afastamentoSenador.dataInicio,
          dataFim: afastamentoSenador.dataFim,
        })
        .from(afastamentoSenador)
        .where(
          and(
            eq(afastamentoSenador.parlamentarId, parlamentarId),
            or(
              isNull(afastamentoSenador.dataFim),
              gte(afastamentoSenador.dataFim, sql`CURRENT_DATE`),
            ),
          ),
        )
        .orderBy(desc(afastamentoSenador.dataInicio))

      return rows.map((r) => ({
        motivoSigla: r.motivoSigla,
        motivoDescricao: r.motivoDescricao,
        dataInicio: r.dataInicio as string,
        dataFim: r.dataFim as string | null,
      }))
    },
  )
}
