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

Resposta (Wave 10 Etapa 7.3 — após envio real via Resend):

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
    "deliveriesSent": 84,
    "deliveriesSkipped": 0,
    "deliveriesFailed": 0,
    "deliveriesAlreadyExisted": 0,
    "errors": 0
  }
}
```

`deliveriesSent` inclui tanto channel=email (passou pelo Resend OK)
quanto channel=inapp (delivery efetiva no banco — sub-tab Recebidos
renderiza). `deliveriesFailed` registra channel=email que falhou no
Resend (channel=inapp não falha).

## Resend setup (Wave 10 Etapa 7.3)

1. Criar conta em https://resend.com.
2. Adicionar domínio `brasilavera.org`.
3. Wizard de DNS adiciona ~4 records (DKIM TXT × 2, SPF TXT, MX para
   bounce). Aplicar no DNS do Cloudflare (zona `brasilavera.org`).
4. Aguardar verificação ("Verified" no Resend Dashboard). Tipicamente
   ~5min, mas pode levar até 72h pra propagação completa.
5. **Recomendado**: enviar email de teste via "Send Test Email" no
   Resend Dashboard antes do primeiro deploy real — verifica que o
   DKIM/SPF/DMARC está OK end-to-end.
6. Gerar API key em "API Keys" → "Create API Key" → scope "Sending
   access". Não usar a key de teste.
7. Configurar:
   - `.env.local` e `.dev.vars`: `RESEND_API_KEY=re_...` + `RESEND_FROM="..."`
   - GitHub Secrets: ambos
   - Workers Secret: automatizado via `deploy.yml` bootstrap

### Formato do `RESEND_FROM`

Aceita 2 formas:
- `alertas@brasilavera.org` (simples)
- `Brasil à Vera <alertas@brasilavera.org>` (com display name; recomendado)

O endereço local antes do `@` é livre; precisa apenas que o domínio
seja o verificado.

### Troubleshooting envio

| Sintoma | Provável causa | Onde investigar |
|---|---|---|
| `resend_not_configured` no log | `RESEND_API_KEY` ou `RESEND_FROM` ausente no Worker | `wrangler secret list` |
| `resend_api_error: ValidationError` | `from` não bate com domínio verificado, ou `to` inválido | Resend Dashboard → Domains |
| `resend_api_error: AuthenticationError` | API key revogada/incorreta | Resend Dashboard → API Keys |
| Email chega na pasta de spam | DKIM/SPF/DMARC incompleto, ou domínio com má reputação ainda (warm-up) | Resend Dashboard → Logs; ferramenta tipo mail-tester.com |
| 5+ failures consecutivos | Possível rate limit ou suspensão | Resend Dashboard → Logs; contato suporte |

## Idempotência

`idempotency_key = sha256(user_id + period_start + cadence + channel)`.

Rodar o cron duas vezes na mesma janela é seguro:
- Segundo run: `INSERT … ON CONFLICT DO NOTHING` no banco → não duplica linha
- E porque Resend SÓ é chamado quando `createDelivery` retorna `inserted=true`, **email NÃO é reenviado** em re-execução

Status flow:
- `pending` → criado pela primeira insert
- `sent` → channel=inapp imediato, ou channel=email após Resend OK
- `failed` → channel=email após Resend retornar erro
- `skipped` → período sem novidades (não envia, não muda)

## Sub-PRs da Etapa 7

| Sub-PR | Entrega | Status |
|---|---|---|
| 7.1 | Schema `alert_delivery` + endpoint cron + idempotency + queries | Este PR |
| 7.2 | Agregadores semanais (queries de votos/proposições/gastos por usuário) — substitui body placeholder | TODO |
| 7.3 | Resend integration + envio real (pending → sent) | TODO |
| 7.4 | Sub-tab Recebidos real (substitui stub Etapa 6 + markdown render) | TODO |
