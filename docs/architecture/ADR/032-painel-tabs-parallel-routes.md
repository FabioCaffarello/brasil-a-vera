# ADR-032: Painel migra para rota única com tabs via Parallel Routes

> Brasil à Vera · Arquitetura · v0.1
> Última atualização: 2026-05-19
> Status: accepted

---

## Contexto

A Wave 10 (release `v0.10.0-area-logada`, 2026-05-19) entregou a área autenticada distribuída em **5 rotas Next.js**: `/painel`, `/painel/parlamentares`, `/painel/alertas`, `/painel/configuracoes`, `/painel/configuracoes/meus-dados`. Cada rota é uma RSC `dynamic` com queries isoladas, `metadata` estática e sub-tabs via `?tab=` query param dentro de algumas rotas. A topologia foi aprovada no [LOGGED-AREA-VISION.md §4](../../product/LOGGED-AREA-VISION.md) e na decisão de topologia de auth do [ADR-029](./029-modelo-dados-area-logada-e-topologia-auth.md).

Após revisão de produto pós-entrega, o owner decidiu **reverter para rota única `/painel` com tabs expostas via Parallel Routes** (`@slot/`). A motivação é UX, não técnica: as 4–5 áreas funcionais do painel são pilares **paralelos** da experiência (acompanhamento de parlamentares, gestão de alertas, configurações, transparência LGPD), não níveis hierárquicos. Multi-rota tradicional impunha custo cognitivo de "navegar entre páginas" quando a experiência correta é "trocar de pilar dentro do mesmo app".

A decisão também promove **Meus Dados** (LGPD) de sub-rota (`/painel/configuracoes/meus-dados`) a tab principal (`/painel?tab=meus-dados`), refletindo o princípio "privacidade é feature" registrado no VISION §1 ponto 2.

O refator tem custo técnico explícito: ~3 sprints sobre código estável, reescrita de 5 páginas em slots, recriação de TabBar, util novo de validação, atualização de 6 links internos e 1 teste. A decisão é consciente do dono do produto. Pré-lançamento permite **zero retrocompatibilidade** (URLs antigas deixam de existir sem redirects).

ADRs anteriores afetados pelo escopo:
- [ADR-022 — Clerk para autenticação](./022-clerk-para-autenticacao.md) — ganhará addendum apontando para este ADR e para o RFC
- [ADR-029 — Modelo de dados + topologia de auth](./029-modelo-dados-area-logada-e-topologia-auth.md) — ganhará addendum (topologia continua válida; apenas a arquitetura de rotas muda)

Este ADR formaliza a reversão. O RFC operacional ([REFACTOR-PAINEL-TABS.md](../../product/REFACTOR-PAINEL-TABS.md)) detalha o plano em 4 fases, o inventário de mudanças e os critérios de aceitação.

---

## Decisão

Migrar o painel da Wave 10 de **5 rotas multi-segmento** para **rota única `/painel` com tabs via Next.js Parallel Routes**. Topologia final:

```
src/app/(authenticated)/painel/
├── layout.tsx              ← TabBar + composição de slots
├── page.tsx                ← entry-point neutro
├── @resumo/{default,page}.tsx
├── @parlamentares/{default,page}.tsx
├── @alertas/{default,page}.tsx
├── @configuracoes/{default,page}.tsx
└── @meusDados/{default,page}.tsx
```

**5 tabs principais** expostas via `?tab=` query param:

- `?tab=resumo` (default)
- `?tab=parlamentares`
- `?tab=alertas`
- `?tab=configuracoes`
- `?tab=meus-dados` (**promovida de sub-rota a pilar**)

**Sub-tabs** via segundo query param `?subtab=` quando aplicável (Parlamentares e Alertas). Validação centralizada em `src/lib/painel-tabs.ts`.

**Mecanismo de slot ativo**: dado que Next.js layouts não recebem `searchParams`, o layout renderiza todos os 5 slots em paralelo (RSC streaming concorrente) e um client component `<ActiveSlotPicker />` consome `useSearchParams()` para renderizar apenas o slot ativo. Custo aceito conscientemente — 5× queries server-side por request, mitigado por `cached()` por slot (ADR-018) com TTLs adequados (Resumo 60s, Da minha UF 1h, demais 0s pela natureza form/inbox).

**Zero retrocompatibilidade**: URLs `/painel/parlamentares`, `/painel/alertas`, `/painel/configuracoes`, `/painel/configuracoes/meus-dados` deixam de existir. Sem redirects 301/308. Produto pré-lançamento, sem links externos a preservar.

