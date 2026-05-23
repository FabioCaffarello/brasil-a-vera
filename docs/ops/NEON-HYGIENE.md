# Hygiene operacional Neon — checklist

Antes de assumir que algo está acordando o Neon de fora, eliminar
fontes internas óbvias. Use este checklist em ordem; a maioria dos
problemas resolve nos itens 1-3.

## Local

- [ ] Nenhuma aba aberta com Drizzle Studio (`npm run db:studio`).
      Studio mantém conexão WS viva.
- [ ] Nenhum processo `tsx ingestion/...` rodando localmente
      (`ps aux | grep tsx`).
- [ ] Nenhum `psql` ou cliente Postgres conectado a Neon production.

## Cloudflare

- [ ] Workers preview deployments antigos: revisar em
      <https://dash.cloudflare.com> → Workers → brasil-a-vera →
      Deployments. Deletar previews de PRs já merged.
- [ ] Cloudflare Health Checks: dashboard → Traffic → Health Checks.
      Se houver um apontando para rota do app, mudar para
      `/api/health` (rota que NÃO toca DB; ver
      `src/app/api/health/route.ts`).
- [ ] Cloudflare Workers Cron Triggers: dashboard → Workers →
      brasil-a-vera → Triggers. Verificar que não há cron interno do
      Worker — todo cron do projeto roda em GitHub Actions.

## Monitores externos

- [ ] Se houver UptimeRobot / BetterStack / Pingdom / Cronitor /
      Hyperping configurado, mudar a URL monitorada para
      `https://brasilavera.org/api/health`. Essa rota retorna JSON
      estático sem tocar o DB.

## Crawlers

- [ ] Confirmar que `robots.txt` está sendo servido:
      `curl https://brasilavera.org/robots.txt`. Esperar bloqueios
      para AhrefsBot, SemrushBot, GPTBot, ClaudeBot,
      PerplexityBot, Bytespider.
- [ ] Google Search Console: relatórios de Crawl. Se taxa estiver
      agressiva, "Crawl rate" → reduzir manualmente.

## Cron jobs

- [ ] Confirmar via
      `gh run list --workflow=ingestion-votacoes.yml --limit 10`
      (e workflows análogos) que crons não estão presos em
      retry/loop.

## Quando nada disso resolve

Vá para [`INVESTIGATE-NEON-WAKE.md`](./INVESTIGATE-NEON-WAKE.md) e
ative o protocolo de instrumentação ao vivo via `wrangler tail`.
