# ADR-017: Budget mensal e observabilidade de custo

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-05-15 (Sprint 4.2 PR 1 — Workers Paid line item)
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O Brasil a Vera é um projeto cívico mantido por doação, mantenedor
solo. O orçamento é **restrição dura, não meta de eficiência**:
qualquer mês acima de um teto baixo significa que o projeto
financia infraestrutura com o próprio salário do mantenedor — modelo
insustentável que mata projetos comunitários no Brasil regularmente.

A Wave 1 entregou produção a **R$0/mês** (Cloudflare Workers free
tier + Neon free tier + GitHub Actions ilimitado em repo público).
O ponto de virada é previsível: quando o banco passar dos 0.5 GB do
free tier do Neon, salta para o Launch tier ($19/mês mínimo +
$0.35/GB-mês adicional). A Wave 2 + crescimento natural de tráfego
podem acelerar isso.

Sem observabilidade de custo **antes** dele subir, o time descobre
quando recebe a fatura — semanas depois do problema arquitetural
que o causou. Decisões de feature passam a competir com correções
reativas de orçamento.

Adicionalmente: **Neon free tier não expõe spend alerts nativos**
(confirmado em consulta ao dashboard do Neon, 2026-05-12). O
mecanismo de alerta precisa ser construído por cima da API pública
ou via instrumentação própria.

## Decisão

### Três zonas de budget mensal Neon

| Zona | Faixa | Resposta esperada |
|---|---|---|
| 🟢 **Verde** | $0 — $5 | Operação normal. Sem ação. |
| 🟡 **Amarela** | $5 — $15 | Revisar próximas features Wave 2/3 com lente de custo. Verificar dashboard semanalmente. Considerar acelerar ADR-016 (archive) ou ADR-018 (cache). |
| 🔴 **Vermelha** | > $15 | **STOP em novas features.** Sessão de revisão arquitetural obrigatória. Considerar estratégias mais agressivas (SQLite em R2, materialized cache, etc). |

Os valores foram escolhidos considerando que o **Neon Launch** custa
$19 fixo + storage. Cair em "vermelha" significa estar a um passo
de duplicar o custo no próximo mês — sinal alto antes da dor.

### Mecanismo de observabilidade

Em ordem de implantação:

**Imediato (esta sessão)** — **Revisão manual mensal**:
o mantenedor abre https://console.neon.tech → Billing uma vez por
mês e registra o valor em comentário no próprio ADR-017 (seção
"Revisão trimestral", abaixo). Cadence mínima viável até a
automação chegar.

