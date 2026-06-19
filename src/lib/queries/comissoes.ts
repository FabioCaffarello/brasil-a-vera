import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { cached, TTL } from '@/lib/cache'
import {
  type ComissoesView,
  shapeComissoes,
} from '@/modules/parlamentares/domain/comissoes-view'
import { db } from '@/shared/db'
import { membroComissao } from '@/shared/db/schema'
import {
  DATA_FIM_LEGISLATURA_ATUAL,
  DATA_INICIO_LEGISLATURA_ATUAL,
} from '@/shared/legislatura'

// Comissões de um parlamentar para o perfil, escopadas ao mandato corrente
// (legislatura 57). A Câmara já está só na leg.57 (ingestão #496); o filtro de
// data escopa a história all-time do Senado ao mesmo recorte → comparação justa
// entre as casas (issue #498). Ativo = data_fim NULL (issue #497).
//
// A separação ativo/histórico e a ordenação ficam na função pura shapeComissoes
// (testável sem banco). Cache de edge (ADR-018): TTL.parlamentarPerfil (1h).

// Colunas `date` comparam como texto 'YYYY-MM-DD'.
const MANDATO_INICIO = DATA_INICIO_LEGISLATURA_ATUAL.toISOString().slice(0, 10)
const MANDATO_FIM = DATA_FIM_LEGISLATURA_ATUAL.toISOString().slice(0, 10)

export async function getComissoesParlamentar(
  parlamentarId: string,
): Promise<ComissoesView> {
  return cached(
    `parlamentar:comissoes:${parlamentarId}`,
    TTL.parlamentarPerfil,
    async () => {
      const rows = await db
        .select({
          sigla: membroComissao.comissaoSigla,
          nome: membroComissao.comissaoNome,
          cargoOrigem: membroComissao.cargoOrigem,
          tipoParticipacao: membroComissao.tipoParticipacao,
          dataInicio: membroComissao.dataInicio,
          dataFim: membroComissao.dataFim,
        })
        .from(membroComissao)
        .where(
          and(
            eq(membroComissao.parlamentarId, parlamentarId),
            // Começou até o fim do mandato e está ativo OU encerrou dentro dele.
            lte(membroComissao.dataInicio, MANDATO_FIM),
            or(
              isNull(membroComissao.dataFim),
              gte(membroComissao.dataFim, MANDATO_INICIO),
            ),
          ),
        )

      return shapeComissoes(rows)
    },
  )
}
