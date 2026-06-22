import { desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { agregarTemas, type Tema } from '@/modules/discursos/domain/temas'
import { db } from '@/shared/db'
import { discurso } from '@/shared/db/schema'

// Feature de discursos (ADR-048): temas (frequência de keywords da fonte) +
// discursos recentes (metadados + link ao inteiro teor). Determinístico, sem IA.
// Cache de edge 24h (ADR-018), alinhado à ingestão semanal.

const RECENTES_LIMIT = 8
const TOP_TEMAS = 12

export interface DiscursoRecente {
  data: Date | string
  tipo: string
  sumario: string | null
  urlTexto: string | null
}

export interface DiscursosResult {
  total: number
  temas: Tema[]
  recentes: DiscursoRecente[]
}

const EMPTY: DiscursosResult = { total: 0, temas: [], recentes: [] }

export async function getDiscursosParlamentar(
  parlamentarId: string,
): Promise<DiscursosResult> {
  return cached(
    `parlamentar:discursos:${parlamentarId}`,
    TTL.discursos,
    async () => {
      const rows = await db
        .select({
          data: discurso.data,
          tipo: discurso.tipo,
          sumario: discurso.sumario,
          keywords: discurso.keywords,
          urlTexto: discurso.urlTexto,
        })
        .from(discurso)
        .where(eq(discurso.parlamentarId, parlamentarId))
        .orderBy(desc(discurso.data))

      if (rows.length === 0) return EMPTY

      return {
        total: rows.length,
        temas: agregarTemas(
          rows.map((r) => r.keywords),
          TOP_TEMAS,
        ),
        recentes: rows.slice(0, RECENTES_LIMIT).map((r) => ({
          data: r.data,
          tipo: r.tipo,
          sumario: r.sumario,
          urlTexto: r.urlTexto,
        })),
      }
    },
  )
}
