import { eq } from 'drizzle-orm'

import { filiacaoPartidaria } from '@/shared/db/schema'
import { db } from './db'

// Período de filiação partidária normalizado, comum às duas casas (#502).
// `dataInicio`/`dataFim` em `YYYY-MM-DD` (colunas `date`); `dataFim` null = atual.
export interface FiliacaoPeriodo {
  partidoSigla: string
  dataInicio: string
  dataFim: string | null
}

// Idempotente: substitui em massa todas as filiações do parlamentar
// (DELETE-by-parlamentar + INSERT numa transação). Não há chave natural única
// estável (data_fim null), então a substituição em massa é a estratégia
// correta — princípio 5 do CLAUDE.md.
export async function persistFiliacoes(
  parlamentarId: string,
  periodos: FiliacaoPeriodo[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(filiacaoPartidaria)
      .where(eq(filiacaoPartidaria.parlamentarId, parlamentarId))
    if (periodos.length > 0) {
      await tx.insert(filiacaoPartidaria).values(
        periodos.map((p) => ({
          parlamentarId,
          partidoSigla: p.partidoSigla,
          dataInicio: p.dataInicio,
          dataFim: p.dataFim,
        })),
      )
    }
  })
}
