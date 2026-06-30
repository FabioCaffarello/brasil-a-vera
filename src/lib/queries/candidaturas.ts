import { asc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { tseCandidatura } from '@/shared/db/schema'

// Histórico de candidaturas TSE vinculadas ao parlamentar via CPF (L2).
// Câmara-only na prática — senadores sem CPF na base não têm vínculo.
// Cache 24h (mesma cadência da ingestão TSE).

export interface CandidaturaTse {
  id: string
  anoEleicao: number
  dsCargo: string
  sgUf: string
  dsSituacaoCandidatura: string
  sqCandidato: number
  qtVotosNominais: number | null
}

export async function getCandidaturasByParlamentar(
  parlamentarId: string,
): Promise<CandidaturaTse[]> {
  return cached(
    `parlamentar:candidaturas-tse:${parlamentarId}`,
    TTL.patrimonioDeclarado,
    async () => {
      return db
        .select({
          id: tseCandidatura.id,
          anoEleicao: tseCandidatura.anoEleicao,
          dsCargo: tseCandidatura.dsCargo,
          sgUf: tseCandidatura.sgUf,
          dsSituacaoCandidatura: tseCandidatura.dsSituacaoCandidatura,
          sqCandidato: tseCandidatura.sqCandidato,
          qtVotosNominais: tseCandidatura.qtVotosNominais,
        })
        .from(tseCandidatura)
        .where(eq(tseCandidatura.parlamentarId, parlamentarId))
        .orderBy(asc(tseCandidatura.anoEleicao))
    },
  )
}
