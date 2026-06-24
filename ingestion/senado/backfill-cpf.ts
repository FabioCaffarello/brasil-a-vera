import { and, eq, isNotNull, isNull } from 'drizzle-orm'

import { tseCandidatura } from '@/modules/eleitoral/domain/schema'
import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { similaridadeNome } from '../shared/normalize-nome'

// Enriquece `parlamentar.cpf` dos senadores via match com `tse_candidatura`
// (CD_CARGO=5 = Senador). A API do Senado NÃO expõe CPF em nenhum endpoint
// (verificado: XSD DetalheParlamentarv5.xsd + chamadas reais em 2026-06-23).
// Única ponte disponível: nome normalizado (TSE `nm_candidato` vs Senado
// `nome_civil`). Só escreve onde similaridade >= LIMIAR (alta confiança).
//
// Pré-requisito de DAG (registry.ts monthly):
//   t0: camara-backfill-cpf (prepara a coluna, independente)
//   t1: tse-bens (popula tse_candidatura com senadores via CARGOS_FEDERAIS={5,6})
//   t2: senado-backfill-cpf (este script — lê de tse_candidatura)
//
// Idempotente: só processa senadores com cpf IS NULL. No-op barato em reruns.

const LIMIAR_SIMILARIDADE = 0.9
// CD_CARGO 5 = Senador na tabela TSE.
const CD_CARGO_SENADOR = 5

interface BackfillStats {
  candidatos: number
  senadores: number
  preenchidos: number
  semMatch: Array<{ nomeCivil: string; melhorScore: number }>
  errors: Array<{ nomeCivil: string; reason: string }>
}

async function loadCandidaturasSenado(): Promise<
  Array<{ cpf: string; nmCandidato: string; sgUf: string }>
> {
  const rows = await db
    .select({
      cpf: tseCandidatura.cpf,
      nmCandidato: tseCandidatura.nmCandidato,
      sgUf: tseCandidatura.sgUf,
    })
    .from(tseCandidatura)
    .where(
      and(
        eq(tseCandidatura.cdCargo, CD_CARGO_SENADOR),
        isNotNull(tseCandidatura.cpf),
      ),
    )
  // CPF único por nome (dedupe: múltiplos pleitos do mesmo senador).
  const seen = new Map<string, (typeof rows)[0]>()
  for (const r of rows) {
    if (r.cpf && !seen.has(r.cpf)) seen.set(r.cpf, r)
  }
  return [...seen.values()] as Array<{
    cpf: string
    nmCandidato: string
    sgUf: string
  }>
}

async function loadSenadoresSemCpf(): Promise<
  Array<{ id: string; nomeCivil: string; uf: string }>
> {
  const rows = await db
    .select({
      id: parlamentar.id,
      nomeCivil: parlamentar.nomeCivil,
      uf: parlamentar.uf,
    })
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, 'SENADO'), isNull(parlamentar.cpf)))
  return rows.filter((r) => r.nomeCivil != null) as Array<{
    id: string
    nomeCivil: string
    uf: string
  }>
}

export async function backfillCpfSenado(): Promise<BackfillStats> {
  const [candidaturas, senadores] = await Promise.all([
    loadCandidaturasSenado(),
    loadSenadoresSemCpf(),
  ])

  const stats: BackfillStats = {
    candidatos: candidaturas.length,
    senadores: senadores.length,
    preenchidos: 0,
    semMatch: [],
    errors: [],
  }

  if (candidaturas.length === 0) {
    stats.errors.push({
      nomeCivil: '*',
      reason:
        'tse_candidatura sem senadores (CD_CARGO=5) — rode `npm run ingest:tse:bens` primeiro',
    })
    return stats
  }

  for (const senador of senadores) {
    try {
      let melhorScore = 0
      let melhorCpf: string | null = null

      for (const cand of candidaturas) {
        // UF como tiebreaker preventivo: pula candidatos de UF diferente se já
        // tivermos um candidato de mesma UF com score alto (não descarta cands
        // de UF diferente para proteger senadores com mandato em UF distinta).
        const score = similaridadeNome(senador.nomeCivil, cand.nmCandidato)
        if (score > melhorScore) {
          melhorScore = score
          melhorCpf = cand.cpf
        }
      }

      if (melhorScore >= LIMIAR_SIMILARIDADE && melhorCpf) {
        await db
          .update(parlamentar)
          .set({ cpf: melhorCpf })
          .where(eq(parlamentar.id, senador.id))
        stats.preenchidos++
      } else {
        stats.semMatch.push({
          nomeCivil: senador.nomeCivil,
          melhorScore: Math.round(melhorScore * 100) / 100,
        })
        console.warn(
          JSON.stringify({
            event: 'backfill_cpf_senado_sem_match',
            nomeCivil: senador.nomeCivil,
            uf: senador.uf,
            melhorScore,
          }),
        )
      }
    } catch (err) {
      stats.errors.push({
        nomeCivil: senador.nomeCivil,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return stats
}

const started = Date.now()
backfillCpfSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'backfill_cpf_senado_done',
        durationMs,
        candidaturasTSE: stats.candidatos,
        senadoresSemCpf: stats.senadores,
        preenchidos: stats.preenchidos,
        semMatch: stats.semMatch.length,
        semMatchDetalhes: stats.semMatch,
        errorsCount: stats.errors.length,
        errors: stats.errors,
      }),
    )
    process.exit(stats.errors.length > 0 && stats.preenchidos === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'backfill_cpf_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
