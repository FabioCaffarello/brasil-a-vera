# GitHub Actions Workflows

> Mapa rápido dos workflows ativos em `.github/workflows/`. Cada arquivo tem
> comentário próprio no topo explicando trigger e propósito; esta tabela é
> índice para inspeção rápida.

## Tabela

| Arquivo | Trigger | Cron | Propósito | Concurrency group |
|---|---|---|---|---|
| `ci.yml` | `push: main`, `pull_request` | — | Lint (Biome), build, testes unitários + integração com testcontainers. Gate de merge. | `CI-${ref}` (cancel-in-progress) |
| `deploy.yml` | `push: main`, `workflow_dispatch` | — | Migrations Drizzle → build OpenNext → `wrangler deploy` → smoke test. Preview deploys de PR rodam pela integração nativa Cloudflare ↔ GitHub. | `deploy-${ref}` (cancel-in-progress) |
| `ingestion-daily.yml` | `schedule`, `workflow_dispatch` | `0 2 * * *` (02:00 UTC = 23:00 BRT do dia anterior) | Sync diário: deputados, senadores, proposições, **votações** + derivados (orientações, backfill). Config-driven: `discover`→`tier0/1/2` (cadence=daily, [ADR-035](../architecture/ADR/035-orquestracao-ingestao-config-driven.md)). | `ingestion-daily` (no cancel) |
| `ingestion-weekly.yml` | `schedule`, `workflow_dispatch` | `0 3 * * 0` (domingo 03:00 UTC) | Pipelines pesados: gastos CEAP + tramitação Câmara/Senado. Config-driven: `discover`→`tier0` (cadence=weekly, ADR-035). | `ingestion-weekly` (no cancel) |
| `budget-poll.yml` | `schedule`, `workflow_dispatch` | `0 9 * * *` (09:00 UTC = 06:00 BRT) | Poll Neon API, estima custo mensal por run-rate, alerta progressivo conforme [ADR-017](../architecture/ADR/017-budget-mensal-observabilidade.md). | `budget-poll` (no cancel) |
| `alertas-cron.yml` | `schedule`, `workflow_dispatch` | `0 21 * * 0` (domingo 21:00 UTC = 18:00 BRT) | Dispara `POST /api/cron/alertas/run` — alertas semanais da área logada (Wave 10 Etapa 7). Idempotente via `idempotency_key`. | `alertas-cron` (no cancel) |
| `lgpd-cron.yml` | `schedule`, `workflow_dispatch` | `0 12 * * *` (12:00 UTC = 09:00 BRT) | Dispara `POST /api/cron/lgpd/run` — lembrete de hard-delete (25–29d) + hard delete (≥30d). Idempotente. | `lgpd-cron` (no cancel) |
| `pr-sanity.yml` | `pull_request` (opened, edited, synchronize) | — | Checagens leves de PR: descrição, checklist, tamanho do diff. Advisory — comenta sem falhar. | `pr-sanity-${PR}` (cancel-in-progress) |
| `design-tokens.yml` | `pull_request` (todo PR; skip interno por paths) | — | 1 job `zinc / HEX / primary-N legacy` (greps do `/design-token-check`; **required check** — o skip interno evita o "expected" eterno de path filter em workflow required). O job `RDS leak advisory` foi retirado em 2026-06-15 junto com a remoção do staging `/rds/` (migração RDS completa). | `design-tokens-${PR}` (cancel-in-progress) |
| `close-external-prs.yml` | `pull_request_target` (opened, reopened) | — | Fecha PRs de não-membros com comentário orientando issue (política [ADR-027](../architecture/ADR/027-licenca-polyform-noncommercial.md)). Sem checkout do código do fork. | — (sem concurrency; evento administrativo pontual) |
| `labels-sync.yml` | `workflow_dispatch` | — | Sincroniza `.github/labels.yml` com o repo via `gh label create --force`. Idempotente; disparo manual apenas. | `labels-sync` (no cancel) |

> O workflow `consolidation-guard.yml` foi **removido** junto com a conclusão
> da migração RDS (staging `/rds/` extinto); não há mais par de espelhamento a
> vigiar.

## Regime advisory

Sobra **um** check advisory (comenta sem bloquear):

