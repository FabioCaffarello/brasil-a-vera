import { and, eq, isNotNull } from 'drizzle-orm'

import { orientacao as orientacaoTable, votacao } from '@/shared/db/schema'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { warnSkipped } from '../shared/warnings'
import {
  buildOrientacoes,
  materiaSessaoKey,
  orientacoesRunFailed,
} from './orientacoes-mapper'
import { senadoOrientacaoRespostaSchema } from './orientacoes-schema'
import { fetchSenadoJson } from './senado-client'

// Overlay de orientação de bancada do Senado (ADR-042, #500).
//
// A orientação vem do feed `orientacaoBancada` (date-driven), que NÃO
// compartilha id de votação com `/votacao` — a espinha é o `/votacao`
// (`votacoes.ts`), e a orientação se anexa por **chave de conteúdo**
// `(matéria sigla/nº/ano + numeroSessao)`, persistida na `votacao` por
// `votacoes.ts`. Quando o grupo (matéria, sessão) tem mais de uma votação
// (matéria votada N× na sessão), não há desempate confiável → **fail-closed**:
// não anexa orientação e loga. Cobertura ~86% (probe ADR-042 §Emenda).
//
// Pré-requisito: `ingest:senado:votacoes` já rodou e populou
// `votacao.materia_*`/`numero_sessao`. Votações sem esses campos não casam.

const CASA = 'SENADO' as const
const DEFAULT_DAYS_BACK = 30

interface IngestionStats {
  votacoesComOrientacao: number
  matched: number
  unmatchedSemVotacao: number
  skippedColisao: number
  skippedChaveInvalida: number
  orientacoesUpserted: number
  votosNullSkipped: number
  votosUnmappedSkipped: number
}

// Índice (matéria+sessão) → votacao_id(s) das votações do Senado já persistidas.
async function loadVotacaoIndex(): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      id: votacao.id,
      sigla: votacao.materiaSigla,
      numero: votacao.materiaNumero,
      ano: votacao.materiaAno,
      sessao: votacao.numeroSessao,
    })
    .from(votacao)
    .where(and(eq(votacao.casa, CASA), isNotNull(votacao.materiaSigla)))

  const index = new Map<string, string[]>()
  for (const r of rows) {
    const key = materiaSessaoKey({
      sigla: r.sigla,
      numero: r.numero,
      ano: r.ano,
      numeroSessao: r.sessao,
    })
    if (key == null) continue
    const existing = index.get(key)
    if (existing) existing.push(r.id)
    else index.set(key, [r.id])
  }
  return index
}

export async function ingestOrientacoesSenado(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
  // A API espera YYYYMMDD. A faixa do `orientacaoBancada` é limitada a ~2 meses;
  // o cron diário cobre janela curta, backfills passam DATA_INICIO/FIM por mês.
  const range =
    opts.dataInicio && opts.dataFim
      ? {
          dataInicio: opts.dataInicio.replace(/-/g, ''),
          dataFim: opts.dataFim.replace(/-/g, ''),
        }
      : defaultDateRange(DEFAULT_DAYS_BACK, true)

  const index = await loadVotacaoIndex()

  const stats: IngestionStats = {
    votacoesComOrientacao: 0,
    matched: 0,
    unmatchedSemVotacao: 0,
    skippedColisao: 0,
    skippedChaveInvalida: 0,
    orientacoesUpserted: 0,
    votosNullSkipped: 0,
    votosUnmappedSkipped: 0,
  }

  const path = `/plenario/votacao/orientacaoBancada/${range.dataInicio}/${range.dataFim}`
  const raw = await fetchSenadoJson<unknown>(path)
  const parsed = senadoOrientacaoRespostaSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `Resposta inesperada de orientacaoBancada: ${parsed.error.issues
        .map((i) => i.message)
        .join('; ')}`,
    )
  }

  for (const v of parsed.data.votacoes ?? []) {
    const linhas = v.orientacoesLideranca ?? []
    if (linhas.length === 0) continue
    stats.votacoesComOrientacao++

    const key = materiaSessaoKey({
      sigla: v.siglaTipoMateria,
      numero: v.numeroMateria,
      ano: v.anoMateria,
      numeroSessao: v.numeroSessao,
    })
    if (key == null) {
      stats.skippedChaveInvalida++
      continue
    }

    const candidates = index.get(key) ?? []
    if (candidates.length === 0) {
      stats.unmatchedSemVotacao++
      continue
    }
    if (candidates.length > 1) {
      // Matéria votada N× na mesma sessão, sem desempate confiável: fail-closed.
      stats.skippedColisao++
      continue
    }

    const votacaoId = candidates[0]
    const built = buildOrientacoes(
      linhas.map((l) => ({ partido: l.partido, voto: l.voto })),
    )
    stats.votosNullSkipped += built.nullSkipped
    stats.votosUnmappedSkipped += built.unmappedSkipped

    await db.transaction(async (tx) => {
      await tx
        .delete(orientacaoTable)
        .where(eq(orientacaoTable.votacaoId, votacaoId))
      if (built.rows.length > 0) {
        await tx.insert(orientacaoTable).values(
          built.rows.map((r) => ({
            votacaoId,
            partidoSigla: r.partidoSigla,
            orientacao: r.orientacao,
            tipoLideranca: r.tipoLideranca,
          })),
        )
      }
    })

    stats.matched++
    stats.orientacoesUpserted += built.rows.length
  }

  warnSkipped({
    label: 'senado_orientacao_voto_null',
    count: stats.votosNullSkipped,
    reason: 'voto null no orientacaoBancada — linha pulada',
  })
  warnSkipped({
    label: 'senado_orientacao_colisao',
    count: stats.skippedColisao,
    reason: 'matéria votada N× na sessão sem desempate (fail-closed)',
  })
  warnSkipped({
    label: 'senado_orientacao_sem_votacao',
    count: stats.unmatchedSemVotacao,
    reason: 'votação não encontrada (rodar ingest:senado:votacoes na janela?)',
  })

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestOrientacoesSenado({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    console.log(
      JSON.stringify({
        event: 'ingest_orientacoes_senado_done',
        durationMs: Date.now() - started,
        ...stats,
      }),
    )
    // Sucesso parcial é normal (fail-closed em colisões — matéria votada N× na
    // sessão, sem desempate). Só falha se NADA casou E houve chave apontando
    // para votação inexistente no índice (indício real de votacoes não rodado
    // ou chave driftada) — ver orientacoesRunFailed. Run 100% colisão = exit 0.
    process.exit(orientacoesRunFailed(stats) ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_orientacoes_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
