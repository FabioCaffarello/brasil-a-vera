import { eq } from 'drizzle-orm'

import { discurso } from '@/shared/db/schema'
import { db } from './db'

// Discurso normalizado, comum às duas casas (#504). Sem texto integral
// (ADR-016): só metadados + resumo curto + url_texto (Senado). `data` é a
// string crua da API; convertida em Date na persistência.
export interface DiscursoMapped {
  sourceId: string | null
  data: string
  tipo: string
  sumario: string | null
  keywords: string | null
  urlTexto: string | null
}

type Casa = 'CAMARA' | 'SENADO'

// Idempotente: substitui em massa os discursos do parlamentar (DELETE-by-
// parlamentar + INSERT). A Câmara não dá id nativo de discurso, então a
// substituição em massa — e não um upsert por source_id — é a estratégia
// correta para reingestão da mesma janela (princípio 5).
export async function persistDiscursos(
  parlamentarId: string,
  casa: Casa,
  discursos: DiscursoMapped[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(discurso).where(eq(discurso.parlamentarId, parlamentarId))
    if (discursos.length > 0) {
      await tx.insert(discurso).values(
        discursos.map((d) => ({
          parlamentarId,
          casa,
          sourceId: d.sourceId,
          data: new Date(d.data),
          tipo: d.tipo,
          sumario: d.sumario,
          keywords: d.keywords,
          urlTexto: d.urlTexto,
          trustLevel: 'L1' as const,
        })),
      )
    }
  })
}
