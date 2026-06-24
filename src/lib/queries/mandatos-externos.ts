import { asc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { mandatoExterno } from '@/shared/db/schema'

// Mandatos externos de deputados (Sprint 14.0, G11).
// Fonte: GET /deputados/{id}/mandatosExternos — TSE-verificado, não autodeclarado.
// Cache 24h (TTL.mandatosExternos) — ingestão mensal, dado histórico estático.

export interface MandatoExterno {
  cargo: string
  siglaUf: string | null
  municipio: string | null
  anoInicio: number | null
  anoFim: number | null
  siglaPartidoEleicao: string | null
}

export async function getMandatosExternosByParlamentar(
  parlamentarId: string,
): Promise<MandatoExterno[]> {
  return cached(
    `parlamentar:mandatos-externos:${parlamentarId}`,
    TTL.mandatosExternos,
    async () => {
      return db
        .select({
          cargo: mandatoExterno.cargo,
          siglaUf: mandatoExterno.siglaUf,
          municipio: mandatoExterno.municipio,
          anoInicio: mandatoExterno.anoInicio,
          anoFim: mandatoExterno.anoFim,
          siglaPartidoEleicao: mandatoExterno.siglaPartidoEleicao,
        })
        .from(mandatoExterno)
        .where(eq(mandatoExterno.parlamentarId, parlamentarId))
        .orderBy(asc(mandatoExterno.anoInicio))
    },
  )
}
