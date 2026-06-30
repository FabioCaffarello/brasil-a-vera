import { and, desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { eventoComissaoPresenca } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'

// Reuniões deliberativas de comissão onde o parlamentar esteve presente
// (Câmara-only, ADR-061/062). Ingestão semanal (janela 90 dias rolling).
// Cache 24h — dado quase-estático dentro do dia.

export interface PresencaComissaoItem {
  eventoId: string
  dataEvento: string
  descricaoTipo: string
  orgaoSigla: string | null
}

export async function getPresencaComissoes(
  parlamentarId: string,
  limit = 20,
): Promise<PresencaComissaoItem[]> {
  return cached(
    `parlamentar:presenca-comissoes:${parlamentarId}:n=${limit}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          eventoId: eventoComissaoPresenca.eventoId,
          dataEvento: eventoComissaoPresenca.dataEvento,
          descricaoTipo: eventoComissaoPresenca.descricaoTipo,
          orgaoSigla: eventoComissaoPresenca.orgaoSigla,
        })
        .from(eventoComissaoPresenca)
        .where(
          and(
            eq(eventoComissaoPresenca.parlamentarId, parlamentarId),
            eq(eventoComissaoPresenca.legislatura, LEGISLATURA_ATUAL),
          ),
        )
        .orderBy(desc(eventoComissaoPresenca.dataEvento))
        .limit(limit)

      return rows.map((r) => ({
        eventoId: r.eventoId,
        dataEvento: r.dataEvento,
        descricaoTipo: r.descricaoTipo,
        orgaoSigla: r.orgaoSigla,
      }))
    },
  )
}
