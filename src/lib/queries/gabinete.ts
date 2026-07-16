import { asc, eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { comissionadoGabinete } from '@/shared/db/schema'

// Comissionados de gabinete (ADR-064 E2): quem trabalha no gabinete do
// parlamentar e, no Senado, quanto custa (remuneração básica da competência
// mais recente). Câmara é fase 1 sem R$ (a Câmara não publica a tabela por
// nível em formato aberto) — remuneracaoBasicaCentavos vem null.
// Valores em CENTAVOS inteiros (o roundtrip JSON do edge cache preserva
// number; nunca retornar Map/Set/Date daqui — contrato do cached()).

export interface GabinetePessoa {
  /** Identificador da fonte (ponto Câmara / sequencial Senado) — key estável. */
  sourceId: string | null
  nome: string
  grupo: string
  cargo: string | null
  remuneracaoBasicaCentavos: number | null
}

export interface GabineteView {
  pessoas: GabinetePessoa[]
  total: number
  /** Soma da remuneração básica dos que têm valor; null quando ninguém tem. */
  custoBasicoMensalCentavos: number | null
  /** Competência da folha (YYYY-MM-DD, dia 01); null na Câmara. */
  mesReferencia: string | null
}

export async function getGabineteParlamentar(
  parlamentarId: string,
): Promise<GabineteView> {
  return cached(
    `parlamentar:gabinete:${parlamentarId}`,
    TTL.gabinete,
    async () => {
      const rows = await db
        .select({
          sourceId: comissionadoGabinete.sourceId,
          nome: comissionadoGabinete.nome,
          grupo: comissionadoGabinete.grupo,
          cargo: comissionadoGabinete.cargo,
          remuneracaoBasica: comissionadoGabinete.remuneracaoBasica,
          mesReferencia: comissionadoGabinete.mesReferencia,
        })
        .from(comissionadoGabinete)
        .where(eq(comissionadoGabinete.parlamentarId, parlamentarId))
        .orderBy(
          // Remuneração desc primeiro (Senado); sem valor, cargo+nome (Câmara).
          sql`${comissionadoGabinete.remuneracaoBasica} DESC NULLS LAST`,
          asc(comissionadoGabinete.cargo),
          asc(comissionadoGabinete.nome),
        )

      let custo = 0
      let temCusto = false
      let mesReferencia: string | null = null
      const pessoas: GabinetePessoa[] = rows.map((r) => {
        const centavos =
          r.remuneracaoBasica === null
            ? null
            : Math.round(Number(r.remuneracaoBasica) * 100)
        if (centavos !== null) {
          custo += centavos
          temCusto = true
        }
        if (r.mesReferencia !== null) mesReferencia = r.mesReferencia
        return {
          sourceId: r.sourceId,
          nome: r.nome,
          grupo: r.grupo,
          cargo: r.cargo,
          remuneracaoBasicaCentavos: centavos,
        }
      })

      return {
        pessoas,
        total: pessoas.length,
        custoBasicoMensalCentavos: temCusto ? custo : null,
        mesReferencia,
      }
    },
  )
}