**APIs `/api/painel/*` (11 routes)**, schema do banco, auth (Clerk, middleware, `auth.protect()`), `ConsentGate`, `MigracaoLocalStorageModal` e `OnboardingWizard` permanecem **intocados**.

Execução em 4 fases: (1) RFC + ADR (este PR), (2) refator estrutural, (3) polimento visual, (4) atualização documental. Detalhes em [REFACTOR-PAINEL-TABS.md §5](../../product/REFACTOR-PAINEL-TABS.md).

---

## Alternativas Consideradas

### Alternativa A — Manter multi-rota (status quo)

Cada pilar como rota Next.js própria (`/painel/parlamentares`, etc.), exatamente como entregue na Wave 10.

- **Prós**: arquitetura aprovada no VISION + ADR-029; código estável e auditado em produção (release tag); cada rota tem RSC + cache + metadata estática nativas
- **Contras**: UX percebe "5 páginas separadas" em vez de "um app com tabs"; transição custa navegação completa (mesmo com Next prefetch é click → mudança de URL inteira); Meus Dados (LGPD) fica escondido em sub-rota de Configurações, escondendo um pilar de produto
- **Veredicto**: rejeitada pela decisão de produto pós-entrega. Custo técnico do refator aceito por valor de UX

### Alternativa B — Tabs client-side com `useState`

`/painel` como rota única, TabBar é client component com `useState` para tab ativa.

- **Prós**: implementação trivial; sem split de código complicado; rolagem entre tabs instantânea (sem nem mudança de URL)
- **Contras**: perde RSC totalmente (cliente fica responsável por fetch de cada tab); SSR não emite conteúdo de nenhuma tab antes de hidratar; LCP do `/painel` pior; URL não reflete estado (refresh perde tab atual); back/forward quebrado; deep-link impossível
- **Veredicto**: rejeitada por violar 3 princípios simultâneos — RSC-first do projeto, URL como fonte da verdade, e degradação graciosa sem JS

### Alternativa C — Query param puro com swap server-side em single `page.tsx`

`/painel` como single `page.tsx` que recebe `searchParams.tab` e renderiza condicionalmente os componentes de cada tab inline. Sem `@slot/`.

- **Prós**: usa só features padrão de Next.js (RSC + searchParams); sem ginástica de Parallel Routes; sem 5× query cost
- **Contras**: single `page.tsx` monolítica concentra **todas as queries do painel** num único arquivo (~700 linhas); perde split de código natural por tab (bundle do `page.tsx` carrega referências de todas as 5 áreas); RSC streaming serializa em vez de paralelizar
- **Veredicto**: rejeitada. Single page.tsx vira "god component"; perdemos split natural de código que Parallel Routes oferece. Custo de queries paralelas (5×) é trocado por bundle pior e ergonomia ruim de manutenção

### Alternativa D — Parallel Routes (`@slot/`) com `?tab=` query param — **ESCOLHIDA**

Estrutura de Parallel Routes nativa do Next.js. Cada slot tem seu `page.tsx` independente com queries próprias. Layout combina slots + TabBar + `<ActiveSlotPicker />` client.

- **Prós**: split de código por slot natural (cada `@slot/page.tsx` é bundle independente); RSC streaming concorrente; cada slot evolui sem impactar os outros; convenção Next.js explícita (Parallel Routes é feature documentada); ergonomia de manutenção alta (mover um slot = `mv` de uma pasta)
- **Contras**: complexidade conceitual (devs novos vão estranhar `@slot/` e `default.tsx`); todos os 5 slots renderizam server-side por request (5× queries, mitigado por `cached()` ADR-018); `metadata` dinâmica via `generateMetadata` em vez de estática por rota
- **Veredicto**: **escolhida**. Custo de complexidade conceitual e queries paralelas é aceito em troca de split de código + ergonomia + alinhamento com convenção Next.js

### Alternativa E — Dynamic segment `/painel/[tab]/page.tsx`

Single dynamic route segment que recebe `tab` como param. `/painel/parlamentares` como URL real, não query param.

