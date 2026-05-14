# ADR-020: Permanência do monolito TypeScript

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-13
> Status: accepted
> Supersedes: parte do [ADR-007](007-monolith-first-strategy.md) (Strangler Fig para Go) e parte do [ADR-002](002-backend-language-and-framework.md) (escolha de Go como linguagem futura)

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Consequências](#consequências)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Referências](#referências)

---

## Contexto

O [ADR-007](007-monolith-first-strategy.md) original definiu uma estratégia
"monolith first" com **migração futura para Go** via padrão Strangler Fig.
O [ADR-002](002-backend-language-and-framework.md) propôs Go como linguagem
backend de longo prazo. Em abril/2026, antes da Wave 2, esses ADRs faziam
sentido — o produto ainda não tinha sido provado em produção.

Em maio/2026, com Waves 1 e 2 entregues integralmente em TypeScript
(`v0.2-final`), três fatos novos mudaram a leitura:

1. **TypeScript cobriu 100% das features** entregues até `v0.2-final` —
   ingestão, queries, perfis 360°, comparativo, página de partido, alinhamento
   partidário, pares contraditórios, top 5 afinidade, export CSV, OG dinâmico.
   Nenhuma exigiu evasão para outro runtime.

2. **Stack atual é fast-by-default**: Next.js 16 + Drizzle + Neon Serverless
   + Cloudflare Workers + OpenNext entrega rotas dinâmicas com mediana entre
   57ms (`/api/health`) e 745ms (`/parlamentares` DB-heavy). Latência das
   APIs públicas brasileiras (Câmara/Senado) domina a experiência durante a
   ingestão; Go não muda isso.

3. **[ADR-019](019-disciplina-arquitetural-sem-gargalo.md)** (2026-05-13)
   tornou explícita a disciplina: nova peça de infra só entra com gargalo
   empírico medido. Aplicado a Go especificamente: **zero evidência
   empírica de necessidade** após um ano de operação. O ADR-019 lista
   "Módulos Go" entre as peças descartadas por falta de justificativa.

A combinação (TS cobre tudo + perf adequada + ADR-019 explícito) faz com que
manter ADR-007 em status `accepted` seja desonesto — sinaliza um futuro Go
que não está mais previsto. Este ADR-020 supersede formalmente.

## Decisão

A stack permanente do Brasil a Vera é:

- **Runtime**: Node.js 22 em dev / ambiente Cloudflare Workers (V8 isolates)
  em produção
- **Linguagem**: TypeScript strict mode em todo o código (app + ingestão +
  ops)
- **Framework**: Next.js 16 (App Router) — render SSR/SSG + API routes
- **Banco**: PostgreSQL no Neon ([ADR-003](003-database-strategy.md))
- **ORM**: Drizzle ORM + migrations SQL puras
- **Deploy**: Cloudflare Workers via `@opennextjs/cloudflare`
  ([ADR-009](009-cloudflare-pages.md))

**Sem migração planejada para outros runtimes**. Sem Go, sem Rust, sem
Python no escopo da Wave 3 (incluindo Wave 3.4 de inteligência analítica).
NLP pesado, se necessário, vai para [Workers AI](https://developers.cloudflare.com/workers-ai/)
via API; análises de grafo grandes rodam em batch via GitHub Actions e
materializam resultado no banco.

Qualquer proposta futura de mudança de runtime exige seguir o protocolo do
[ADR-019](019-disciplina-arquitetural-sem-gargalo.md) — três condições
concorrentes (métrica de gargalo + tentativa documentada de resolver no
stack atual + ADR específico).

### O que isto NÃO significa

- **Não é "TypeScript para sempre, fim"**. Significa "TypeScript até
  evidência empírica em contrário". Se a Wave 5+ ou um pico de tráfego
  imprevisto trouxer um gargalo concreto, reavalia-se com base em dados,
  não em planejamento especulativo.
- **Não revoga o princípio de "monolith first"** do ADR-007. A regra
  "começa monolito até precisar de extração" permanece — apenas a parte
  específica de "extrair para Go via Strangler Fig" é descartada como
  alvo futuro presumido.
- **Não bloqueia uso de outras linguagens em ferramentas isoladas**.
  Scripts de admin (`.local/`), análises ad-hoc, ou dependências de
  ferramentas externas (ex: `wrangler`, `psql`) podem ser em qualquer
  linguagem. O escopo deste ADR é o **runtime de produção e da ingestão**.

## Consequências

### Positivas

- **Curva de aprendizado zero para contribuidor**: um stack, uma
  linguagem, um framework — ergonomia consistente entre frontend, API e
  ingestão. Princípio 13 do CLAUDE.md aplicado ao recrutamento futuro.
- **Menos pontos de falha**: sem inter-process communication, sem deserialização
  cross-runtime, sem versionamento de RPC entre serviços. Bugs vivem num
  só processo por vez.
- **Custo operacional permanece próximo de zero**: Workers + Neon free/Launch
  cobrem o budget do [ADR-017](017-budget-mensal-observabilidade.md). VPS
  Hostinger ($59/mês) deixa de ser inevitabilidade.
- **Wave 3.4 (analítica) testa o limite do stack** — se a análise de grafo
  em TypeScript bater limite real (memória dos Workers, tempo dos batches),
  ADR-019 captura como evidência para reavaliação. Mas evidência primeiro.

### Negativas

- **Algumas bibliotecas analíticas maduras vivem em Python/R** (NetworkX,
  igraph, pandas). Em TypeScript, equivalentes (graphology, danfo-js) são
  menos maduros. Mitigação: para batch analítico Wave 3.4, validar
  empiricamente; se gap for grande, considerar Workers AI ou script Python
  isolado em GitHub Actions (sem deploy próprio).
- **Concorrência heavy-CPU em Workers é limitada** (V8 isolates com CPU
  cap). Mitigação: deslocar trabalho pesado para GitHub Actions cron com
  resultado materializado no banco, padrão já usado para ingestão.
- **Risco de "TypeScript-shaped" pensar problemas** — pode haver problemas
  cuja solução natural seja em outro runtime e não vejamos. Mitigação:
  reavaliação trimestral via princípio do ADR-019.

### Neutras

- ADR-007 e ADR-002 passam a `superseded` em parte (recorte de Go); a
  parte "monolith first" do ADR-007 permanece válida.
- ADR-006 (escolha de Next.js no frontend) é reforçado — Next.js cobre
  agora app + API permanentemente, não só "frontend até o backend Go
  chegar".

## Alternativas Consideradas

### Manter ADR-007 como está, com Go "futuro indefinido"

- **Prós**: nenhum custo de escrita; sinal "porta aberta" para colaboradores
  interessados em Go.
- **Contras**: documentação desonesta — não está mais planejado. Cria
  expectativa errada de roadmap. Conflita com ADR-019 explícito.
- **Veredicto**: descartado por desonestidade documental.

### Migrar agora para Go (antes de ADR-019)

- **Prós**: comprometimento com o roadmap original.
- **Contras**: zero gargalo empírico após um ano. Custo cognitivo+operacional
  alto sem benefício mensurado. Violaria o ADR-019.
- **Veredicto**: descartado por falta de evidência.

### TypeScript-only via outro framework (Bun + Hono, Deno + Fresh)

- **Prós**: ergonomia melhor em alguns aspectos (Bun é rápido).
- **Contras**: troca um framework maduro (Next.js + OpenNext + Workers)
  por opções menos validadas em produção brasileira. Sem gargalo empírico
  para justificar.
- **Veredicto**: mesmo critério do ADR-019 — sem evidência, não muda.

## Referências

- [ADR-007 — Monolith First Strategy](007-monolith-first-strategy.md) (superseded em parte por este ADR)
- [ADR-002 — Backend language & framework](002-backend-language-and-framework.md) (superseded em parte por este ADR)
- [ADR-019 — Disciplina arquitetural (sem gargalo empírico)](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-006 — Frontend stack (Next.js)](006-frontend-stack.md)
- [ADR-009 — Deploy em Cloudflare Workers](009-cloudflare-pages.md)
- [ADR-017 — Budget mensal e observabilidade de custo](017-budget-mensal-observabilidade.md)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) — caminho para NLP pesado se gargalo empírico aparecer
