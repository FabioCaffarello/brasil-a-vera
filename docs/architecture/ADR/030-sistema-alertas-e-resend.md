# ADR-030: Sistema de alertas e Resend

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-19
> Status: accepted

---

## Contexto

O sistema de alertas é o núcleo do JTBD #1 da área logada
([LOGGED-AREA-VISION §2](../../product/LOGGED-AREA-VISION.md#2-job-to-be-done)) —
"atualização semanal sem garimpo". Sem report semanal entregue de forma
confiável, a Wave 10 não cumpre a tese de produto.

Stack atual disponível:

- **Cloudflare Workers Paid** ($5/mo desde 2026-05-15) com Cron Triggers,
  Workers Queues, KV — todos nativos sem peer dep adicional.
- **Neon Postgres** com scale-to-zero entre janelas de uso.
- **GitHub Actions** já usado para crons de ingestão (TypeScript via `tsx`).
- **Sem infra de email** instalada — escolha de provedor aberta.

Decisões necessárias:

1. **Provedor de email** transacional/marketing capaz de entregar
   ~750–12.500 emails/mês com DKIM/SPF/DMARC corretos no domínio
   `brasilavera.org`.
2. **Trigger do cron** semanal e modulação por períodos especiais.
3. **Backpressure / retry**: cron disparou 750 envios; Resend retorna 429
   em alguns; o que acontece.
4. **Idempotência**: cron rodando duas vezes (deploy concorrente, retry
   do agendador) não pode duplicar entrega.
5. **Modulação periódica** (eleições, CPIs, proposições marcadas) sem
   refactor a cada evento.
6. **Política "sem novidades"**: usuário acompanhando 5 parlamentares
   inativos numa semana — envia email vazio, agrega, ou pula?

Princípios de fronteira:

- ADR-019 (disciplina sem gargalo): infra nova só com evidência. Aqui a
  evidência é a necessidade direta do JTBD #1.
- LOGGED-AREA-VISION princípio 4 (doc serve o código): zero
  `AlertEngine`/`NotificationDispatcher` preventivos.
- ADR-022 §LGPD (data processor US-based, cláusula contratual padrão):
  serve de precedente para a relação com o provedor de email.

## Decisão

### 1. Provedor: Resend

Free tier 3.000 emails/mês cobre até ~750 MAU semanais. Pro $20/mo (50k
emails) cobre ~12.500 MAU. Domain verification + DKIM/SPF/DMARC via wizard
do Resend. SDK TypeScript first-class.

Configuração DNS no Cloudflare Email Routing/DNS no setup da Etapa 7:
4-5 registros (TXT para SPF/DKIM, MX se houver bounce processing,
CNAME para tracking opcional).

### 2. Trigger: Cloudflare Cron Trigger

`wrangler.toml` declara cron `0 21 * * 0` (domingo 21:00 UTC = 18:00 BRT).
Worker handler `scheduled()` faz:

1. `SELECT user_profile + alert_policy WHERE deleted_at IS NULL AND policy ativo`.
2. Para cada usuário, agrega evento count na janela de 7 dias.
3. Se count = 0 → `INSERT alert_delivery (status=skipped, idempotency_key)`.
4. Se count > 0 → `enqueue` na Workers Queue.

Cron extra para modulação roda no mesmo handler quando há
`alert_period` ativa cujo `scope` matcha o usuário.

### 3. Backpressure / retry: Workers Queues

Producer = cron handler. Consumer = mesmo Worker via `queue()` handler.
Concorrência limitada por config; retry automático em falha; dead-letter
queue para diagnose. Resend transient errors (429, 5xx) viram retry; 4xx
permanente vira `alert_delivery (status=failed)` com erro registrado.

### 4. Idempotência: `idempotency_key = sha256(user_id + period_start + cadence)`

Coluna `idempotency_key text unique not null` em `alert_delivery`. INSERT
com `ON CONFLICT DO NOTHING` — segundo cron na mesma janela não duplica.

### 5. Modulação: tabela `alert_period` admin-managed

Schema:

```sql
alert_period {
  id uuid PK,
  name text,
  kind text CHECK in ('eleicoes', 'cpi', 'proposicao_marcada', 'outro'),
  started_at timestamptz,
  ends_at timestamptz,
  scope jsonb  -- { uf?: [], parlamentar_ids?: [], themes?: [] }
}
```

Cron handler consulta `WHERE now() BETWEEN started_at AND ends_at`. Para
cada período ativo, dispara entrega extra-cadência apenas aos usuários
que matcham `scope` (UF, parlamentares acompanhados, temas de interesse).

Sem UI Wave 10 — admin gerencia via Drizzle Studio ou SQL direto. UI
entra em wave futura se evidência justificar.

### 6. Sem novidades: skip + agregação

Sem envio. Registra `alert_delivery (status=skipped, idempotency_key)`
para auditoria. Próximo ciclo agrega o período pulado declarando no
cabeçalho: *"Período: 22/04–09/05 (15 dias)"*. Cap acumulado de **4
semanas** — força um report-resumo mesmo em baixa atividade.

### 7. Cap anti-abuse: 1 email/dia por usuário

Mesmo em período eleitoral com modulação extra, máximo 1 email diário
por usuário. Implementado no consumer da Queue: `SELECT delivered_at
FROM alert_delivery WHERE user_id = $1 AND delivered_at > now() - interval '24 hours'`.

## Alternativas Consideradas

### A. Provedor de email

| Opção | Free tier | Pago | Decisão |
|---|---|---|---|
| **Resend** | 3.000/mês | $20/mo @ 50k | **ESCOLHIDO** — TypeScript-first, wizard de DNS, suporte brasileiro adequado, sem ferramenta gerencial pesada |
| SendGrid | 100/dia | $19.95/mo @ 50k | Free tier diário é apertado; UI mais pesada; setup com mais peças |
| Mailgun | 0 (5k trial 3 meses) | $35/mo @ 50k | Sem free tier permanente |
| AWS SES | 62k/mês (do EC2) | $0.10/1k externo | Exige conta AWS + IAM + IAM policies + bounce/complaint via SNS. Peer dep pesada; ROI ruim para 750 MAU |
| Postal/Mailcow (self-hosted) | grátis (infra) | infra | ADR-019 bloqueia: peer infra adicional sem gargalo presente |

### B. Trigger

| Opção | Decisão |
|---|---|
| **Cloudflare Cron Trigger** | **ESCOLHIDO** — nativo, sem peer dep, mesmo runtime do app |
| GitHub Actions cron | Funciona (já usado para ingest) mas separa o cron do Worker; não tem acesso direto a Workers Queues/KV; LGPD da execução em US-east é o mesmo |
| Vercel Cron | Não estamos em Vercel |
| Workers Queues "schedule-trigger" | Queues são consumidoras de produtor — não disparam por agendamento sozinhas |

### C. Backpressure / retry

| Opção | Decisão |
|---|---|
| **Workers Queues** | **ESCOLHIDO** — retry transparente, dead-letter, concorrência limitada nativa |
| Try-catch direto no handler do cron | Falha transitória de Resend = perda silenciosa do report; sem retry |
| Tabela `alert_outbox` própria como queue + cron consumer | Reinventa Workers Queues; mais código; mais peças para manter |

### D. Modulação por período

| Opção | Decisão |
|---|---|
| **Tabela `alert_period` admin-managed** | **ESCOLHIDO** — raros (5-10/ano), flexibilidade via `scope` jsonb, sem UI Wave 10 |
| Feature flag estática (env var) | Exige deploy a cada evento; perde flexibilidade de UF/parlamentares |
| UI admin dedicada | Sem demanda Wave 10; entra em wave futura se evidência justificar |

### E. Sem novidades

| Opção | Decisão |
|---|---|
| **Skip + agregar no próximo ciclo (cap 4 semanas)** | **ESCOLHIDO** — preserva intenção do usuário (não inundar) + auditoria |
| Enviar email "nada aconteceu" | Treina o usuário a ignorar emails do Brasil à Vera |
| Enviar com nota explicando a vazia | Mesma fricção em UX |

## Consequências

### Positivas

- Resend free tier cobre o cenário realista 12-24 meses (a base de
  cidadão cívico brasileiro consumidor de transparência é nicho).
- Cron Trigger + Workers Queue + Resend roda dentro do mesmo runtime,
  zero context-switch operacional.
- Idempotency_key garante "exactly-once" lógico mesmo com cron que dispara
  duplicado (deploy concorrente, retry interno).
- `alert_period.scope` em jsonb é flexível o suficiente para os 3 kinds
  iniciais (eleicoes, cpi, proposicao_marcada) sem refactor.
- "Sem novidades = skip" treina o usuário: email do Brasil à Vera = sinal,
  não ruído.

### Negativas

- Resend é US-based. LGPD: transferência internacional de dados pessoais
  (e-mail do usuário) — exige cláusula contratual padrão e registro do
  data processor na política de privacidade. Mesmo problema do Clerk
  (ADR-022 §LGPD); o tratamento jurídico é análogo.
- DNS setup (DKIM/SPF/DMARC) tem janela de propagação ~24h; warm-up de
  ~100 emails recomendado antes de envio em escala. Tarefa Etapa 7.
- `alert_period` admin-managed via SQL direto é frágil operacionalmente —
  errar uma data no SQL dispara entrega indevida. Mitigação: pull-request
  obrigatório registrando a migration de inserção do período (audit trail).
- Cap de 1 email/dia pode parecer arbitrário em período eleitoral intenso.
  Métricas de leitura pós-lançamento dirão se aumentar para 2/dia ou
  manter.

### Neutras

- Resend pricing pode mudar; migração para SendGrid/SES é viável
  (provedor é commodity em transactional email; templates são markdown
  + HTML embedado).
- `Workers Queues` é feature do Cloudflare. Migração para outro
  hospedeiro reescreveria essa camada — risco aceito.

## Referências

- [LOGGED-AREA-VISION §6 (Sistema de alertas)](../../product/LOGGED-AREA-VISION.md#6-sistema-de-alertas)
- [ADR-019 — Disciplina arquitetural](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-022 — Clerk (precedente para data processor US-based)](022-clerk-para-autenticacao.md)
- Resend pricing (consultado 2026-05-19): `https://resend.com/pricing`
- Cloudflare Cron Triggers: `https://developers.cloudflare.com/workers/configuration/cron-triggers/`
- Cloudflare Workers Queues: `https://developers.cloudflare.com/queues/`
