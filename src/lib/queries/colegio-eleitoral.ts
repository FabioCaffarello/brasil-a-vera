import { and, desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { tseCandidatura, votoCandidatoMunicipio } from '@/shared/db/schema'

// Colégio eleitoral municipal (ADR-065): de quais municípios vieram os votos
// do parlamentar em cada pleito. Join lógico voto↔candidatura por
// (ano_eleicao, sq_candidato) — sem FK física, mesmo padrão dos bens.
// O denominador do % de concentração é tse_candidatura.qt_votos_nominais
// (total integral do pleito, gravado pela mesma ingestão); a distribuição
// persistida é parcial (top-20 municípios por pleito — ADR-065 §E3).
// Cache 24h (mesma cadência da ingestão TSE, igual às demais queries do eixo).

export interface MunicipioColegio {
  codigo: string
  nome: string
  uf: string
  votos: number
}

export interface ColegioEleitoralPleito {
  anoEleicao: number
  dsCargo: string
  /** Total integral de votos nominais do pleito (denominador do %). */
  totalVotos: number | null
  /** Top municípios persistidos, desc por votos (≤ 20). */
  municipios: MunicipioColegio[]
}

export async function getColegioEleitoral(
  parlamentarId: string,
): Promise<ColegioEleitoralPleito[]> {
  return cached(
    `parlamentar:colegio-eleitoral:${parlamentarId}`,
    TTL.patrimonioDeclarado,
    async () => {
      const rows = await db
        .select({
          anoEleicao: votoCandidatoMunicipio.anoEleicao,
          dsCargo: tseCandidatura.dsCargo,
          totalVotos: tseCandidatura.qtVotosNominais,
          codigo: votoCandidatoMunicipio.municipioTseCodigo,
          nome: votoCandidatoMunicipio.municipioNome,
          uf: votoCandidatoMunicipio.uf,
          votos: votoCandidatoMunicipio.qtVotosNominais,
        })
        .from(votoCandidatoMunicipio)
        .innerJoin(
          tseCandidatura,
          and(
            eq(tseCandidatura.anoEleicao, votoCandidatoMunicipio.anoEleicao),
            eq(tseCandidatura.sqCandidato, votoCandidatoMunicipio.sqCandidato),
          ),
        )
        .where(eq(tseCandidatura.parlamentarId, parlamentarId))
        .orderBy(
          desc(votoCandidatoMunicipio.anoEleicao),
          desc(votoCandidatoMunicipio.qtVotosNominais),
        )

      const pleitos: ColegioEleitoralPleito[] = []
      for (const row of rows) {
        let pleito = pleitos.at(-1)
        if (!pleito || pleito.anoEleicao !== row.anoEleicao) {
          pleito = {
            anoEleicao: row.anoEleicao,
            dsCargo: row.dsCargo,
            totalVotos: row.totalVotos,
            municipios: [],
          }
          pleitos.push(pleito)
        }
        pleito.municipios.push({
          codigo: row.codigo,
          nome: row.nome,
          uf: row.uf,
          votos: row.votos,
        })
      }
      return pleitos
    },
  )
}
