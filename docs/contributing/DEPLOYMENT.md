# Deployment Operations

> Procedimentos operacionais para deploy em produção (Cloudflare Workers + Neon).

## Visão geral

O app é deployed em Cloudflare Workers via OpenNext. Push em `main` dispara o workflow `.github/workflows/deploy.yml`, que:

1. Aplica migrations Drizzle via `npm run db:migrate` (ver [Migrations automáticas no deploy](#migrations-automaticas-no-deploy))
2. Faz build via `npm run cf:build` (OpenNext converte Next.js para Workers)
3. Faz deploy via `npx wrangler deploy`
4. Roda smoke test pós-deploy (`npm run smoke`)

Falha em qualquer step deixa o workflow vermelho. **Smoke vermelho não auto-rollback**; é sinal para humano avaliar e reagir.

URL de produção: <https://brasil-a-vera.fabio-caffarello.workers.dev>

## Migrations automáticas no deploy

`deploy.yml` aplica migrations Drizzle automaticamente antes do build/deploy via step `Apply Drizzle migrations` (`npm run db:migrate`). Fecha janela de schema/code drift que causou 5xx por ~10min após o merge do PR #73 — worker novo referenciava colunas que ainda não existiam no banco.

### Comportamento

- Roda **antes** do build OpenNext e do `wrangler deploy`. Se falhar, aborta o deploy inteiro — preferível a worker-novo-com-schema-antigo.
- Usa `DIRECT_URL` (GitHub Secrets) porque Drizzle Kit emite DDL e a pooled connection do Neon não suporta DDL transactions confiavelmente.
- Idempotente: Drizzle Kit registra migrations já aplicadas via tabela interna — migrations existentes viram no-op em runs subsequentes.

### Migrations destrutivas — padrão expand-then-contract

Migrations que **dropam** colunas têm janela de inconsistência entre `db:migrate` rodando e `wrangler deploy` substituindo o worker (~30-90s dependendo do build):

- DB já tem schema novo (sem colunas antigas)
- Worker ainda é o antigo, queryando colunas dropadas → 5xx temporário

Mitigação: aplicar **expand-then-contract** em 2 PRs:

1. **PR1 (expand)**: migration adiciona colunas/tabelas novas. Código passa a usar as novas, mas as antigas continuam vivas no banco.
2. **PR2 (contract)**: depois de algumas semanas estável (sem rollback necessário), migration dropa as colunas/tabelas antigas. Como o código já não as usa, drop é seguro.

Migrations puramente aditivas (`ADD COLUMN NULL`, novos índices, tabelas novas inteiras) não precisam de expand-then-contract — janela de inconsistência é benigna.

### Rollback

Drizzle Kit não tem `down` migration built-in. Para reverter:

1. `git revert` do commit que adicionou a migration
2. SQL manual de DROP/ALTER reverso aplicado via `DIRECT_URL`
3. Re-deploy do código antigo

Em práxis, expand-then-contract evita a maioria dos casos onde rollback seria estritamente necessário.

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

### Resiliência ao incidente de #52

`DATABASE_URL` e `DIRECT_URL` são **bootstrappados idempotentemente a cada deploy** a partir dos GitHub Secrets (`secrets.DATABASE_URL` / `secrets.DIRECT_URL`, que já existem para uso da ingestão). Se algum sumir entre deploys — incidente investigado em #52 com causa raiz não-determinística — o próximo deploy restaura automaticamente. Sem intervenção manual necessária.

`ADMIN_API_KEY` permanece **single-source no Cloudflare** (não está em GitHub Secrets por design). O workflow de deploy verifica que ela ainda está setada e falha rápido com mensagem clara caso tenha sumido. Restore manual:

```bash
# Gerar nova chave (ou usar a existente do .env.local)
openssl rand -base64 48 | npx wrangler secret put ADMIN_API_KEY
```

Smoke test pós-deploy continua sendo a rede de segurança final — qualquer rota DB-touching vira 500 se o bootstrap falhar por motivo inesperado.

### Recuperação manual (raro)

Em caso de falha total (ex: API token Cloudflare revogado, dual-storage perdido):

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

## Alertas de falha em jobs de ingestão

Quando qualquer job de ingestão (`ingestion.yml`, `ingestion-votacoes.yml`, `ingestion-weekly.yml`) falha, a composite action `.github/actions/notify-failure` dispara dois canais em paralelo:

1. **Discord** — alerta imediato (push no celular se app instalado)
2. **Issue automática no GitHub** com label `incident` — rastro permanente auditável (`gh issue list --label incident`)

### Idempotência da issue

Enquanto existir uma issue aberta com label `incident` cujo título contém o `context` do job (ex: `ingestion-camara-deputados`), novas falhas viram **comentários** na issue existente — não duplicatas. Fechar a issue (= "resolvido") faz a próxima falha criar uma issue nova.

Razão: cron de 4x/dia que quebra o dia todo gera 4 alertas Discord (você quer ser avisado de cada um) mas 1 issue com 4 comentários (você não quer 4 issues idênticas no inbox).

### Setup one-time

1. **Criar webhook no Discord**: servidor → canal → Configurações de canal → Integrações → Webhooks → Novo Webhook. Copiar URL.
2. **Configurar secret no repo**:

   ```bash
   gh secret set DISCORD_INGESTION_WEBHOOK_URL --body "<URL_COPIADA>"
   ```

3. **Testar o webhook** antes de confiar no CI:

   ```bash
   curl -fsS -X POST -H "Content-Type: application/json" \
     -d '{"content":"Test from local"}' \
     "<URL_COPIADA>"
   ```

4. **Label `incident`** — criada uma vez via `gh label create incident --color B60205 --description "Incidente operacional detectado automaticamente"`. Já configurada neste repo.

Se `DISCORD_INGESTION_WEBHOOK_URL` não estiver configurado, a action faz skip clean (sem erro). A issue do GitHub ainda é criada usando `secrets.GITHUB_TOKEN` (nativo).

### Permissões necessárias no workflow

Para que a action possa criar issues, cada workflow de ingestão tem:

```yaml
permissions:
  contents: read
  issues: write
```

## Monitoramento de budget Neon

Workflow `.github/workflows/budget-poll.yml` roda cron diário (09:00 UTC = 06:00 BRT) e:

1. Consulta `GET /api/v2/projects/{NEON_PROJECT_ID}` na Neon API
2. Computa **run-rate mensal** = (lifetime usage / dias_desde_criação × 30)
3. Estima custo: `compute_hours × $0.16 + storage_gb × $0.35` (Launch tier pay-as-you-go, sem step de tier)
4. Classifica conforme thresholds do ADR-017 e dispara alertas

### Thresholds e ações

| Estimativa mensal | Nível | Ação |
|---|---|---|
| $0 — $2.99 | normal | log apenas |
| $3 — $6.99 | info | Discord |
| $7 — $14.99 | alert | Discord + comentário em issue #39 (revisão trimestral) |
| ≥ $15 | critical | Discord + cria issue com label `wave-2-blocker` (com dedupe — re-incidência vira comentário) |

Thresholds são sinais intermediários **dentro** das zonas do ADR-017 (verde $0-$5 / amarela $5-$15 / vermelha >$15), entregando warning antes do limite superior de cada zona.

### Limitações conhecidas

- **Free tier sempre retorna $0 actual**, mesmo quando script estima >$0. A estimativa é forecast (running rate × Launch pricing), útil quando upgrade acontecer ou quando quota free for cruzada. O dia que Neon expor consumption por período em free tier (atualmente Scale+ apenas, deprecating jun/2026), trocar a fonte sem mudar a lógica.
- **Forecast nos primeiros dias é instável**: pico inicial de atividade (deploy, smoke, primeira ingestão) inflaciona o run-rate. Esperar 1-2 semanas para forecast estabilizar.
- **Daily comment** em #39 não tem dedupe — se ficar dias seguidos em alert, gera comment diário. Discord é o sinal de wake-up; #39 vira timeline auditável. Se virar ruído, adicionar dedupe (`<!-- budget-alert -->` marker, skip se último comment recente).

### Setup one-time

1. **Gerar `NEON_API_KEY`**: console.neon.tech → Profile → API keys → Create. Read-only é suficiente.
2. **Encontrar `NEON_PROJECT_ID`**: console.neon.tech → projeto → Settings → General → Project ID.
3. **Configurar no repo**:

   ```bash
   gh secret set NEON_API_KEY --body "<key>"
   gh variable set NEON_PROJECT_ID --body "<id>"   # variable, não secret (não sensível)
   ```

4. **Webhook Discord opcional**:

   ```bash
   gh secret set DISCORD_BUDGET_WEBHOOK_URL --body "<url>"
   ```

   Pode ser mesma URL do canal `#ingestao-alertas` ou canal separado (`#budget`).

### Validação local

```bash
# Dry-run (sem side-effects — não posta no Discord nem no GitHub)
BUDGET_DRY_RUN=1 \
  NEON_API_KEY="<key>" \
  NEON_PROJECT_ID="<id>" \
  npm run budget:poll
```

Sem `BUDGET_DRY_RUN`, qualquer level ≥ info dispara notificações reais. Use com cuidado em ambiente local.

### Triggers manuais

```bash
gh workflow run budget-poll.yml
gh run watch
```

Útil após mudanças no thresholds (`ingestion/ops/neon-budget-calc.ts`) ou para refazer baseline depois de uma escalada.

## Workflows de deploy referenciados

- `.github/workflows/deploy.yml` — deploy de produção + smoke
- `.github/workflows/ci.yml` — checks pré-merge (lint, build, test)
- `.github/workflows/ingestion-*.yml` — crons de ingestão

Preview deploys de PRs vêm da integração nativa Cloudflare Workers Builds (configurada no dashboard, não no repo).
