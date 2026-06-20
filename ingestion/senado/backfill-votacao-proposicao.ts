import { and, eq, isNotNull, isNull } from 'drizzle-orm'

import { proposicao, votacao } from '@/shared/db/schema'
import { db } from '../shared/db'

// Backfill `votacao.proposicao_id` para votações do Senado (ADR-042, #501).
//
// Diferente da Câmara (que busca o detalhe `/votacoes/{id}`), aqui o vínculo é
// **sem fetch**: `votacoes.ts` já persiste `votacao.codigo_materia` (= o
// `codigoMateria` do `/votacao`), e `proposicoes.ts` grava o mesmo código em
// `proposicao.source_id_senado`. O vínculo é um lookup direto por esse id.
//
// Idempotente: só toca votações com `proposicao_id IS NULL` e `codigo_materia`
// presente. Matérias que não são proposições no nosso modelo (OFS, MSF, RQS…)
// simplesmente não casam e ficam NULL — correto, não é falha. Roda tier 3
// (depois de senado-proposicoes) para maximizar a resolução no mesmo run.

const CASA = 'SENADO' as const

interface BackfillStats {
  votacoesElegiveis: number
  matched: number
  naoEncontradas: number
}

// Lookup source_id_senado → proposicao.id (= codigoMateria → id).
async function loadProposicaoSenadoLookup(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: proposicao.id, sourceIdSenado: proposicao.sourceIdSenado })
    .from(proposicao)
    .where(isNotNull(proposicao.sourceIdSenado))
  const map = new Map<string, string>()
  for (const r of rows) {
    if (r.sourceIdSenado) map.set(r.sourceIdSenado, r.id)
  }
  return map
}

export async function backfillVotacaoProposicaoSenado(): Promise<BackfillStats> {
  const lookup = await loadProposicaoSenadoLookup()

  const elegiveis = await db
    .select({ id: votacao.id, codigoMateria: votacao.codigoMateria })
    .from(votacao)
    .where(
      and(
        eq(votacao.casa, CASA),
        isNull(votacao.proposicaoId),
        isNotNull(votacao.codigoMateria),
      ),
    )

  const stats: BackfillStats = {
    votacoesElegiveis: elegiveis.length,
    matched: 0,
    naoEncontradas: 0,
  }

  for (const v of elegiveis) {
    const proposicaoId = lookup.get(String(v.codigoMateria))
    if (!proposicaoId) {
      stats.naoEncontradas++
      continue
    }
    await db.update(votacao).set({ proposicaoId }).where(eq(votacao.id, v.id))
    stats.matched++
  }

  return stats
}

const started = Date.now()
backfillVotacaoProposicaoSenado()
  .then((stats) => {
    console.log(
      JSON.stringify({
        event: 'backfill_votacao_proposicao_senado_done',
        durationMs: Date.now() - started,
        ...stats,
      }),
    )
    process.exit(0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'backfill_votacao_proposicao_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
