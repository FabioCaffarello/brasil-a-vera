# Investigação: por que o Neon não dorme

O compute do Neon (Postgres serverless) deveria suspender após ~5min
sem queries (scale-to-zero). Quando o dashboard mostra RAM
allocated/used constante 24/7 — sem "ENDPOINT INACTIVE" aparecendo —
significa que algo está batendo no banco continuamente. Este runbook
descreve como identificar o ofensor usando a instrumentação adicionada
no PR de investigação.

## Pontos de instrumentação ativa

Marcados com `TODO(investigate-neon-wake)` no código:

- `src/middleware.ts` — emite `event: "request"` em TODA request HTTP
  (volume alto; ative durante janelas curtas).
- `src/lib/cache.ts` — emite `event: "cache_miss"` quando uma key não
  bate no edge cache e o loader vai ao Neon.
- `src/lib/queries/{busca,stats,user-profile,follows,data-request}.ts`
  — emitem `event: "db_query_uncached"` quando funções não-cacheadas
  por design (busca textual, painel autenticado, admin) vão ao banco.

## Como coletar dados

1. Após este PR mergiar em produção, rode em terminal local:

   ```bash
   npx wrangler tail --format pretty
   ```

   Mantenha aberto por 30-60 minutos durante período de baixo tráfego
   humano esperado (madrugada BRT, ex.: 03:00-05:00 GMT-3).

2. Salve a saída para análise:

   ```bash
   npx wrangler tail --format json > /tmp/neon-wake-$(date +%F-%H%M).jsonl
   ```

3. Filtre por evento durante a análise:

   ```bash
   # Padrão temporal de requests
   jq 'select(.message | contains("event\":\"request"))' /tmp/neon-wake-*.jsonl

   # Quais queries chegaram no Neon via cache miss
   jq 'select(.message | contains("event\":\"cache_miss"))' /tmp/neon-wake-*.jsonl

   # Rotas que sempre vão ao Neon (busca, painel, admin)
   jq 'select(.message | contains("event\":\"db_query_uncached"))' /tmp/neon-wake-*.jsonl
   ```

## Como interpretar

- **`event: "request"` aparece a cada 1-5min com mesmo `ua` e mesmo
  `path`**: é uptime monitor externo. Olhe o `ua`; UptimeRobot,
  BetterStack, Pingdom, Cronitor têm UAs reconhecíveis (procure por
  "UptimeRobot/", "Better Uptime", "Pingdom.com_bot",
  "Cronitor"). Aponte o monitor para `/api/health` (rota que NÃO toca
  DB) ou desligue o probe.

- **`event: "cache_miss"` aparece com a mesma `key` repetidamente**
  entre os eventos `request`: cache evictado constantemente OU TTL
  muito curto para o padrão de acesso. Anote a key, abra issue
  separada para reavaliar o TTL.

- **`event: "db_query_uncached"` domina o log**: rota não-cacheada
  (busca, painel autenticado, admin) está sendo chamada com
  frequência. Correlacione `cf_ray` do request com o miss para achar
  o caller.

- **UA contém `bot`, `crawler`, `spider`, `Googlebot`, `AhrefsBot`,
  `SemrushBot`, `GPTBot`, `ClaudeBot`, `Bytespider`,
  `PerplexityBot`**: crawler. `robots.txt` adicionado neste mesmo PR
  já bloqueia os comerciais e os de IA — se persistir, confirme que
  `curl https://brasilavera.org/robots.txt` retorna a versão nova e
  considere reduzir `Crawl rate` no Google Search Console.

## Próximo passo

Quando o ofensor estiver identificado e silenciado:

```bash
# Localizar todos os pontos de remoção
grep -rn "investigate-neon-wake" src/
```

Remover os blocos marcados (logs + comentários TODO) em PR de
cleanup. Manter `docs/ops/NEON-HYGIENE.md` (vive como checklist
operacional).