- **Prós**: Parallel Routes naturalmente match-by-segment; layout sabe qual slot mostrar sem ginástica client; sem custo de 5× queries
- **Contras**: URL volta a parecer "rotas separadas" (objetivo UX explicitamente é unificar via `?tab=`); cria ambiguidade com rotas removidas (`/painel/parlamentares` agora é o `[tab]` match — comportamento idêntico mas conceito diferente); validação de `tab` precisa de `notFound()` ou redirect, sem o "ignorar silenciosamente" do RFC §8
- **Veredicto**: rejeitada. Conflita com a decisão de produto §1 — URL deve **expressar tabs**, não rotas; `?tab=` é a forma idiomática de tabs

---

## Consequências

### Positivas

- **Experiência de "app único"** com troca de tabs instantânea (RSC streaming + prefetch)
- **5 pilares de produto** visualmente claros e simétricos (incluindo LGPD/Meus Dados promovido)
- **Privacidade visível** — Meus Dados deixa de ser link rodapé em Configurações e vira tab principal, alinhado ao princípio "privacidade é feature" (VISION §1)
- **Split de código por slot** preserva separação de concerns (cada `@slot/page.tsx` evolui independente)
- **URL como estado** (refresh, share, back/forward preservados)
- **Util de validação centralizado** (`src/lib/painel-tabs.ts`) — fonte única de defaults e parsing, evitando duplicação `if (tab === 'X')` espalhada

### Negativas

- **Complexidade conceitual** de Parallel Routes — devs novos no Next.js levarão tempo para entender `@slot/`, `default.tsx`, e a interação de slots com layouts. Mitigação: documentação inline no `layout.tsx` + referência cruzada para esse ADR e o RFC
- **5× queries server-side por request `/painel`** — todos os slots renderizam server-side mesmo que só um seja visível. Mitigação: `cached()` ADR-018 por slot, TTLs calibrados (R1 do RFC); medir após deploy
- **Refator de ~3 sprints sobre código estável** — Wave 10 entregue há horas, agora reescrita. Custo técnico aceito pelo dono do produto
- **URLs internas quebram** — links em `privacidade/page.tsx`, redirects em `onboarding/route.ts`, link em `configuracoes/page.tsx → meus-dados` precisam ser todos atualizados na Fase 2 (mitigada: pré-lançamento, owner aceita)
- **`metadata` dinâmica em vez de estática** — perde a clareza de "este arquivo tem este título"; `generateMetadata({ searchParams })` precisa de switch baseado em `tab`
- **Bundle do `/painel`** pode crescer porque carrega referências de 5 slots simultaneamente. Risco R3 do RFC; medir após deploy e split com `dynamic()` se necessário

### Neutras

- **VISION §4 (Arquitetura de rotas)** continua válido em substância (área autenticada, RSC dynamic, `auth.protect()` middleware, cache strategy por slot via ADR-018). Ganha **addendum** na Fase 4 apontando para este ADR e para o RFC, sem reescrita retroativa
- **ADR-022** (auth) continua válido em substância. Ganha **addendum** análogo
- **ADR-029** (topologia auth via route group `(authenticated)/`) continua válido sem mudança — o route group e o `<ConsentGate />` permanecem
- **APIs (`/api/painel/*`)**, schema, middleware, OnboardingWizard, ConsentGate, MigracaoLocalStorageModal — todos preservados intactos
- **Release `v0.10.0-area-logada` é histórico** — não é reescrito; este ADR e o refator são pós-tag

---

## Links

- [REFACTOR-PAINEL-TABS.md](../../product/REFACTOR-PAINEL-TABS.md) — RFC operacional com inventário, plano de 4 fases e critérios de aceitação
- [LOGGED-AREA-VISION.md §4](../../product/LOGGED-AREA-VISION.md) — arquitetura de rotas Wave 10 (ganhará addendum na Fase 4)
- [ADR-022](./022-clerk-para-autenticacao.md) — Clerk auth + topologia Wave 10 (ganhará addendum na Fase 4)
- [ADR-029](./029-modelo-dados-area-logada-e-topologia-auth.md) — Modelo de dados + topologia route group (válido sem mudança)
- [ADR-018](./018-cache-edge-app.md) — Cache de edge `cached()` (mecanismo de mitigação do custo 5× queries)
- [ADR-019](./019-disciplina-arquitetural-sem-gargalo.md) — Disciplina de gargalo concreto antes da peça nova (anti-pattern "tabs genéricas" em §12 do RFC)
- [`docs/releases/v0.10.0-area-logada.md`](../../releases/v0.10.0-area-logada.md) — Release Wave 10 (histórico, **não reescrito**)
