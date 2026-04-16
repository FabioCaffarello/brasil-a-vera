# GitHub Actions

> Brasil a Vera · Deployment · v0.1
> Última atualização: 2026-04-16
> Status: accepted

---

## Sumário

- [Workflows](#workflows)
- [CI](#ci)
- [Ingestion](#ingestion)
- [Configuração de secrets](#configuração-de-secrets)
- [Executar ingestão sob demanda](#executar-ingestão-sob-demanda)
- [Racional das decisões](#racional-das-decisões)

---

## Workflows

| Workflow | Arquivo | Trigger | Propósito |
|----------|---------|---------|-----------|
| CI | `.github/workflows/ci.yml` | push/PR em `main`/`develop` | Lint, typecheck, testes, build |
| Ingestion | `.github/workflows/ingestion.yml` | cron diário + manual | Ingestão de dados das APIs oficiais |
| Reconciliation | `.github/workflows/reconciliation.yml` | cron semanal (domingo) + manual | Detecta divergências entre banco e fonte oficial |

---

## CI

Três jobs independentes:

1. **lint-and-type** — `biome ci .` + `tsc --noEmit`
2. **test** — `vitest run` + cobertura (best-effort)
3. **build** — `next build`

Os jobs `test` e `build` dependem de `lint-and-type` (não rodam se lint/type falhar).

### Variáveis de ambiente no build

O build do Next.js pode tentar pré-renderizar rotas que importam o container DI. Para evitar crash na ausência de banco, o job `build` define `DATABASE_URL` e `DIRECT_URL` com URLs dummy.

> Se em algum momento o build começar a tentar conectar de fato (timeout em vez de erro de schema), marcar a rota ofensora como `export const dynamic = 'force-dynamic'` em vez de adicionar mais dummies.

---

## Ingestion

### Trigger

- **Cron diário às 03:00 UTC** (00:00 BRT)
- **Manual** via Actions → Ingestion → Run workflow

### Concurrency

`group: ingestion` com `cancel-in-progress: false`. Se dois runs se sobrepõem, o segundo espera o primeiro completar — evita corromper o banco com ingestões simultâneas.

### Scripts no cron diário (`all-daily`)

| Script | Razão |
|--------|-------|
| `ingest:deputados` (lista) | Cheap (1 request); detecta entrada/saída de parlamentares |
| `ingest:senadores` (lista) | Cheap (1 request) |
| `ingest:votacoes:camara` (últimos 30 dias) | Eventos diários — prioridade do sync |
| `ingest:votacoes:senado` (ano corrente) | Eventos diários |

### Scripts sob demanda (NÃO rodam no cron)

| Script | Custo aproximado | Cadência sugerida |
|--------|------------------|-------------------|
| `deputados-detalhes` | ~1600 requests, ~15 min | Semanal |
| `senadores-detalhes` | ~80 requests, ~1 min | Semanal |
| `despesas-camara` | dezenas de milhares de requests, ~1h por ano | Mensal |

---

## Configuração de secrets

No repositório, ir em **Settings → Secrets and variables → Actions → New repository secret** e cadastrar:

| Secret | Descrição |
|--------|-----------|
| `DATABASE_URL` | URL com pooling (Neon, Supabase, ou Postgres gerenciado) |
| `DIRECT_URL` | URL direta sem pooling (para migrations) |

O step **Validate env** falha rápido com mensagem clara se algum secret estiver ausente.

---

## Executar ingestão sob demanda

1. Ir em **Actions → Ingestion → Run workflow**
2. Selecionar a branch (geralmente `main` ou `develop`)
3. Escolher o script:
   - `all-daily`: lista de deputados + senadores + votações (o que roda no cron)
   - `deputados`: apenas a lista de deputados
   - `deputados-detalhes`: enriquece deputados com nomeCivil, CPF, comissões (~15 min)
   - `senadores`: apenas a lista de senadores
   - `senadores-detalhes`: enriquece senadores (~1 min)
   - `votacoes-camara`: votações da Câmara dos últimos 30 dias
   - `votacoes-senado`: votações do Senado (usa `ano` se passado, senão ano corrente)
   - `despesas-camara`: despesas CEAP (MUITO pesado, ~1h por ano)
4. Opcionalmente preencher `ano` (usado por `votacoes-senado` e `despesas-camara`)

---

## Reconciliation

Compara o que está no banco com o que a fonte oficial retorna agora. **Não corrige nada** — apenas detecta e reporta três tipos de divergência:

| Tipo | Significado |
|------|-------------|
| **Gaps** | Existe na fonte oficial mas NÃO no nosso banco |
| **Orphans** | Existe no nosso banco mas NÃO na fonte oficial (renúncia, falecimento etc.) |
| **Stale** | Existe nos dois mas com valores divergentes (mudou de partido, UF etc.) |

Scripts disponíveis:

- `npm run reconcile:parlamentares` — compara TODOS os deputados (legislatura 57) e senadores em exercício
- `npm run reconcile:votacoes` — compara amostra de 10 votações recentes da Câmara + 10 do Senado (ano corrente)

Cada script termina com **exit code 1 se houver divergências** — o workflow GitHub usa `continue-on-error: true` porque divergências (troca-troca partidário, renúncias) são esperadas no fluxo normal.

Quando uma divergência aparece e é material para ação: rodar manualmente o script de sync apropriado via Actions → Ingestion.

## Racional das decisões

1. **Cron às 03:00 UTC** = 00:00 BRT — horário de menor tráfego nas APIs oficiais.
2. **`all-daily` exclui detalhes e despesas** — esses scripts são caros e mudam pouco; rodar manualmente em cadência menor.
3. **`concurrency: ingestion` sem cancel** — duas ingestões simultâneas podem corromper o banco; melhor enfileirar.
4. **`timeout-minutes: 90`** — despesas + detalhes podem se aproximar de 1h; margem de segurança.
5. **Validate env step** — falha rápido com mensagem legível se os secrets não estiverem configurados, em vez de morrer com erro genérico de conexão Postgres.
