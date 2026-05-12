# Deployment Operations

> Procedimentos operacionais para deploy em produção (Cloudflare Workers + Neon).

## Visão geral

O app é deployed em Cloudflare Workers via OpenNext. Push em `main` dispara o workflow `.github/workflows/deploy.yml`, que:

1. Faz build via `npm run cf:build` (OpenNext converte Next.js para Workers)
2. Faz deploy via `npx wrangler deploy`
3. Roda smoke test pós-deploy (`npm run smoke`)

Falha em qualquer step deixa o workflow vermelho. **Smoke vermelho não auto-rollback**; é sinal para humano avaliar e reagir.

URL de produção: <https://brasil-a-vera.fabio-caffarello.workers.dev>

## Secrets do Worker (one-time setup)

Os Workers Secrets vivem na Cloudflare, separados dos GitHub Secrets. Esses devem ser configurados manualmente uma vez (ou quando rotacionados):

```bash
# Connection strings do Neon
npx wrangler secret put DATABASE_URL   # pooled connection
npx wrangler secret put DIRECT_URL     # direct connection

# Chave do header x-admin-key em /api/stats (gerar com openssl rand -base64 48)
npx wrangler secret put ADMIN_API_KEY
```

Verificar quais estão configurados:

```bash
npx wrangler secret list
```

Se algum sumir após deploy (como aconteceu uma vez entre PR #44 e PR #50 — ver issue #52 para investigação da causa raiz), repor com `wrangler secret put`. O smoke test pós-deploy detecta isso automaticamente — qualquer rota DB-touching vira 500.

Restaurar via pipe do `.env.local` (mantém o valor fora do histórico do shell):

```bash
grep '^DATABASE_URL=' .env.local | cut -d= -f2- | npx wrangler secret put DATABASE_URL
grep '^DIRECT_URL=' .env.local | cut -d= -f2- | npx wrangler secret put DIRECT_URL
```

## Smoke test pós-deploy

Implementado em `ingestion/ops/smoke.ts`. Roda automaticamente no workflow de deploy mas também pode ser executado manualmente:

```bash
SMOKE_BASE_URL=https://brasil-a-vera.fabio-caffarello.workers.dev npm run smoke
```

### O que verifica

| Probe | Concurrency | Status esperado |
|---|---|---|
| `/api/health` | 5 | 200 |
| `/parlamentares` | 10 | 200 |
| `/proposicoes` | 10 | 200 |
| `/votacoes` | 10 | 200 |
| `/api/export/parlamentares?casa=CAMARA` | 5 | 200 |
| `/api/stats` (sem header) | 5 | 401 ou 503 |

Total: 45 requests. Falha se < 99% retornarem o status esperado.

Concurrency por probe é deliberada — detecta regressões de concorrência (ex: Pool singleton) que sumiriam num smoke sequencial.

### Quando atualizar

- Nova rota DB-touching importante (1 por bounded context é o suficiente)
- Mudança no contrato de auth de `/api/stats`
- Mudança na URL de produção (atualizar `deploy.yml` também)

## Alerta Cloudflare Analytics — 5xx ongoing

O smoke test detecta regressões síncronas pós-deploy. Para degradação gradual (ex: connection pool exhaustion sob carga real, ou Pool singleton ressurgindo dias depois), precisamos de alerta ongoing.

**Setup manual no dashboard do Cloudflare** (one-time):

1. Cloudflare Dashboard → ☰ → Notifications
2. Add → **Workers Errors** (ou "Workers — Errors")
3. Selecionar Worker: `brasil-a-vera`
4. Trigger: **error rate > 1% over 5 minutes**
5. Notification target: email (`fabio.caffarello@gmail.com`) ou webhook
6. Salvar

Verificar funcionamento: forçar erro temporário (ex: remover um secret) e confirmar que o alerta dispara.

### Por que dashboard e não Terraform/API

Para 1 alerta, setup via API é overkill. Se o número de alertas crescer (multi-worker, múltiplas métricas), revisitar com `cf-terraform-provider`.

## Workflows de deploy referenciados

- `.github/workflows/deploy.yml` — deploy de produção + smoke
- `.github/workflows/ci.yml` — checks pré-merge (lint, build, test)
- `.github/workflows/ingestion-*.yml` — crons de ingestão

Preview deploys de PRs vêm da integração nativa Cloudflare Workers Builds (configurada no dashboard, não no repo).
