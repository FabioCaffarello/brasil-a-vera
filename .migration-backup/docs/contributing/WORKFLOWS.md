# GitHub Actions Workflows

> Mapa rápido dos workflows ativos em `.github/workflows/`. Cada arquivo tem
> comentário próprio no topo explicando trigger e propósito; esta tabela é
> índice para inspeção rápida.

## Tabela

| Arquivo | Trigger | Cron | Propósito | Concurrency group |
|---|---|---|---|---|
| `ci.yml` | `push: main`, `pull_request` | — | Lint (Biome), build, testes unitários + integração com testcontainers. Gate de merge. | `CI-${ref}` (cancel-in-progress) |
| `deploy.yml` | `push: main`, `workflow_dispatch` | — | Migrations Drizzle → build OpenNext → `wrangler deploy` → smoke test. Preview deploys de PR rodam pela integração nativa Cloudflare ↔ GitHub. | `deploy-${ref}` (cancel-in-progress) |
| `ingestion.yml` | `schedule`, `workflow_dispatch` | `0 2 * * *` (02:00 UTC = 23:00 BRT do dia anterior) | Sync diário de entidades que mudam pouco: deputados, senadores, proposições (Câmara + Senado). | `ingestion-daily` (no cancel) |
| `ingestion-votacoes.yml` | `schedule`, `workflow_dispatch` | `0 0,6,12,18 * * *` (4×/dia) | Votações Câmara/Senado + backfill `votacao.proposicao_id` + orientações partidárias Câmara. | `ingestion-votacoes` (no cancel) |
| `ingestion-weekly.yml` | `schedule`, `workflow_dispatch` | `0 3 * * 0` (domingo 03:00 UTC) | Pipelines pesados: gastos CEAP (ano corrente) + tramitação completa Câmara/Senado. | `ingestion-weekly` (no cancel) |
| `budget-poll.yml` | `schedule`, `workflow_dispatch` | `0 9 * * *` (09:00 UTC = 06:00 BRT) | Poll Neon API, estima custo mensal por run-rate, alerta progressivo conforme [ADR-017](../architecture/ADR/017-budget-mensal-observabilidade.md). | `budget-poll` (no cancel) |

## Convenções aplicadas (audit 2026-05-13, issue #69)

- **Comentário no topo de cada workflow**: trigger + propósito em 2-5 linhas.
  Quem abre o arquivo entende quando ele dispara sem precisar caçar
  documentação separada.
- **`concurrency.group` em todos**: ingestão usa group fixo + `cancel-in-progress: false`
  (não cancela run em andamento — perder uma janela de ingestão pode significar
  perder votos de uma sessão). CI e deploy usam group por ref + `cancel-in-progress: true`
  (cancelar push antigo quando vem push novo no mesmo branch).
- **`permissions:` declarados explicitamente**: nenhum workflow depende dos defaults
  do repositório. CI roda só com `contents: read`; ingestão e budget-poll
  têm `issues: write` para abrir alertas; deploy é `contents: read`.
- **`workflow_dispatch:` em todos os workflows agendados**: permite re-rodar
  manualmente um cron falho sem esperar a próxima janela.

## Triggers que **não** usamos (decisão consciente)

- **`push` em outras branches** além de `main`: discipline de PR-only. Branches feature não rodam CI por push direto — só via PR. Aprendido empiricamente no Batch C da Wave 2.0 (princípio 13 do CLAUDE.md), quando assumimos o contrário e tivemos que mudar o flow.
- **`repository_dispatch`**: sem integrações externas que precisem disparar workflows. Quando entrar webhook de revalidação pós-ingestão ([#43](https://github.com/FabioCaffarello/brasil-a-vera/issues/43), resolvido fora do sprint via revalidate manual), reavaliar.
- **`schedule`** em `ci.yml`: CI roda em código, não em relógio. Sem flakes a detectar via nightly run.

## Quando adicionar workflow novo

1. Cabeçalho explicativo no topo (trigger, propósito, secrets necessários).
2. `concurrency.group` apropriado para o tipo de carga (cancel-in-progress em workflows idempotentes que substituem o anterior; no cancel em ingestão que acumula).
3. `permissions:` mínimas (default deny + opt-in explícito).
4. Atualizar a tabela acima.
