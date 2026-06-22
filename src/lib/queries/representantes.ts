import { asc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { estatisticaParlamentarAgregada, parlamentar } from '@/shared/db/schema'

// Porta de entrada "Quem me representa": os parlamentares federais de uma UF
// (3 senadores + deputados). Junta o agregado (pct_alinhamento) para o card
// reusar a mesma barra da listagem. Cache de edge (ADR-018).

export interface RepresentanteCard {
  id: string
  nome: string
  casa: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
  pctAlinhamento: string | null
  votacoesAnalisadas: number | null
}

export interface Representantes {
  senadores: RepresentanteCard[]
  deputados: RepresentanteCard[]
}

export async function getRepresentantesPorUf(
  uf: string,
): Promise<Representantes> {
  return cached(`representantes:uf:${uf}`, TTL.parlamentarPerfil, async () => {
    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
        votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
      })
      .from(parlamentar)
      .leftJoin(
        estatisticaParlamentarAgregada,
        eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
      )
      .where(eq(parlamentar.uf, uf))
      .orderBy(asc(parlamentar.nome))

    return {
      senadores: rows.filter((r) => r.casa === 'SENADO'),
      deputados: rows.filter((r) => r.casa === 'CAMARA'),
    }
  })
}
