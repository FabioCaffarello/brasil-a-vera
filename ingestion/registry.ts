import { z } from 'zod'

// Registro config-driven das ingestões (ADR-035). Fonte ÚNICA da verdade: os
// workflows .github/workflows/ingestion*.yml derivam seus jobs deste array via
// matrix (ver ingestion/ops/print-matrix.ts). Adicionar uma fonte/entidade
// nova = 1 entrada aqui — zero job YAML novo.
//
// Por que aqui e não em JSON: princípio 2 (Zod no boundary) + testável em
// vitest (registry.test.ts cruza `script` com package.json e valida tiers).

// Cadências = buckets de agendamento, um por workflow:
//   daily    → ingestion-daily.yml  (0 2 * * *) — inclui votações desde ADR-035
//   weekly   → ingestion-weekly.yml (0 3 * * 0)
//   monthly  → (sem entradas hoje; schema pronto p/ quando surgir — ADR-035)
export const cadenceSchema = z.enum(['daily', 'weekly', 'monthly'])
export type Cadence = z.infer<typeof cadenceSchema>

export const ingestionSourceSchema = z.object({
  // Identificador estável e único. Vira o nome do job na matrix (legível no
  // rollup do run).
  id: z.string().min(1),
  // Script npm a rodar (precisa existir em package.json — checado no teste).
  script: z.string().min(1),
  // Chave de dedupe da issue de incidente (action notify-failure). Mantida
  // explícita p/ preservar continuidade do dedupe das issues já abertas.
  context: z.string().min(1),
  cadence: cadenceSchema,
  // Ordena dependências DENTRO da cadência: tier N+1 só roda após todo tier N
  // (sobre-aproximação segura do DAG; ver ADR-035). Tiers contíguos a partir
  // de 0 (checado no teste).
  tier: z.number().int().min(0),
  // Timeout do job (minutos). Aplicado por entrada via matrix.
  timeoutMin: z.number().int().positive(),
})
export type IngestionSource = z.infer<typeof ingestionSourceSchema>

export const ingestionSourcesSchema = z.array(ingestionSourceSchema)

// As 11 unidades de ingestão atuais (Câmara + Senado). DAG preservado via tier:
//   daily:  t0 deputados, votacoes-camara, votacoes-senado
//           t1 senadores, proposicoes-camara, orientacoes
//           t2 proposicoes-senado, backfill (votação→proposição no mesmo run)
//   weekly: {gastos, tramitacao-camara, tramitacao-senado}  (independentes)
export const SOURCES: readonly IngestionSource[] = ingestionSourcesSchema.parse(
  [
    // ── daily ───────────────────────────────────────────────────────────────
    {
      id: 'camara-deputados',
      script: 'ingest:camara:deputados',
      context: 'ingestion-camara-deputados',
      cadence: 'daily',
      tier: 0,
      timeoutMin: 15,
    },
    {
      id: 'senado-senadores',
      script: 'ingest:senado:senadores',
      context: 'ingestion-senado-senadores',
      cadence: 'daily',
      tier: 1,
      timeoutMin: 15,
    },
    {
      id: 'camara-proposicoes',
      script: 'ingest:camara:proposicoes',
      context: 'ingestion-camara-proposicoes',
      cadence: 'daily',
      tier: 1,
      timeoutMin: 60,
    },
    {
      id: 'senado-proposicoes',
      script: 'ingest:senado:proposicoes',
      context: 'ingestion-senado-proposicoes',
      cadence: 'daily',
      tier: 2,
      timeoutMin: 60,
    },
    // ── daily · votações e derivados (consolidados no daily — ADR-035) ────────
    {
      id: 'camara-votacoes',
      script: 'ingest:camara:votacoes',
      context: 'ingestion-camara-votacoes',
      cadence: 'daily',
      tier: 0,
      timeoutMin: 30,
    },
    {
      id: 'senado-votacoes',
      script: 'ingest:senado:votacoes',
      context: 'ingestion-senado-votacoes',
      cadence: 'daily',
      tier: 0,
      timeoutMin: 15,
    },
    {
      id: 'camara-orientacoes',
      script: 'ingest:camara:orientacoes',
      context: 'ingestion-camara-orientacoes',
      cadence: 'daily',
      tier: 1,
      timeoutMin: 30,
    },
    {
      // tier 2: backfill liga votação→proposição; agora roda DEPOIS de
      // proposicoes-camara (t1) no mesmo run, não dependendo de run anterior.
      id: 'camara-backfill-votacao-proposicao',
      script: 'backfill:camara:votacao-proposicao',
      context: 'ingestion-backfill-votacao-proposicao',
      cadence: 'daily',
      tier: 2,
      timeoutMin: 20,
    },
    // ── weekly ──────────────────────────────────────────────────────────────
    {
      id: 'camara-gastos',
      script: 'ingest:camara:gastos',
      context: 'ingestion-camara-gastos',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 30,
    },
    {
      id: 'camara-tramitacao',
      script: 'ingest:camara:tramitacao',
      context: 'ingestion-camara-tramitacao',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 60,
    },
    {
      id: 'senado-tramitacao',
      script: 'ingest:senado:tramitacao',
      context: 'ingestion-senado-tramitacao',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 90,
    },
    // ── monthly ───────────────────────────────────────────────────────────
    // Eixo 2 / Inc 0 — Trilha Patrimonial. Dado histórico do TSE (2022) que só
    // muda quando o TSE reedita declarações: cadência mensal idempotente.
    // DAG via tier: o vínculo por CPF exige parlamentar.cpf preenchido, então
    // o backfill de CPF (Câmara) roda ANTES da ingestão de bens.
    //   t0: backfill-cpf (no-op barato após preencher)
    //   t1: tse-bens (download 2 zips TSE + upsert + vínculo)
    {
      id: 'camara-backfill-cpf',
      script: 'backfill:camara:cpf',
      context: 'ingestion-camara-backfill-cpf',
      cadence: 'monthly',
      tier: 0,
      timeoutMin: 30,
    },
    {
      id: 'tse-bens-2022',
      script: 'ingest:tse:bens',
      context: 'ingestion-tse-bens-2022',
      cadence: 'monthly',
      tier: 1,
      timeoutMin: 20,
    },
  ],
)