**Wave 2** — **Script de poll automatizado** (issue #40):
GitHub Actions workflow diário que:

1. Consulta API do Neon (`/projects/{id}` + `/consumption` quando
   disponível) ou nosso futuro endpoint `/api/stats`
2. Compara contra os thresholds de $3 / $7 / $15 (intermediários
   dentro de cada zona, para sinal antes do limite superior)
3. Notifica via Discord webhook (gratuito) ou abre issue com label
   `wave-2-blocker` quando crítico

Razão de construir próprio em vez de usar Neon nativo: free tier
não expõe spend alerts. Quando o Neon adicionar a feature, migrar.

**Wave 2** — **Endpoint `/api/stats` admin-only** (issue #38):
protegido por API key, retorna em JSON:

- Contagem por tabela
- Tamanho total via `pg_database_size`
- Última ingestão por tipo de dado
- Custo estimado mensal baseado em CU-hours acumuladas

Usado tanto pela revisão manual quanto pelo script de poll.

### Revisão trimestral obrigatória

A cada 3 meses, criar **comentário neste ADR** comparando custo
real (Neon billing) vs budget, e registrando:

- Mês a mês ($X.YZ)
- Zona atingida (verde/amarela/vermelha)
- Causa principal se houve crescimento (mais tráfego? mais dados?
  query nova ineficiente?)
- Ação corretiva tomada, se houve

Issue recorrente (#39) lembra de fazer.

## Cloudflare Workers Paid line item (Sprint 4.2)

Em 2026-05-15, o owner executou upgrade para **Workers Paid** ($5/mo)
para resolver o gate documentado em issue [#149](https://github.com/FabioCaffarello/brasil-a-vera/issues/149)
(Worker bundle estourando o limite 3 MiB do free tier após introdução do
Clerk SDK server-side via `<AuthSlot />` RSC — ADR-022 §3).

### Impacto no budget

| Componente | Custo mensal | Status |
|---|---|---|
| Cloudflare Workers (Paid) | **$5.00** | Recorrente, partir de 2026-05-15 |
| Neon Postgres | $0 — $5 (Free / Launch) | Variável, monitorado |
| Cloudflare R2 | $0 (free tier 10 GB) | Não atingido |
| Outros | $0 | Não aplicável |

### Zonas atualizadas (com line item Workers Paid)

A baseline mensal passa de **$0** para **$5** apenas com Workers Paid.
As três zonas continuam válidas mas agora correspondem ao **custo adicional
acima do Workers Paid baseline** (Neon, R2, etc.):

| Zona | Faixa Neon/extras | Total mensal | Resposta esperada |
|---|---|---|---|
| 🟢 **Verde** | $0 — $5 | $5 — $10 | Operação normal. Sem ação. |
| 🟡 **Amarela** | $5 — $15 | $10 — $20 | Revisão semanal. Acelerar ADR-016 (archive) ou ADR-018 (cache). |
| 🔴 **Vermelha** | > $15 | > $20 | STOP em features. Revisão arquitetural obrigatória. |

### Justificativa do upgrade Workers Paid

Documentada em ADR-022 §3 v4 (matcher v4 — re-aplicação Opção B "pura"):

- Free tier impedia arquitetura server-side com `auth()` em RSC
- 162 KB acima do limite 3 MiB → não dá pra "minify aggressively" sem
  quebrar `@vercel/og`
- $5/mo é trade-off favorável: trade $60/ano por zero JS de Clerk em
  rotas anônimas (~80% do tráfego) E `auth()` server-side disponível
  para Sprint 4.5+ Minha Área
- Workers Paid limit (10 MiB) dá ~6.8 MB de margem para Sprint 4.3-4.6
  features sem novos gates

### Reavaliação do upgrade

Se em 12 meses (até maio/2027) NÃO entrarmos em zona amarela e o
projeto não decolar (sem MAU crescimento, sem doações cobrindo o custo),
considerar downgrade para Workers Free + reverter arquitetura para
client-only auth (commit `0262b86`, Sprint 4.1 PR 3). Mantenedor solo
não deve sustentar $60/ano de própria conta indefinidamente sem
contrapartida cívica observada.

## Alternativas Consideradas

### Sem budget formal

- **Prós**: zero overhead conceitual; flexibilidade máxima.
- **Contras**: padrão observado em projetos cívicos brasileiros é
  morrer por orçamento sem perceber. Sem gatilho explícito, decisões
  de feature são feitas sem dimensão de custo, e quando aparece a
  fatura é tarde demais.
- **Veredicto**: descartado por evidência empírica.

### Budget mais agressivo (vermelha em $10)

- **Prós**: força disciplina mais cedo; máxima margem de segurança.
- **Contras**: dá pouca margem para crescimento orgânico. Se o projeto
  ganhar tração e tráfego, a primeira vez que o banco bate o teto
  vira crise prematura. $10 está apenas $5 acima do início do Launch
  tier.
- **Veredicto**: descartado por sub-tolerância.

### Budget mais frouxo (vermelha em $30)

- **Prós**: maior conforto; menos interrupções.
- **Contras**: $30/mês = R$150 ao câmbio atual. Para mantenedor solo
  sem patrocínio, **30 dias** de imprevisto desse valor não é
  trivial. Sinal de "stop" precisa vir antes desse ponto.
- **Veredicto**: descartado por sub-rigor para o perfil financeiro
  do projeto.

### Spend alerts nativos do Neon (Plan A original desta sessão)

- **Prós**: zero código; mecanismo do provedor.
- **Contras**: descobrimos durante o planejamento desta sessão que
  free tier não expõe essa feature, e mesmo nos planos pagos não é
  documentada como disponível. Não dá pra construir disciplina em
  feature que não existe.
- **Veredicto**: descartado por indisponibilidade. Reabrir quando o
  Neon publicar.

## Consequências

### Positivas

- **Gatilho explícito antes da dor**: o mantenedor é avisado em
  zona amarela, com tempo para reagir antes da zona vermelha.
- **Libera Claude Code e contribuidores futuros** de avaliar
  "será que vale gastar?" em cada PR. As zonas dão regra clara.
- **Documenta filosofia operacional** publicamente. Reforça o
  posicionamento "projeto de custo mínimo, sustentado por
  arquitetura, não por funding".

### Negativas

- **Cada zona requer ação manual** até a automação da Wave 2
  chegar. Revisão mensal é discipline-dependent. Falha de
  disciplina = falha de observabilidade.
- **Thresholds podem virar obsoletos**: se câmbio variar
  significativamente, se Neon mudar pricing, ou se R$/USD descolar,
  os números precisam ser revisados. Este ADR pode receber
  amendments.
- **Falsa segurança em zona verde**: $5/mês não é zero. Acumular
  meses em verde sem revisão pode mascarar tendência de subida.
  Daí a revisão trimestral obrigatória mesmo em verde.

### Neutras

- A definição das zonas é editorial. Outro projeto com perfil
  financeiro diferente escolheria outros valores. O que importa é
  que **existam zonas e respostas explícitas**, não os números
  específicos.

## Revisão trimestral

> Esta seção é apenas estrutura. Comentários reais entram como
> comentários do GitHub na issue de revisão trimestral (#39) e
> linkados aqui no momento da revisão.

```
2026-Q3 (jul-set): pendente — primeira revisão
2026-Q4 (out-dez): pendente
2027-Q1: pendente
...
```

## Referências

- [Issue #38 — implementar /api/stats admin-only](https://github.com/FabioCaffarello/brasil-a-vera/issues/38)
- [Issue #40 — script GitHub Actions de poll de custo Neon + alerta](https://github.com/FabioCaffarello/brasil-a-vera/issues/40)
- [Issue #39 — revisão trimestral de custo (recorrente)](https://github.com/FabioCaffarello/brasil-a-vera/issues/39)
- [ADR-016 — Cobertura temporal e arquivamento](016-cobertura-temporal-arquivamento.md) — mecanismo principal de controle de growth
- [ADR-018 — Estratégia de cache no edge](018-cache-edge-app.md) — outro mecanismo principal
- [Neon Pricing](https://neon.tech/pricing)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
