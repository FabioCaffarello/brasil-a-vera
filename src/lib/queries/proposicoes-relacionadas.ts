import { and, desc, eq, ne } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  estatisticaProposicaoAgregada,
  proposicao,
  proposicaoAutor,
} from '@/shared/db/schema'

import type { SituacaoProposicao, TipoProposicao } from './proposicoes'

// Queries de "proposições relacionadas" para o footer cross-links do
// detalhe (Wave 8 Sprint 8.2 PR5). Dois critérios de relação:
//
// - **Mesmo autor**: outras proposições assinadas pelo MESMO parlamentar
//   como autor principal. Filtro `tipoAutoria='AUTOR'` aplicado pela mesma
//   razão da decisão resolvida #2 da rodada 2 (chart de apoio): coautores
//   entram em massa por gesto político público e não representam trabalho
//   real do parlamentar. Honestidade > volume.
//
// - **Mesmo tema canônico**: outras proposições com o mesmo
//   `tema_canonico_codigo` na tabela agregada (pré-computado pelo seed da
//   Wave 8 — tema com maior cardinalidade global entre os catalogados,
//   decisão resolvida #4). Footer suprime o bloco quando ambos os lados
//   retornam vazio (contrato de fallback §`tema_canonico_orphan`).
//
// Ordenação ano DESC, numero DESC — consistente com `listProposicoes`
// (default da listagem). Limite default 5 — cabe em UI mobile sem
// scroll-overflow.

export interface ProposicaoRelacionada {
  id: string
  tipo: TipoProposicao
  numero: number
  ano: number
  ementa: string
  situacao: SituacaoProposicao
  sourceUrl: string
}

/**
 * Top N proposições do mesmo parlamentar como autor principal,
 * excluindo a proposição atual (passada via `exceptProposicaoId`).
 *
 * Retorna lista vazia quando o parlamentar não tem outras autorias
 * (autor único). Caller decide se suprime o bloco ou exibe mensagem.
 */
export async function getProposicoesMesmoAutor(
  parlamentarId: string,
  exceptProposicaoId: string,
  limit = 5,
): Promise<ProposicaoRelacionada[]> {
  return cached(
    `proposicoes:mesmo_autor:${parlamentarId}:except:${exceptProposicaoId}:limit:${limit}`,
    TTL.proposicoesRelacionadas,
    async () => {
      return db
        .selectDistinct({
          id: proposicao.id,
          tipo: proposicao.tipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          situacao: proposicao.situacao,
          sourceUrl: proposicao.sourceUrl,
        })
        .from(proposicao)
        .innerJoin(
          proposicaoAutor,
          eq(proposicaoAutor.proposicaoId, proposicao.id),
        )
        .where(
          and(
            eq(proposicaoAutor.parlamentarId, parlamentarId),
            eq(proposicaoAutor.tipoAutoria, 'AUTOR'),
            ne(proposicao.id, exceptProposicaoId),
          ),
        )
        .orderBy(desc(proposicao.ano), desc(proposicao.numero))
        .limit(limit)
    },
  )
}

/**
 * Top N proposições com o mesmo tema canônico, excluindo a proposição
 * atual. Tema canônico = coluna `tema_canonico_codigo` da tabela
 * agregada (pré-computado pelo seed — tema com maior cardinalidade
 * global, decisão resolvida #4 da rodada 2).
 *
 * Retorna lista vazia quando:
 * - Nenhuma outra proposição compartilha o tema canônico
 * - O seed ainda não rodou (agregado vazio → todos `tema_canonico_codigo`
 *   são NULL → query INNER JOIN não casa nada)
 *
 * Em ambos os casos, footer suprime o bloco (P2 — honestidade).
 */
export async function getProposicoesMesmoTema(
  temaCodigo: number,
  exceptProposicaoId: string,
  limit = 5,
): Promise<ProposicaoRelacionada[]> {
  return cached(
    `proposicoes:mesmo_tema:${temaCodigo}:except:${exceptProposicaoId}:limit:${limit}`,
    TTL.proposicoesRelacionadas,
    async () => {
      return db
        .select({
          id: proposicao.id,
          tipo: proposicao.tipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          situacao: proposicao.situacao,
          sourceUrl: proposicao.sourceUrl,
        })
        .from(proposicao)
        .innerJoin(
          estatisticaProposicaoAgregada,
          eq(estatisticaProposicaoAgregada.proposicaoId, proposicao.id),
        )
        .where(
          and(
            eq(estatisticaProposicaoAgregada.temaCanonicoCodigo, temaCodigo),
            ne(proposicao.id, exceptProposicaoId),
          ),
        )
        .orderBy(desc(proposicao.ano), desc(proposicao.numero))
        .limit(limit)
    },
  )
}
