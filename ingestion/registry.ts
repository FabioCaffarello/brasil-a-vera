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

// As unidades de ingestão atuais (Câmara + Senado). DAG preservado via tier.
// Os tiers seguem as dependências HARD reais (os guards que dão throw quando a
// raiz está vazia), não estado cross-run — por isso votações ficam ACIMA dos
// roots de parlamentar, e não no mesmo/abaixo (corrige #545):
//   daily:  t0 deputados, senadores            (roots de parlamentar)
//           t1 votacoes-{camara,senado}, proposicoes-{camara,senado}
//                                              (dependem dos roots)
//           t2 orientacoes-{camara,senado}, backfill-{camara,senado}
//                                              (dependem das votações/proposições do t1)
//   weekly: {gastos, tramitacao-camara, tramitacao-senado, comissoes-camara,
//           comissoes-senado}  (independentes)
// Nota: o workflow daily tem jobs tier0/tier1/tier2 — manter o máximo daily em
// t2 (um t3 seria emitido pela matrix mas não teria job que o consumisse).
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
      // Root de parlamentar do Senado. tier 0 junto com deputados: votações e
      // proposições do Senado (t1) dependem dele já no banco — #545.
      tier: 0,
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
      // tier 1: depende do root de parlamentar (autores). Pré-requisito do
      // backfill votação→proposição do Senado (t2).
      tier: 1,
      timeoutMin: 60,
    },
    // ── daily · votações e derivados (consolidados no daily — ADR-035) ────────
    {
      // tier 1: o produtor dá throw sem deputados no banco (guard explícito).
      // tier 0 (mesmo dos roots) era uma corrida — em prod achava os deputados
      // do run anterior; em DB frio falhava. Agora depende do t0 — #545.
      id: 'camara-votacoes',
      script: 'ingest:camara:votacoes',
      context: 'ingestion-camara-votacoes',
      cadence: 'daily',
      tier: 1,
      timeoutMin: 30,
    },
    {
      // tier 1: o produtor dá throw sem senadores no banco (guard explícito).
      // Era t0 enquanto senado-senadores era t1 — inversão do DAG que falhava em
      // DB frio (#545). Agora depende do root (t0).
      id: 'senado-votacoes',
      script: 'ingest:senado:votacoes',
      context: 'ingestion-senado-votacoes',
      cadence: 'daily',
      tier: 1,
      timeoutMin: 15,
    },
    {
      // tier 2: overlay de orientação; casa contra a votação populada por
      // camara-votacoes (t1) no mesmo run, por isso roda depois.
      id: 'camara-orientacoes',
      script: 'ingest:camara:orientacoes',
      context: 'ingestion-camara-orientacoes',
      cadence: 'daily',
      tier: 2,
      timeoutMin: 30,
    },
    {
      // tier 2: overlay de orientação do Senado (ADR-042). Casa por chave de
      // conteúdo (matéria+sessão) contra a `votacao` populada por
      // senado-votacoes (tier 1) no mesmo run; por isso roda depois.
      id: 'senado-orientacoes',
      script: 'ingest:senado:orientacoes',
      context: 'ingestion-senado-orientacoes',
      cadence: 'daily',
      tier: 2,
      timeoutMin: 15,
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
    {
      // tier 2: vínculo votação→proposição do Senado (ADR-042, #501). Lookup
      // local (sem fetch) codigo_materia → proposicao.source_id_senado; roda
      // depois de senado-proposicoes E senado-votacoes (ambos tier 1) para casar
      // no mesmo run. Era tier 3 — emitido pela matrix mas SEM job tier3 no
      // workflow daily, então NUNCA rodava em prod (#545).
      id: 'senado-backfill-votacao-proposicao',
      script: 'backfill:senado:votacao-proposicao',
      context: 'ingestion-backfill-votacao-proposicao-senado',
      cadence: 'daily',
      tier: 2,
      timeoutMin: 10,
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
    // Membros de comissão: composição muda poucas vezes/ano → weekly. tier 0:
    // dependem de parlamentar já populado (ingestão diária deputados/senadores
    // de runs anteriores), análogo à dependência cross-cadência de tse-bens.
    // Câmara é serial + pacing (detalhe /orgaos/{id} throttla bursts, igual ao
    // backfill-cpf) → timeout folgado.
    {
      id: 'camara-comissoes',
      script: 'ingest:camara:comissoes',
      context: 'ingestion-camara-comissoes',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 60,
    },
    {
      id: 'senado-comissoes',
      script: 'ingest:senado:comissoes',
      context: 'ingestion-senado-comissoes',
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
    // Discursos (#504): metadados da legislatura atual. tier 0 (dependem só de
    // parlamentar populado). Câmara é serial + pacing + paginado (timeout
    // folgado); Senado uma chamada por senador na janela.
    {
      id: 'camara-discursos',
      script: 'ingest:camara:discursos',
      context: 'ingestion-camara-discursos',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 90,
    },
    {
      id: 'senado-discursos',
      script: 'ingest:senado:discursos',
      context: 'ingestion-senado-discursos',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 30,
    },
    // Relatorias (#525 / ADR-044): relator vigente por proposição da Câmara.
    // Câmara-only. tier 0 — depende só de proposicao + parlamentar já populados
    // (ingestão diária de runs anteriores), como comissoes/discursos. Serial +
    // pacing + scan por proposição (detalhe throttla bursts, igual ao
    // backfill-cpf) → timeout folgado. Semanal: o relator muda durante a
    // tramitação.
    {
      id: 'camara-relatorias',
      script: 'ingest:camara:relatorias',
      context: 'ingestion-camara-relatorias',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 60,
    },
    // Relatorias do Senado (ADR-044 emenda 2026-06-21): per-senador, casa
    // 'SENADO'. tier 0 — depende de proposicao (source_id_senado) + parlamentar
    // já populados. Fonte LEGADA e fail-soft (ver ingestion/senado/relatorias.ts):
    // ~81 senadores, rápido; timeout enxuto.
    {
      id: 'senado-relatorias',
      script: 'ingest:senado:relatorias',
      context: 'ingestion-senado-relatorias',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 30,
    },
    // Presença física em sessões deliberativas de plenário (ADR-046).
    // Câmara-only. tier 0 — depende de parlamentar já populado. Pagina /eventos
    // + busca presença por sessão (detalhe throttla) → timeout folgado.
    {
      id: 'camara-sessoes',
      script: 'ingest:camara:sessoes',
      context: 'ingestion-camara-sessoes',
      cadence: 'weekly',
      tier: 0,
      timeoutMin: 60,
    },
    // ── monthly ───────────────────────────────────────────────────────────
    // Filiação partidária (#502): histórico que muda poucas vezes/ano →
    // mensal. tier 0: dependem só de parlamentar populado (daily), como o
    // backfill-cpf. Câmara deriva períodos do /historico (serial + pacing);
    // Senado lê períodos prontos de /filiacoes.
    {
      id: 'camara-filiacoes',
      script: 'ingest:camara:filiacoes',
      context: 'ingestion-camara-filiacoes',
      cadence: 'monthly',
      tier: 0,
      timeoutMin: 60,
    },
    // Perfil biográfico (ADR-049): escolaridade/nascimento/profissão dos
    // deputados. Câmara-only, autodeclarado, quase imutável → mensal. tier 0
    // (depende só de parlamentar populado). Serial + pacing (detalhe throttla,
    // igual ao backfill-cpf) → timeout folgado.
    {
      id: 'camara-backfill-bio',
      script: 'backfill:camara:bio',
      context: 'ingestion-camara-backfill-bio',
      cadence: 'monthly',
      tier: 0,
      timeoutMin: 60,
    },
    // Bio do Senado (ADR-049 emenda): nascimento + naturalidade (sem
    // escolaridade/profissão). Per-senador, mensal, tier 0.
    {
      id: 'senado-backfill-bio',
      script: 'backfill:senado:bio',
      context: 'ingestion-senado-backfill-bio',
      cadence: 'monthly',
      tier: 0,
      timeoutMin: 20,
    },
    {
      id: 'senado-filiacoes',
      script: 'ingest:senado:filiacoes',
      context: 'ingestion-senado-filiacoes',
      cadence: 'monthly',
      tier: 0,
      timeoutMin: 20,
    },
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
      // Serial + pacing (detalhe da Câmara rejeita bursts). 513 deputados a
      // ~0.5s ≈ 5min num IP saudável; folga grande p/ degradação da API. Em CI
      // o IP do runner pode ser throttled — caminho confiável é rodar local.
      timeoutMin: 60,
    },
    {
      id: 'tse-bens',
      script: 'ingest:tse:bens',
      context: 'ingestion-tse-bens',
      cadence: 'monthly',
      // 3 pleitos (2014/2018/2022) × 2 zips cada + upsert; anos isolados.
      tier: 1,
      timeoutMin: 30,
    },
    // CPF dos senadores via tse_candidatura (API do Senado não expõe CPF —
    // verificado: XSD DetalheParlamentarv5.xsd + curl 2026-06-23). Depende de
    // tse-bens (tier 1) ter populado tse_candidatura com CD_CARGO=5 antes de
    // rodar. No-op idempotente após preenchimento inicial.
    {
      id: 'senado-backfill-cpf',
      script: 'backfill:senado:cpf',
      context: 'ingestion-senado-backfill-cpf',
      cadence: 'monthly',
      tier: 2,
      timeoutMin: 5,
    },
  ],
)