- **`pr-sanity`** — advisory por falta de histórico: promove-se a required
  após 2 sprints sem falso positivo (critério registrado na decisão F8,
  PR #374).

Os antigos advisories `RDS leak advisory` e `consolidation-guard` eram
artefatos da migração RDS, ambos auto-extinguíveis por desenho (ADR-033 §4):
saíram quando a migração consolidou. O scan de tokens (`design-tokens.yml`) já
é **required**.

## Convenções aplicadas (audit 2026-05-13, issue #69)

- **Comentário no topo de cada workflow**: trigger + propósito em 2-5 linhas.
  Quem abre o arquivo entende quando ele dispara sem precisar caçar
  documentação separada.
- **`concurrency.group` em todos** (exceção: `close-external-prs.yml`, evento
  administrativo pontual): ingestão e crons usam group fixo + `cancel-in-progress: false`
  (não cancela run em andamento — perder uma janela de ingestão pode significar
  perder votos de uma sessão). CI, deploy e checks de PR usam group por ref/PR +
  `cancel-in-progress: true` (cancelar run antigo quando vem push novo).
- **`permissions:` declarados explicitamente**: nenhum workflow depende dos defaults
  do repositório. CI roda só com `contents: read`; ingestão, crons (alertas, LGPD)
  e budget-poll têm `issues: write` para abrir alertas; pr-sanity, design-tokens e
  close-external-prs têm `pull-requests: write` para comentar/fechar; deploy é
  `contents: read`.
- **`workflow_dispatch:` em todos os workflows agendados**: permite re-rodar
  manualmente um cron falho sem esperar a próxima janela.
- **Setup de Node/deps centralizado** em `./.github/actions/setup-project`:
  fonte única da versão de Node (`.nvmrc`); workflows não hardcodam
  `node-version`. Bump de Node = 1 edição no `.nvmrc`.

## Actions compostas reutilizáveis (`.github/actions/`)

Colapsam padrões que se repetiam em dezenas de jobs (refactor 2026-06-15).
**Pré-requisito comum:** o job precisa fazer `actions/checkout` ANTES de usar
qualquer uma — actions locais (`./.github/actions/*`) só resolvem com o repo
no disco. Foi a ausência desse checkout que deixava o `alertas-cron` com a
notify-failure quebrada (corrigido no mesmo refactor).

| Action | O que faz | Usada por |
|---|---|---|
| `setup-project` | `setup-node` (`node-version-file: .nvmrc`, `cache: npm`) + `npm ci`. Não faz checkout. | `ci.yml`, `deploy.yml`, `budget-poll.yml`, os 3 `ingestion*` |
| `run-ingestion` | Roda `npm run <script>` com `DATABASE_URL`/`DIRECT_URL` + `notify-failure` em `if: failure()`. Inputs: `script`, `context`, secrets. | os 3 `ingestion*` |
| `trigger-cron` | Valida `cron-secret`, `POST` ao `endpoint` com `x-cron-secret`, imprime `.stats` + `notify-failure` em falha. Inputs: `endpoint`, `cron-secret`, `context`, secrets. | `alertas-cron.yml`, `lgpd-cron.yml` |
| `notify-failure` | Discord webhook + issue de incidente deduplicada por `context`. Reusada por `run-ingestion` e `trigger-cron` (composite aninhada). | as duas acima + jobs diretos |

## Ingestão config-driven (ADR-035)

Os workflows de ingestão (`ingestion-daily.yml`, `ingestion-weekly.yml`) **não**
têm jobs hand-written por entidade. A fonte única da verdade é
**`ingestion/registry.ts`** (array tipado+Zod: `id`, `script`, `context`,
`cadence`, `tier`, `timeoutMin`; `cadence` ∈ `daily | weekly | monthly`).
Votações foram consolidadas no `daily` (1×/dia) em 2026-06-15 — antes eram
4×/dia num workflow próprio (ADR-035). Cada workflow tem:

1. job **`discover`** — roda `npm run ingest:print-matrix` (lê `CADENCE`,
   filtra o registry, escreve `tierN=<json>` no `$GITHUB_OUTPUT`);
2. jobs **`tier0`/`tier1`/`tier2`** — consomem
   `fromJSON(needs.discover.outputs.tierN)` numa `matrix` e rodam cada entrada
   via a composite `run-ingestion`. `tier N+1` faz `needs: [discover, tierN]`.

Dependências (DAG) são modeladas por `tier` (nível N+1 espera todo o nível N).
`strategy.fail-fast: false` mantém os jobs do mesmo tier independentes (uma
fonte falhando não cancela as irmãs). Os tiers downstream usam
`if: ${{ !cancelled() && … }}` para rodar **mesmo que** o tier anterior tenha
falhado (ordenação preservada, sucesso não exigido) — senão uma fonte flaky
bloquearia toda a ingestão a jusante (ADR-035 §resiliência). `timeout-minutes`
vem de `matrix.timeoutMin`.

**Adicionar uma fonte = 1 entrada no registry** — nenhum job YAML novo. Uma
cadência nova (ex. `monthly`) = 1 workflow a partir do template `discover→tier`.
Lógica pura testável em `ingestion/ops/matrix-builder.ts`
(`registry.test.ts` + `matrix-builder.test.ts`).

> **Restrição de plataforma:** workflows precisam estar **diretamente** em
> `.github/workflows/` — o GitHub Actions **ignora subdiretórios**
> (`.github/workflows/ingestion/…` não dispara). Por isso a organização por
> cadência é via registry + nome de arquivo (`ingestion-*.yml`), não por pasta.
> (Subpastas só valem para `.github/actions/`.)

## Triggers que **não** usamos (decisão consciente)

- **`push` em outras branches** além de `main`: discipline de PR-only. Branches feature não rodam CI por push direto — só via PR. Aprendido empiricamente no Batch C da Wave 2.0 (princípio 13 do CLAUDE.md), quando assumimos o contrário e tivemos que mudar o flow.
- **`repository_dispatch`**: sem integrações externas que precisem disparar workflows. Quando entrar webhook de revalidação pós-ingestão ([#43](https://github.com/FabioCaffarello/brasil-a-vera/issues/43), resolvido fora do sprint via revalidate manual), reavaliar.
- **`schedule`** em `ci.yml`: CI roda em código, não em relógio. Sem flakes a detectar via nightly run.

## Quando adicionar workflow novo

1. Cabeçalho explicativo no topo (trigger, propósito, secrets necessários).
2. `concurrency.group` apropriado para o tipo de carga (cancel-in-progress em workflows idempotentes que substituem o anterior; no cancel em ingestão que acumula).
3. `permissions:` mínimas (default deny + opt-in explícito).
4. Reusar as actions compostas (`setup-project` para Node/deps; `run-ingestion`/`trigger-cron` quando o padrão couber) em vez de repetir o boilerplate. Se um novo padrão se repetir em 3+ jobs, considere uma composite nova (ADR-019: gargalo concreto antes da peça nova).
5. Atualizar a tabela acima.
