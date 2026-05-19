# Cron de alertas — setup operacional

> Brasil a Vera · Contributing · Wave 10 Etapa 7

Configuração do cron semanal que dispara o envio do report de alertas
para os usuários autenticados. Endpoint: `POST /api/cron/alertas/run`.

## Variáveis de ambiente

```bash
# Secret compartilhado entre o trigger (GitHub Actions OU Cloudflare
# Cron) e o endpoint da app. Validado pelo header `x-cron-secret`.
# Gerar com: `openssl rand -hex 32`
CRON_SECRET=...
```

Adicionar em:

- `.env.local` (dev local)
- `.dev.vars` (Wrangler preview)
- **GitHub Secrets** (`Settings → Secrets and variables → Actions`)
  para o workflow de cron chamar o endpoint
- **Workers Secret** em produção: `wrangler secret put CRON_SECRET`

## Trigger via GitHub Actions cron

Precedente do projeto: `ingestion-*.yml` já usa GH Actions cron para
ingestão diária. Mesma abordagem para alertas.

Criar `.github/workflows/alertas-cron.yml`:

```yaml
name: Alertas semanais (cron)

on:
  schedule:
    # Domingo 21:00 UTC = 18:00 BRT. Brasil sem horário de verão
    # desde Decreto 9.772/2019.
    - cron: '0 21 * * 0'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  run-cron:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger /api/cron/alertas/run
        env:
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: |
          curl --fail --silent --show-error \
            --max-time 300 \
            -X POST \
            -H "x-cron-secret: $CRON_SECRET" \
            -H "Content-Type: application/json" \
            https://brasilavera.org/api/cron/alertas/run
```

Após push, validar uma execução manual:

```bash
gh workflow run alertas-cron.yml
gh run watch
```

## Trigger via Cloudflare Cron Trigger (alternativa)

Não adotado nesta etapa porque OpenNext + Next.js App Router não expõe
trivialmente o `scheduled()` handler. Caminho se quisermos no futuro:

1. Adicionar em `wrangler.jsonc`:
   ```json
   "triggers": {
     "crons": ["0 21 * * 0"]
   }
   ```
2. Customizar build OpenNext para registrar `scheduled()` handler que
   faz `fetch()` interno ao endpoint.

Trade-off: Cloudflare Cron Trigger tem latência menor que GH Actions
(que pode atrasar minutos em horários de pico). Adiar até evidência
empírica de drift problemático.

## Disparar manualmente

```bash
# Local (precisa do .env.local com CRON_SECRET):
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  http://localhost:3000/api/cron/alertas/run

# Produção:
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  https://brasilavera.org/api/cron/alertas/run
```

Resposta:

```json
{
  "ok": true,
  "period": {
    "start": "2026-05-10T21:00:00.000Z",
    "end": "2026-05-17T21:00:00.000Z",
    "scheduledFor": "2026-05-17T21:00:00.000Z"
  },
  "stats": {
    "usersProcessed": 42,
    "deliveriesInserted": 84,
    "deliveriesSkipped": 0,
    "errors": 0
  }
}
```

## Idempotência

`idempotency_key = sha256(user_id + period_start + cadence + channel)`.

Rodar o cron duas vezes na mesma janela é seguro: a segunda execução
incrementa `deliveriesSkipped` em vez de duplicar. Útil para retry
manual após falha transitória.

## Sub-PRs da Etapa 7

| Sub-PR | Entrega | Status |
|---|---|---|
| 7.1 | Schema `alert_delivery` + endpoint cron + idempotency + queries | Este PR |
| 7.2 | Agregadores semanais (queries de votos/proposições/gastos por usuário) — substitui body placeholder | TODO |
| 7.3 | Resend integration + envio real (pending → sent) | TODO |
| 7.4 | Sub-tab Recebidos real (substitui stub Etapa 6 + markdown render) | TODO |
