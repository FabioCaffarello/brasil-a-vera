## Prontidão de migração por rota — brasil-a-vera × RDS

> Análise original: 2026-06-06 com RDS 3.3.1 · Branch `docs/route-readiness`.
> Reavaliação: 2026-06-09 (§3.6, §3.7) com RDS 3.7.0 publicado e fix #358
> resolvido.
>
> Fonte de categorias: `docs/migration/migration-matrix.md` (mergeado em #355).
> Inventário-base: `docs/migration/component-inventory.md`. Drafts E1–E12
> (enhancements) e N1–N9 (novos componentes) referenciam essa matriz.

## Resumo executivo (atualizado 2026-06-09)

- 21 rotas de produção analisadas (`app/**/page.tsx`, excluindo `rds/`, `dev/`,
  `docs/`, `api/`).
- **Alta prontidão hoje: 8 rotas** (subiu de 6 pós-fix #358 + RDS 3.7.0).
  Inclui agora **os 3 perfis de detalhe**, que estavam em baixa por causa do
  trio `KpiStrip + SectionCard + SectionNav` — os três bloqueadores fecharam
  upstream no RDS.
- **Média prontidão hoje: 12 rotas** (todas com 1 bloqueador único pendente
  — geralmente `HeroSection #163` ou `FilterChips #162`).
- **Baixa prontidão: 0** (era 3 — todos os perfis subiram).
- **Recomendação original:** `/partidos/[sigla]` — **migrada** como piloto-1.
- **Recomendação atualizada:** próxima rota é um dos **3 perfis de detalhe**,
  preferencialmente **`/parlamentares/[id]`** (menos denso, lote único com os
  outros dois). Detalhamento em §3.7.

> Tabelas e narrativa originais preservadas abaixo (§1–§3) para histórico.
> Reavaliação em §3.6 e §3.7.

## §1 — Tabela de prontidão

Ordenada por score (alta → baixa), depois por nº total catalogado.
`cat.X` = quantidade de componentes da matriz naquela categoria que a rota usa.
`Total` = soma. Chrome do root layout (Navbar/Footer/Toaster) entra em todas
as rotas que não sobrescrevem o root layout — toda a coluna conta com eles.

> **Esta tabela é da análise original (2026-06-06).** Para a reavaliação com
> o estado atual do RDS (3.7.0) e o efeito do fix #358, ver §3.6 e §3.7 abaixo.

| Rota | Total | cat. 1 | cat. 2 | cat. 3 | cat. 4 | Bloqueadores cat. 3 | Score | Faixa #358 |
| --- | ---: | ---: | ---: | ---: | ---: | --- | :---: | :---: |
| `/feed` | 3 | 0 | 1 | 0 | 2 | — | alta | B-periférico |
| `/privacidade` | 3 | 0 | 1 | 0 | 2 | — | alta | B |
| `/sign-in` | 5 | 0 | 1 | 0 | 4 | — | alta | A |
| `/sign-up` | 5 | 0 | 1 | 0 | 4 | — | alta | A |
| `/partidos/[sigla]` | 7 | 0 | 1 | 0 | 6 | — | alta | A (piloto migrada) |
| `/parlamentares/[id]/gastos` | 6 | 0 | 3 | 1 | 2 | FilterChips (N2) | alta | B |
| `/comparar` | 8 | 0 | 2 | 2 | 4 | HeroSection (N3), SectionCard (N1) | média | B |
| `/busca` | 10 | 0 | 2 | 2 | 6 | HeroSection (N3), SectionCard (N1) | média | B |
| `/parlamentares` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média | B |
| `/proposicoes` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média | B |
| `/votacoes` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média | B |
| `/` (home) | 12 | 0 | 3 | 3 | 6 | HeroSection (N3), KpiCard (N5), SectionCard (N1) | média | B |
| `/painel` (entry) | 7 | 0 | 1 | 1 | 5 | TabBar (N8) | média | B |
| `/painel ?tab=resumo` | 11 | 0 | 1 | 1 | 9 | TabBar (N8) | média | B |
| `/painel ?tab=meus-dados` | 8 | 0 | 1 | 1 | 6 | TabBar (N8) | média | B |
| `/painel ?tab=configuracoes` | 10 | 0 | 1 | 1 | 8 | TabBar (N8) | média | B |
| `/painel ?tab=alertas` | 10 | 0 | 1 | 2 | 7 | TabBar (N8), SubTabs alertas (N8) | média | B |
| `/painel ?tab=parlamentares` | 11 | 0 | 1 | 2 | 8 | TabBar (N8), SubTabs parl. (N8) | média | B |
| `/parlamentares/[id]` | 11 | 0 | 2 | 3 | 6 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa | B |
| `/proposicoes/[tipo]/[numero]/[ano]` | 15 | 0 | 2 | 3 | 10 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa | B |
| `/votacoes/[id]` | 17 | 0 | 2 | 3 | 12 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa | B |

Notas sobre a tabela:

- A categoria 1 não aparece em nenhuma rota porque os primitivos cat. 1 (Skeleton,
  Badge, Dialog Root, P de docs etc.) são consumidos por composições — que estão
  em cat. 2/3/4. Eles aparecerão indiretamente durante a migração.
- O `Toaster` (cat. 2 / draft E12) entra em todas as rotas via root layout. É o
  gap cat. 2 mais ubíquo.
- `Navbar` e `Footer` (cat. 4) também entram via root layout. Sign-in/sign-up
  mantêm o root layout.
- Os 3 perfis de detalhe são **estruturalmente idênticos** sob o ângulo de
  prontidão: usam o mesmo trio `KpiStrip + SectionCard + SectionNav + Accordion`.
  Resolver N1, N4, N6 desbloqueia os três simultaneamente.

## §2 — Detalhe por rota

### `/` (home)

- **Arquivo:** `src/app/page.tsx` (+ root layout)
- **Total catalogados:** 12
- **Quebra:** cat.1=0 · cat.2=3 · cat.3=3 · cat.4=6
- **Bloqueadores cat. 3:**
  - `SectionCard` — Draft **N1**
  - `HeroSection` — Draft **N3**
  - `KpiCard` — Draft **N5**
- **Gaps cat. 2 acionados:**
  - `Button` — Draft **E1**
  - `DataBadge` — Draft **E2**
  - `Toaster` — Draft **E12** (via root layout)
- **Score:** média (3 bloqueadores, todos load-bearing)
- **Observações:** os 3 bloqueadores fazem o shell da página. Sem eles, migrar
  ainda é possível mas regridia o look (cair pra primitivas cruas).

### `/busca`

- **Arquivo:** `src/app/busca/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=2 · cat.3=2 · cat.4=6
- **Bloqueadores:** `HeroSection` (N3), `SectionCard` (N1)
- **Gaps:** `DataBadge` (E2), `Toaster` (E12)
- **Score:** média

### `/comparar`

- **Arquivo:** `src/app/comparar/page.tsx`
- **Total:** 8
- **Quebra:** cat.1=0 · cat.2=2 · cat.3=2 · cat.4=4
- **Bloqueadores:** `HeroSection` (N3), `SectionCard` (N1)
- **Gaps:** `DataBadge` (E2), `Toaster` (E12)
- **Score:** média

### `/feed`

- **Arquivo:** `src/app/feed/page.tsx`
- **Total:** 3
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=0 · cat.4=2
- **Bloqueadores:** nenhum
- **Gaps:** `Toaster` (E12) — apenas via root layout
- **Score:** alta
- **Observações:** rota textual (lista de feeds RSS). Migrar = aproveitar os
  primitivos do RDS para typography/cards. Aprendizado limitado por simplicidade.

### `/parlamentares`

- **Arquivo:** `src/app/parlamentares/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=4 · cat.3=2 · cat.4=4
- **Bloqueadores:** `HeroSection` (N3), `StatsGrid` (N7)
- **Gaps:** `Button` (E1), `DataBadge` (E2), `EmptyState` (E11), `Toaster` (E12)
- **Score:** média
- **Observações:** padrão de listagem que se repete em `/proposicoes` e
  `/votacoes`. Migrar uma ensina as outras duas.

### `/parlamentares/[id]`

- **Arquivo:** `src/app/parlamentares/[id]/page.tsx`
- **Total:** 11
- **Quebra:** cat.1=0 · cat.2=2 · cat.3=3 · cat.4=6
- **Bloqueadores:** `KpiStrip` (N4), `SectionCard` (N1), `SectionNav` (N6)
- **Gaps:** `Accordion` (E4), `Toaster` (E12)
- **Score:** baixa
- **Observações:** o pior caso da matriz — 3 bloqueadores cat. 3 sob a estrutura
  da página. Resolver N1+N4+N6 destrava também os outros 2 perfis (proposição e
  votação).

### `/parlamentares/[id]/gastos`

- **Arquivo:** `src/app/parlamentares/[id]/gastos/page.tsx`
- **Total:** 6
- **Quebra:** cat.1=0 · cat.2=3 · cat.3=1 · cat.4=2
- **Bloqueadores:** `FilterChips` (wrapper) — Draft **N2**
- **Gaps:** `FilterChip` (E3), `Label` (E5), `Toaster` (E12)
- **Score:** alta
- **Observações:** rota compacta, focada em paginação por filtros. Domain-light.
  Server Component puro.

### `/partidos/[sigla]`

- **Arquivo:** `src/app/partidos/[sigla]/page.tsx`
- **Total:** 7
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=0 · cat.4=6
- **Bloqueadores:** nenhum
- **Gaps:** `Toaster` (E12) via root layout
- **Score:** alta
- **Observações:** todos os componentes principais (`PartidoHeader`,
  `FidelidadeMediaBlock`, `GastoBancadaBlock`, `TopTemasPartido`) são
  domain-coupled (cat. 4). Padrão de "perfil leve" sem o trio de bloqueadores
  cat. 3 que afeta os perfis individuais.

### `/privacidade`

- **Arquivo:** `src/app/privacidade/page.tsx`
- **Total:** 3
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=0 · cat.4=2
- **Bloqueadores:** nenhum
- **Gaps:** `Toaster` (E12)
- **Score:** alta
- **Observações:** texto puro. Sem domínio.

### `/proposicoes`

- **Arquivo:** `src/app/proposicoes/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=4 · cat.3=2 · cat.4=4
- **Bloqueadores:** `HeroSection` (N3), `StatsGrid` (N7)
- **Gaps:** `Button` (E1), `DataBadge` (E2), `EmptyState` (E11), `Toaster` (E12)
- **Score:** média (idem `/parlamentares`)

### `/proposicoes/[tipo]/[numero]/[ano]`

- **Arquivo:** `src/app/proposicoes/[tipo]/[numero]/[ano]/page.tsx`
- **Total:** 15
- **Quebra:** cat.1=0 · cat.2=2 · cat.3=3 · cat.4=10
- **Bloqueadores:** `KpiStrip` (N4), `SectionCard` (N1), `SectionNav` (N6)
- **Gaps:** `Accordion` (E4), `Toaster` (E12)
- **Score:** baixa
- **Observações:** idêntica à `/parlamentares/[id]` no eixo de prontidão; mais
  componentes de domínio (charts, autores, temas).

### `/votacoes`

- **Arquivo:** `src/app/votacoes/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=4 · cat.3=2 · cat.4=4
- **Bloqueadores:** `HeroSection` (N3), `StatsGrid` (N7)
- **Gaps:** `Button` (E1), `DataBadge` (E2), `EmptyState` (E11), `Toaster` (E12)
- **Score:** média (idem `/parlamentares` e `/proposicoes`)

### `/votacoes/[id]`

- **Arquivo:** `src/app/votacoes/[id]/page.tsx`
- **Total:** 17 — a rota com mais componentes catalogados.
- **Quebra:** cat.1=0 · cat.2=2 · cat.3=3 · cat.4=12
- **Bloqueadores:** `KpiStrip` (N4), `SectionCard` (N1), `SectionNav` (N6)
- **Gaps:** `Accordion` (E4), `Toaster` (E12)
- **Score:** baixa

### `/painel` (entry page)

- **Arquivo:** `src/app/(authenticated)/painel/page.tsx` (+ painel layout +
  authenticated layout + root layout)
- **Total:** 7 (chrome agregado dos 3 layouts)
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=1 · cat.4=5
- **Bloqueadores:** `TabBar` (N8) — vive no painel layout, então afeta as 6
  superfícies da área logada
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/painel ?tab=resumo` (slot `@resumo`)

- **Arquivo:** `src/app/(authenticated)/painel/@resumo/page.tsx`
- **Total:** 11
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=1 · cat.4=9
- **Bloqueadores:** `TabBar` (N8) via painel layout
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/painel ?tab=parlamentares` (slot `@parlamentares`)

- **Arquivo:** `src/app/(authenticated)/painel/@parlamentares/page.tsx`
- **Total:** 11
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=2 · cat.4=8
- **Bloqueadores:** `TabBar` (N8), `SubTabs` parlamentares (N8 — mesmo draft)
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/painel ?tab=alertas` (slot `@alertas`)

- **Arquivo:** `src/app/(authenticated)/painel/@alertas/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=2 · cat.4=7
- **Bloqueadores:** `TabBar` (N8), `SubTabs` alertas (N8 — mesmo draft)
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/painel ?tab=configuracoes` (slot `@configuracoes`)

- **Arquivo:** `src/app/(authenticated)/painel/@configuracoes/page.tsx`
- **Total:** 10
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=1 · cat.4=8
- **Bloqueadores:** `TabBar` (N8)
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/painel ?tab=meus-dados` (slot `@meusDados`)

- **Arquivo:** `src/app/(authenticated)/painel/@meusDados/page.tsx`
- **Total:** 8
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=1 · cat.4=6
- **Bloqueadores:** `TabBar` (N8)
- **Gaps:** `Toaster` (E12)
- **Score:** média

### `/sign-in` e `/sign-up`

- **Arquivo:** `src/app/(authenticated)/sign-in/[[...sign-in]]/page.tsx` e par
- **Total:** 5
- **Quebra:** cat.1=0 · cat.2=1 · cat.3=0 · cat.4=4
- **Bloqueadores:** nenhum
- **Gaps:** `Toaster` (E12)
- **Score:** alta
- **Observações:** o conteúdo principal é o widget `<SignIn />` / `<SignUp />`
  do Clerk — fora do escopo do RDS. Migração se resume ao chrome
  (Navbar/Footer/Toaster + ConsentGate/MigracaoLocalStorageModal do auth layout).

## §3 — Recomendação da primeira rota

### Primeira rota: `/partidos/[sigla]`

Por que essa, e não a home ou um perfil:

- **Zero bloqueadores cat. 3** — exercita MIGRAÇÃO real, não criação de
  componente no RDS. Ataca um problema solucionável hoje.
- **Domain-coupled puro** — todos os 4 componentes principais
  (`PartidoHeader`, `FidelidadeMediaBlock`, `GastoBancadaBlock`,
  `TopTemasPartido`) são cat. 4. Exercita o padrão dominante da matriz
  (94/133 = 70.7% dos componentes catalogados são cat. 4), que é
  "componente de domínio consome primitivas do RDS internamente".
- **Compacta** — 4 blocos de domínio + chrome. Caberia numa sprint focada
  com objetivo claro.
- **Aprende a regra de adoção** — como conectar `Card`, `Badge`, `Text`,
  `Progress`, `Skeleton` do RDS dentro de componentes domain-coupled sem
  reescrever lógica do dado.
- **Não bloqueia perfis** — `/partidos/[sigla]` não compartilha estrutura com
  os 3 perfis de detalhe (que precisam de N1+N4+N6). Migrar partidos primeiro
  não atrasa nem antecipa os perfis.

### Por que NÃO a home ainda

Home (`/`) é a página mais visível, mas tem **3 bloqueadores cat. 3**
(`HeroSection`, `KpiCard`, `SectionCard`). Migrar a home antes de N1, N3, N5
exigiria primitivas cruas onde hoje há composições — regressão visível ao
usuário final em troca de aprendizado limitado.

### Por que NÃO um perfil

Os 3 perfis (`/parlamentares/[id]`, `/proposicoes/[…]`, `/votacoes/[id]`) são
**baixa prontidão** com o mesmo trio de bloqueadores. Quando N1, N4, N6
fecharem upstream, **os três migram juntos** — esperar é mais barato que
forçar.

### Issues do RDS a abrir ANTES de migrar `/partidos/[sigla]`

**Nenhuma.** Não há bloqueador cat. 3 nessa rota. As primitivas necessárias
(`Card`, `Badge`, `Text`, `Progress`, `Skeleton`) já existem no RDS 3.3.1.

### Issues do RDS a abrir DURANTE a migração de `/partidos/[sigla]`

Apenas se a migração descobrir gaps específicos nos 4 componentes
domain-coupled. Os gaps gerais que essa rota toca via root layout:

- Draft **E12** (`Toaster` → `ToastContainer` + `useToast`) — pode ficar como
  follow-up se o uso atual via `sonner` continuar funcionando lado a lado.

### Próxima rota após `/partidos/[sigla]`

`/parlamentares/[id]/gastos` — 1 bloqueador único (`FilterChips` wrapper, N2),
exercita 2 gaps cat. 2 não-triviais (`FilterChip` E3, `Label` E5), e estabelece
o padrão "filtros + lista paginada server-rendered".

### Sequência de issues do RDS sugerida para a primeira onda

Esta lista vale para as 4 primeiras rotas (partidos, gastos, listagens), em
ordem de urgência:

1. **N2** — novo componente `FilterChips` (wrapper) — desbloqueia
   `/parlamentares/[id]/gastos` e parte das listagens.
2. **N3** — novo componente `HeroSection` — desbloqueia todas as 5 rotas que
   abrem com hero (`/`, `/busca`, `/comparar`, `/parlamentares`, `/proposicoes`,
   `/votacoes`).
3. **N7** — novo componente `StatsGrid` — desbloqueia as 3 listagens
   principais.
4. **E3** — gap `Chip` (Draft E3: count + asChild) — entra junto com N2.
5. **E5** — gap `Label` (foundational).
6. **E11** — gap `EmptyState` (foundational para todas listagens).

Drafts E1 (Button) e E2 (DataBadge) já são acionados em quase tudo, mas o
brasil-a-vera não bloqueia migração esperando eles — são variantes
incrementais.

### Ordem operacional sugerida

1. Branch `feat/migrate-partidos` (esta rota não precisa de issue upstream).
2. Trocar imports dos 4 componentes domain-coupled para usar primitivas RDS
   (`Card`, `Badge`, `Text`, `Progress`, `Skeleton`).
3. Smoke + visual diff. Aprender quais ajustes "menores" surgem — abrir
   draft de issue de RDS APENAS para gaps reproduzidos, não especulativos.
4. PR `/partidos/[sigla]` → main.
5. Branch `feat/migrate-gastos` — abre N2 + E3 + E5 como issues no RDS
   primeiro, espera N2 fechar, migra.
6. As 5 rotas que dependem de N3 + N7 esperam essas issues fecharem.
7. Os 3 perfis de detalhe são a última onda — esperam N1 + N4 + N6.

## §3.5 — Partição por dependência da issue #358 (resíduo `--primary`)

A issue
[#358](https://github.com/FabioCaffarello/brasil-a-vera/issues/358) registra
o resíduo `--primary` no consumidor: 14 classes (`bg-brand`, `text-brand`,
`bg-primary`, `text-primary`, `ring-ring`, `bg-accent`, `text-accent`,
`border-brand`, `border-accent`, `hover:bg-brand`, `hover:text-brand`,
`focus:ring-brand`, `focus:ring-ring`, `focus-visible:ring-ring`) apontam
para azul vibrante `#438aff` em vez da navy do RDS. Migrar uma rota que
consome essas classes ANTES da #358 resolver = a rota fica navy enquanto o
resto do app é vibrante (duas marcas visíveis).

### Classificação

- **A** — não consome cor de marca de forma significativa; migrável já.
- **B-periférico** — só consome em hover/focus discreto
  (`hover:border-brand/60`, `hover:bg-brand/5`, `ring-ring`); tolerável.
- **B** — consome em estado padrão visível: `bg-brand` em CTA primário
  (Button default variant), `text-brand` em link textual, `bg-brand` em
  chip selecionado, `text-brand` em active state de tabs/section-nav,
  badges/cards de identidade. Espera a #358 para evitar duas marcas.

### Achado crítico — Button default é central

`src/design-system/primitives/button.tsx` define `default` variant como
`bg-brand text-brand-foreground hover:bg-brand/90`. **Todo `<Button>` sem
variant explícito é uso central do resíduo.** Listagens, formulários e
home usam Button default abundantemente — daí ficarem em B.

### Distribuição por score × faixa

| Score | A | B-periférico | B | Total |
|---|---:|---:|---:|---:|
| alta | 3 | 1 | 2 | 6 |
| média | 0 | 0 | 12 | 12 |
| baixa | 0 | 0 | 3 | 3 |
| **Total** | **3** | **1** | **17** | **21** |

Das 21 rotas, **17 (~81%) são Faixa B**: bloqueadas pela #358. Apenas 4
são migráveis sem esperar (3 A + 1 B-periférico), e dessas:

- `/partidos/[sigla]` — A — **já migrada (piloto-1)**.
- `/sign-in`, `/sign-up` — A — conteúdo principal é widget Clerk fora
  do escopo do RDS; aprendizado limitado.
- `/feed` — B-periférico — um único hover de card. Aprendizado pequeno
  (rota textual sem componentes catalogados).

### Recomendação estratégica

**Próxima ação: resolver a #358, não migrar mais uma rota.**

Justificativa quantitativa:

- 17 de 21 rotas (81%) estão bloqueadas pela #358 em uso central.
- 4 alta-prontidão estão em B (`/privacidade`, `/parlamentares/[id]/gastos`,
  e a piloto que já foi); 1 está B-periférico (`/feed`); 2 são "vazias"
  Clerk (sign-in/sign-up).
- Resolver #358 destrava **17 rotas de uma vez**. Migrar mais uma rota A
  (das 2 candidatas restantes) destrava 1 rota com aprendizado
  marginal e deixa o resto do plano de migração travado.

Análogo ao padrão `asChild` no RDS (issue #154 do RDS): resolver o
bloqueador único que destrava muitos casos é mais alavancado que migrar
um caso neutro. Aqui o paralelo é direto.

### Sequência operacional sugerida

1. **Próximo PR** = correção do resíduo `--primary`/`--ring`/`--chart-1`
   (e revisão de `--accent`) seguindo o critério de aceite da #358.
   Revisão visual antes/depois nas rotas mais visíveis (home,
   `/parlamentares`, `/parlamentares/[id]`, `/painel`).
2. **Após #358 fechar**, retomar a fila pela ordem da §3 atualizada:
   `/parlamentares/[id]/gastos` (1 bloqueador cat. 3 — N2 do RDS),
   depois `/privacidade` e `/feed` como rotas de aprendizado, e então
   as listagens conforme N3/N7 (e demais) fecharem upstream.
3. **`/sign-in` e `/sign-up`** ficam como rotas-cosmético: chrome puro,
   migráveis a qualquer momento para fechar o painel de cobertura
   (não bloqueiam nada).

## §3.6 — Reavaliação (2026-06-09): bloqueadores resolvidos

Desde a análise original, três coisas mudaram que alteram materialmente a
fila de prontidão:

### Fix #358 + follow-up #363: resíduo `--primary` resolvido

A coluna "Faixa #358" da tabela §1 é **histórica**. O resíduo foi corrigido
em `main` por:

- [PR #361](https://github.com/FabioCaffarello/brasil-a-vera/pull/361) — repontou `--primary`, `--ring`,
  `--chart-1` para a escala navy local.
- [PR #363](https://github.com/FabioCaffarello/brasil-a-vera/pull/363) — ajustou contraste (navy-500 →
  navy-400 dark + cascata) após detecção retroativa de regressões AA.

O app inteiro consome a identidade navy correta em ambos os temas, com AA
body confirmado em todos os pares texto/marca. **Toda rota que estava em
"Faixa B" por uso central de cor de marca agora migra sem conflito.**

Dívida estrutural rastreada (não bloqueia esta fila): issue
[#362](https://github.com/FabioCaffarello/brasil-a-vera/issues/362) — promover `wcag-check` ao CI.

### RDS 3.7.0 publicado — 4 dos 6 bloqueadores cat. 3 fechados

Confirmação factual (versões publicadas no npm registry, lista de exports
real da 3.7.0 inspecionada):

| Issue RDS | Draft | Componente | Status | Como o RDS cobre |
|---|---|---|:---:|---|
| #164 | N7 | `StatsGrid` | ✅ closed | `StatGroup` com `layout="grid"` (`./server`, divisores 1px via `bg-line-default gap-px`) |
| #165 | N1 | `SectionCard` | ✅ closed | Padrão **compound** com `Card + CardHeader + CardTitle + CardSubtitle + CardBody + CardActions` (todos em `./server`) |
| #166 | N4 | `KpiStrip` | ✅ closed | `StatGroup` com `layout="strip"` — **mesmo componente** que cobre N7 |
| #167 | N6 | `SectionNav` | ✅ closed | Hook `useScrollSpy` em `.` (client). Componente visual da nav fica como composição do consumer (`<nav>` + `<NavLink>` + plumbing do hook). |
| #162 | N2 | `FilterChips` | ⚠️ **open** | Stack v3.7 não tem prop `wrap` (confirmado em `dist/ui/.../Stack.d.ts`); FilterChips wrapper segue aberto |
| #163 | N3 | `HeroSection` | ⚠️ **open** | sem componente equivalente exportado |

**Confirmação independente:**

```
$ node -e "import('@fabio.caffarello/react-design-system').then(m => {
    const k = Object.keys(m);
    for (const n of ['StatGroup','Stat','useScrollSpy','HeroSection','FilterChips'])
      console.log((k.includes(n)?'✓':'✗'), n);
})"
✓ StatGroup
✓ Stat
✓ useScrollSpy
✗ HeroSection
✗ FilterChips
```

`./server` agora expõe 32 componentes (era 21 na 3.3.1) incluindo `Stack`,
`PageHeader`, `CardHeader/Title/Subtitle/Body/Actions`, `Stat`, `StatGroup`,
`Label`, `Separator`, `Badge`, `Card`, `Chip` — a expansão de
apresentacionais (anteriormente issue #155) está consolidada.

### Estado da versão no consumidor

`package.json` declara `^3.3.1`; latest publicado é **3.7.0**. **Próxima rota
exige bumpar.** Atualizar para `^3.7.0` (ou `^3.4.0` se quiser mínimo viável)
é pré-requisito operacional, não bloqueador conceitual.

## §3.7 — Prontidão revisada (2026-06-09)

Mantendo a contagem original de componentes catalogados, só atualizando a
coluna "Bloqueadores cat. 3 (abertos)" e o "Score":

| Rota | Total | Bloqueadores cat. 3 (atualizado) | Score (atualizado) |
| --- | ---: | --- | :---: |
| `/feed` | 3 | — | **alta** |
| `/privacidade` | 3 | — | **alta** |
| `/sign-in` | 5 | — | **alta** |
| `/sign-up` | 5 | — | **alta** |
| `/partidos/[sigla]` | 7 | — (piloto migrada) | **alta** |
| `/parlamentares/[id]` | 11 | — (N1, N4, N6 resolvidos) | **alta** ⬆ era baixa |
| `/proposicoes/[tipo]/[numero]/[ano]` | 15 | — (N1, N4, N6 resolvidos) | **alta** ⬆ era baixa |
| `/votacoes/[id]` | 17 | — (N1, N4, N6 resolvidos) | **alta** ⬆ era baixa |
| `/parlamentares/[id]/gastos` | 6 | `FilterChips (#162 N2)` | média |
| `/comparar` | 8 | `HeroSection (#163 N3)` (N1 resolvido) | média |
| `/busca` | 10 | `HeroSection (#163 N3)` (N1 resolvido) | média |
| `/parlamentares` | 10 | `HeroSection (#163 N3)` (N7 resolvido) | média |
| `/proposicoes` | 10 | `HeroSection (#163 N3)` (N7 resolvido) | média |
| `/votacoes` | 10 | `HeroSection (#163 N3)` (N7 resolvido) | média |
| `/` (home) | 12 | `HeroSection (#163 N3)` (N1, N5 — KpiCard ainda draft) | média |
| `/painel` (entry) + 5 slots | 7–11 | `TabBar / SubTabs (N8, sem issue aberta)` | média |

### Movimento principal: os 3 perfis subiram de baixa → alta

Os perfis `/parlamentares/[id]`, `/proposicoes/[tipo]/[numero]/[ano]` e
`/votacoes/[id]` compartilhavam o mesmo trio de bloqueadores
`KpiStrip + SectionCard + SectionNav`. **Os três foram resolvidos no RDS** — N7
(StatGroup), N1 (Card compound), N6 (useScrollSpy). As três rotas continuam
estruturalmente idênticas em prontidão; agora as três são **alta** com
**zero bloqueador aberto**.

### Distribuição atualizada

| Score | Quantidade | Rotas |
|---|---:|---|
| Alta (0 bloqueador aberto) | **8** | `/feed`, `/privacidade`, `/sign-in`, `/sign-up`, `/partidos/[sigla]` (migrada), `/parlamentares/[id]`, `/proposicoes/[…]`, `/votacoes/[id]` |
| Média (1 bloqueador aberto) | 12 | listagens + home + painel |
| Baixa | 0 | — |

### Recomendação da próxima rota

**Migrar um dos 3 perfis de detalhe — preferencialmente `/parlamentares/[id]`.**

Por quê:

- **Zero bloqueador aberto.** As issues #164/#165/#166/#167 que travavam o
  trio fecharam upstream.
- **Alto valor de validação.** Exercita pela primeira vez `StatGroup`
  (`layout="strip"` no `KpiStrip` semântico do perfil), o padrão `Card`
  compound (substituindo o `SectionCard` local), e `useScrollSpy`
  (substituindo o `SectionNav` local). Três componentes novos do RDS
  validados em uso real numa mesma rota.
- **Lote único.** Os 3 perfis compartilham estrutura — migrar
  `/parlamentares/[id]` **ensina os outros dois**. Padrão depois replicado
  para proposições e votações com fricção marginal.
- **Por que `/parlamentares/[id]` e não os outros dois.** É a **menos densa**
  do trio (11 componentes catalogados vs 15 de proposições e 17 de votações;
  votações tem cauda complexa com hemiciclo SVG + charts; proposições tem
  tramitação + autores). Para piloto de "exercitar 3 componentes novos do
  RDS", `/parlamentares/[id]` é o menor playground útil que valida o trio
  sem distração de cauda específica de domínio.

### Bloqueadores abertos para a rota recomendada — nenhum

- N1 (SectionCard) — ✅ closed
- N4 (KpiStrip) — ✅ closed
- N6 (SectionNav) — ✅ closed
- Cat. 2 — `Accordion` (E4) usado no perfil. RDS tem `Accordion` declarativo
  (`items: []`); padrão diverge do shadcn-compound. Pode ser migrado
  ajustando a chamada, sem precisar de issue. Não bloqueia.
- Outras dependências (`Card`, `Text`, `Skeleton`, `Badge`, `Progress`) já
  estavam disponíveis em `./server` desde 3.3.1.

### Pré-requisitos operacionais

- **Bump do RDS para 3.7.0** (consumidor está em 3.3.1; `^3.7.0` ou `^3.4.0`).
- Após o bump, repetir o smoke das rotas `/rds/smoke-*` para confirmar que
  não houve regressão das fundações que validamos na adoção 3.3.1.
- A piloto `/rds/partidos/[sigla]` por construção (não usa nenhum dos
  componentes que mudaram entre 3.3.1 e 3.7.0) deve permanecer idêntica;
  útil como regression check.

### Ordem da segunda onda (após o lote dos 3 perfis)

- `/parlamentares/[id]/gastos` — aguarda **#162 (FilterChips)**.
- Home + 5 listagens — aguardam **#163 (HeroSection)**.
- Painel + 5 slots — aguardam **N8 (TabsAsLinks/SubTabs)**, que não tem
  issue aberta no RDS ainda (ainda é só draft no `migration-matrix.md`).

## §3.8 — Execução da piloto-2 (2026-06-10): `/parlamentares/[id]` migrada

A recomendação da §3.7 foi executada — **`/rds/parlamentares/[id]` no ar**
(PR piloto-2). O que a execução confirmou e o que falsificou:

### Confirmado

- **N1 (Card compound)** adotado integralmente: `asSection` +
  `aria-labelledby` + `Card.Title as="h2"` + `Card.Subtitle`/`Card.Body`
  cobrem o contrato inteiro do `SectionCard` local (cópia fina em
  `_components/section-card.tsx` só preserva a API).
- **N4 (StatGroup+Stat)** adotado direto no `page.tsx` (`layout="grid"`
  `cols={4}`; tone map `default/muted→neutral`, `destructive→error`;
  borda externa via className).
- Bump 3.3.1 → 3.7.0 sem regressão nas rotas `/rds/smoke-*` e na
  piloto-1 (build + 788 testes verdes).

### Falsificado pela execução

- **N6 via `useScrollSpy` é inviável hoje por custo de bundle** — o hook
  só existe no entry raiz, que é barrel client único (488K, banner
  `"use client"`, opaco pra tree-shaking). Medição em build de produção:
  importar só o hook custou **+277.593 bytes** no chunk da rota (JS total
  950.758 → 1.228.157, +29%). Cópia-rds mantém IntersectionObserver
  local até
  [RDS #203](https://github.com/FabioCaffarello/react-design-system/issues/203)
  (entry granular `./hooks`) fechar.
- **"Accordion migra ajustando a chamada, sem issue" (§3.7) estava
  errado** — o Accordion do RDS corta conteúdo aberto acima de 1000px
  (`max-h-[1000px]` + `overflow-hidden`), tem typography fixa no trigger
  e não aceita `className` por item. As seções do perfil (votos
  paginados, gastos com chart) estouram o clamp com folga. Reportado em
  [RDS #202](https://github.com/FabioCaffarello/react-design-system/issues/202);
  a view mobile mantém a primitiva Radix local até fechar.

### Efeito na fila

Os outros 2 perfis (`/proposicoes/[tipo]/[numero]/[ano]`, `/votacoes/[id]`)
seguem **alta prontidão** com o mesmo workaround de Accordion/SectionNav
da piloto-2 — são as próximas rotas naturais, reusando
`section-card`/`section-nav` e o padrão StatGroup. Tokens novos da
execução registrados na extensão piloto-2 do `token-map.md` (status `/N`,
`destructive→error`, resíduo `accent` data-viz).

## §3.9 — Workarounds ativos

Workaround sem trigger de revisão é o folclore de amanhã. Esta tabela é
o relógio: **todo piloto começa com bump de versão do RDS** (3.3.1 →
3.7.0 na piloto-2) — é nesse momento que ela é varrida, linha a linha,
contra o changelog upstream. Issue fechada = executar a "ação quando
fechar" e remover a linha.

**Tabela vazia desde a varredura 3.10.0** — todos os workarounds de
bundle/composição (Accordion, useScrollSpy, FilterChips) foram
resolvidos upstream e adotados. O que resta na fila não são workarounds
(peças faltando para rotas migradas), e sim **bloqueadores de rotas
ainda não migradas**: HeroSection ([RDS #163](https://github.com/FabioCaffarello/react-design-system/issues/163)) para home + listagens,
TabsAsLinks ([RDS #210](https://github.com/FabioCaffarello/react-design-system/issues/210)) para o painel.

Fora da tabela **por decisão, não por gap**: o `FilterChip` **item**
permanece local (server-safe) nas cópias-rds. O `Chip` do RDS existe,
mas é client-only (+5.759 bytes/rota medidos na varredura 3.10.0) e os
chips de filtro são `<Link>` (navegação por URL) — JS que não compra
nada funcional, contra ADR-022. Eliminar a duplicação do item exigiria
um *chip server-safe* upstream (candidato a issue futura); o wrapper
`FilterChips`, esse sim server-safe, já foi adotado.

### Varredura 2026-06-11 (bump 3.7.0 → 3.8.0) — primeira execução do ritual

- **RDS #203 (useScrollSpy) — RESOLVIDA, linha removida.** Entry
  granular `./hooks` (#205, 855 bytes) adotado nas 3 cópias de
  `section-nav`: **+396 bytes** no JS da rota, contra os +277KB que o
  barrel custava na medição original. IntersectionObserver local
  aposentado.
- **RDS #202 (Accordion) — fechada upstream, swap REPROVADO pela
  re-medição.** O componente do #204 é exatamente o pedido, mas
  importar `{ Accordion }` do entry raiz puxa o barrel inteiro:
  951.173 → 1.215.369 bytes (**+264.196, +28%**). Conversão revertida;
  workaround Radix local permanece; o relógio agora aponta para a
  [RDS #208](https://github.com/FabioCaffarello/react-design-system/issues/208).
- A re-medição obrigatória da coluna "ação quando fechar" provou seu
  valor na primeira varredura: sem ela, o +28% teria entrado por fé na
  issue fechada.

### Varredura 2026-06-11 (bump 3.8.0 → 3.9.0) — segunda execução

- **RDS #208 (Accordion via entry granular) — RESOLVIDA, linha
  removida.** A 3.9.0 entregou `./granular` (#209, preserveModules,
  ~200 módulos). A adoção exigiu uma descoberta de consumidor:
  importar o barrel granular **direto de um Server Component** cria
  client reference do entry inteiro — medido **1.245.968 bytes**
  (pior que o barrel raiz reprovado), falsificando a afirmação do
  README upstream ("a Server Component can import any granular module
  and Next places exactly that module graph behind the boundary").
  `experimental.optimizePackageImports` não teve efeito (testado nas
  duas formas). O padrão que funciona: **re-export wrapper `'use
  client'` local** (`_components/rds-accordion.ts`) — o import do
  barrel acontece dentro de módulo client, tree-shaking ESM normal
  poda os re-exports. Resultado nas 3 rotas de perfil:
  **−5.905 bytes cada** (o Accordion RDS sai MENOR que o Radix local
  que substitui). Radix local aposentado nas rotas `/rds/`;
  reportado upstream para caveat no README.
- Restante da tabela: só FilterChips (#162).

### Varredura 2026-06-13 (bump 3.9.0 → 3.10.0) — terceira execução

- **RDS #162 (FilterChips) — RESOLVIDA, linha removida.** A 3.10.0
  entregou o `FilterChips` (wrapper) no `/server` — o componente foi
  implementado por nós upstream ([RDS #211](https://github.com/FabioCaffarello/react-design-system/pull/211)). O swap revelou que a
  "linha" eram na verdade **duas peças**: o wrapper (server-safe) e o
  item `FilterChip` (que a issue #162 nunca cobriu — o `Chip` já existia).
- **Decisão (owner): adotar só o wrapper.** `FilterChips` agora vem do
  `/server` nas 4 cópias (votos-recentes, proposicoes-autor,
  tramitacao-timeline, votacoes-vinculadas); o `FilterChip` item
  permanece local. **Delta de JS: 0 bytes exatos** nas duas rotas
  (server-safe dos dois lados). O swap completo (item via `Chip`
  `/granular`) foi medido em **+5.759 bytes/rota** e rejeitado: os chips
  são `<Link>`, o JS não compra função, e contraria ADR-022 (zero-JS
  anônimo).
- **Mudança de layout aceita:** o `FilterChips` do RDS renderiza o
  label inline à esquerda (`flex items-center`, span `shrink-0`); o
  wrapper local punha o label em bloco acima. Sem prop de orientação
  upstream; o `shrink-0` no label mitiga o wrap em mobile. Visual dos
  chips inalterado (FilterChip item local).
- **Tabela de workarounds esvaziada.** Marco: Accordion, useScrollSpy
  e FilterChips, os três workarounds de bundle das pilotos 2–4, todos
  resolvidos e adotados em três varreduras consecutivas.


Fora da tabela **por não ser workaround**: o resíduo `accent` (roxo
data-viz nas Sparklines e links de drill-down). É token do projeto
(ADR-024) sem razão para o RDS absorver — a não-equivalência registrada
na extensão piloto-2 do `token-map.md` é o destino final, não um estado
transitório. O `text-success-foreground` (extensão piloto-3) tem o
mesmo regime.

## §3.10 — Execução da piloto-3 (2026-06-10) + medição de fricção

**`/rds/proposicoes/[tipo]/[numero]/[ano]` no ar** (PR piloto-3),
repetindo o padrão da piloto-2. O mandato desta fase era duplo: migrar
E medir quanto do trabalho é receita mecânica vs julgamento — o dado
que a decisão B (agent `rds-route-migrator`) esperava.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 7 componentes de domínio duplicados+traduzidos (tabela canônica cobriu
  todas as classes exceto 1; tradução 1:1, zero hesitação).
- `section-card`/`section-nav`: reuso **verbatim** das cópias da
  piloto-2 (zero adaptação — só o header de comentário).
- `page.tsx`: substituições idênticas à piloto-2 (StatGroup+Stat com o
  tone map já estabelecido, Accordion local via §3.9, base href `/rds/`,
  metadata `(rds-pilot)`).
- Client islands (charts recharts, CompartilharButton, TrustBadge,
  PartyBadge, FilterChips): precedente da piloto-2 aplicado sem
  reanálise.
- Validação: mesmo protocolo (build + check + curl lado a lado + delta
  de chunk: **+19 bytes**, idêntico à piloto-2).

**Julgamento** — decisão caso-a-caso:

1. `text-success-foreground` (badge sólido TRANSFORMADA_EM_NORMA):
   token fora do mapa → manter como resíduo (RDS sem par on-color).
   **Mas a decisão é da classe já conhecida** — é a mesma régua do
   `accent` da piloto-2 (token do projeto sem razão de absorção
   upstream), aplicada a um caso novo. Custo: ~minutos.
2. Escolha da rota (proposições vs votações): lógica da §3.7 reaplicada
   (menor playground útil). Trivial.

**Falsificação nova tipo §3.8: NENHUMA.** Os percalços upstream da
piloto-2 (#202 Accordion, #203 hooks) foram contornados pela §3.9 sem
redescoberta. Nenhum gap upstream novo; nenhuma issue nova no RDS.

### Leitura para a decisão B

Pelo critério fixado ("se o piloto-3 sair majoritariamente mecânico e
os percalços forem da classe já conhecida, o gargalo ADR-019 está
documentado e o agent nasce"): **o critério foi satisfeito.** 10
arquivos criados, 1 decisão de token (de classe conhecida), zero
falsificação. O trabalho de julgamento residual é exatamente o que um
agent escala para o humano: token fora do mapa → parar e perguntar.
Contrato do agent deve REFERENCIAR `docs/migration/*` (playbook,
token-map, §3.9), não inliná-los.

### Efeito na fila

Resta **`/votacoes/[id]`** para fechar o trio (17 componentes, cauda
com hemiciclo SVG — o teste de stress natural do padrão, e candidato a
primeira rota do agent se a decisão B confirmar).

## §3.11 — Execução da piloto-4 (2026-06-11) + medição de fricção

**`/rds/votacoes/[id]` no ar** (PR piloto-4) — fecha o trio de perfis.
Primeira rota executada pelo agent `rds-route-migrator` (decisão B), em
duas fases: fase 1 mecânica + 4 checkpoints escalados ao owner; fase 2
aplicando as decisões. O dado central: **onde o agent parou e perguntou
vs. onde seguiu receita.**

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 7 componentes de domínio duplicados+traduzidos (tabela canônica +
  extensões cobriram todas as classes exceto as 2 dos checkpoints
  CP3/CP4; tradução 1:1, zero hesitação).
- `section-card`/`section-nav`: reuso **verbatim** das cópias das
  pilotos 2/3 (só o header de comentário).
- `page.tsx`: substituições idênticas às pilotos 2/3 (StatGroup+Stat
  com tone map estabelecido, Accordion local via §3.9, hrefs de filtro
  contidos em `/rds/`, cross-links de entidade pra produção, metadata
  `(rds-pilot)`).
- Client islands (3 charts recharts, ExportCsvLink, TrustBadge,
  DataBadge, CompartilharVotacaoButton): precedente piloto-2/3 sem
  reanálise.
- Validação: mesmo protocolo (check + build 3.6s + 788 testes + curl
  lado a lado + delta de chunk: **−1.842 bytes**, −0,19% — ~neutro,
  zero chunk RDS no client path).

**Julgamento** — onde o agent PAROU e perguntou (4 checkpoints, todos
previstos no scoping; recomendações do agent aprovadas integralmente):

1. **CP1 — `VotacaoHemicicloChart`** (regra 2, SVG inline com
   `fill: var(--success)`): mantido **import do original**, sem cópia —
   classe conhecida (pendência piloto-3: cor via var em prop). Calibra
   na promoção.
2. **CP2 — `MargemDecisaoBar`** (regra 2, barra CSS-only
   `bg-success`/`bg-destructive`): idem CP1. Argumento decisivo:
   consistência cross-chart na seção Resumo (traduzir só a barra
   criaria dois verdes/vermelhos lado a lado).
3. **CP3 — pill invertido `bg-foreground`/`text-background`** (regra 1,
   token fora do mapa): traduzido via **extensão piloto-4**
   (`bg-fg-primary`/`text-surface-canvas`, prova de valor HEX — mesmos
   deltas já aceitos nos pares diretos da tabela). Classe NOVA de
   decisão: par conhecido em papel invertido.
4. **CP4 — `bg-brand/15`** (regra 1): **generalização** da entrada
   piloto-2 para `bg-brand/N → bg-fg-brand/N` (base byte-idêntica
   pós-#358; opacidade aritmética) — elimina stops futuros por
   opacidade.

**Falsificação nova tipo §3.8: NENHUMA.** Workarounds §3.9 aplicados
sem redescoberta; nenhum gap upstream novo; nenhuma issue nova no RDS.
Ajuste menor ao scoping: 7 cópias em vez de 8 — `margem-decisao` virou
import pendente (regra 2 manda parar ANTES de copiar/traduzir; cópia
verbatim seria só superfície de drift).

### Leitura para a decisão B (primeira rodada com agent)

O contrato funcionou como desenhado: 100% do trabalho de tradução foi
mecânico ou escalado; os 4 stops eram exatamente os previstos pelo
scoping; as 4 recomendações vieram fundamentadas em precedente e foram
aprovadas sem alteração. Custo de coordenação: 1 rodada de perguntas.
Nenhuma tradução ad-hoc escapou (grep de tokens BaV residuais limpo,
fora os imports pendentes registrados).

### Efeito na fila

**Trio de perfis completo** (parlamentar, proposição, votação). Próximas
ondas seguem a §3.7: `/parlamentares/[id]/gastos` aguarda RDS #162
(FilterChips); home + 5 listagens aguardam RDS #163 (HeroSection);
painel aguarda N8 (sem issue upstream ainda). Workarounds §3.9
inalterados (varrer no próximo bump do RDS).

## §3.12 — Execução da piloto-5 (2026-06-11) + medição de fricção

**`/rds/privacidade` e `/rds/feed` no ar** (PR piloto-5, único PR para as
duas) — as duas rotas de alta prontidão sem bloqueador que restavam fora
do trio de perfis. Objetivo declarado: fechar cobertura com custo
mínimo, não aprender (a §3.5 já as classificava como baixo aprendizado).
Executada pelo agent `rds-route-migrator`, empilhada na varredura 3.9.0.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 2 páginas duplicadas+traduzidas. ZERO componentes em `_components/`:
  os helpers locais (`Section`, `ContactLink`, `FeedGroup`) foram
  reconstruídos inline no `page.tsx` (precedente piloto-1). Tabela
  canônica + extensões cobriram todas as classes exceto as 2 do
  checkpoint único (abaixo).
- `<Text>` aplicado pela regra dura ≤1 override (body/bodySmall/
  bodyLarge/caption/label); h1/h2 com 3–4 props de typography ficaram
  HTML cru — mesmos casos da piloto-1.
- `dynamic = 'force-dynamic'`, metadata `(rds-pilot)`, chrome do root
  layout herdado, hrefs: feeds RSS e cross-link `/painel` → produção
  (classe conhecida: cross-link de entidade, pilotos 2–4).
- Validação: protocolo integral (check limpo + build 3.7s + 788 testes
  + curl lado a lado nas 4 URLs com dados reais + `X-Robots-Tag:
  noindex` + zero chunk RDS no client path). **Delta de JS: 0 bytes
  exatos nas duas rotas** (892.857 bytes / 17 chunks dos dois lados —
  rotas server-only, nenhum JS novo).

**Julgamento** — onde o agent PAROU e perguntou (1 checkpoint):

1. **CP1 — brand com opacidade em papéis text/border**
   (`hover:text-brand/80` em /privacidade, `hover:border-brand/60` em
   /feed; regra 1, sem linha literal no mapa): aprovada a **extensão
   piloto-5** generalizando `text-brand/N` e `border-brand/N` →
   `*-fg-brand/N` — base byte-idêntica `#7390ad` dos dois lados
   (prova no token-map), prefixo utility só escolhe a propriedade CSS,
   opacidade aritmética (princípio CP4 da piloto-4). Classe de decisão:
   conhecida-adjacente (composição de duas regras já aprovadas).

Micro-decisões de classe conhecida sem stop: link "texto-fonte" da
política aponta pro arquivo da rota ORIGINAL (fonte canônica do texto
enquanto /rds/ é staging); pares de consolidação registrados **em nível
de página** (primeira rota sem `_components/` — sem isso o guard não
vigiaria drift do texto legal versionado).

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, workaround §3.9 (FilterChips #162) não tocado.

### O dado de custo — a §3.5 estava certa?

**Confirmada, com nuance.** Aprendizado ≈ zero (1 checkpoint, e ainda
assim de classe adjacente a decisões já tomadas; zero componente novo;
zero medição surpreendente). MAS o custo real também foi mínimo: sessão
única, 2 arquivos de rota + 3 docs, 100% do trabalho de tradução
mecânico. Com o playbook maduro, rotas textuais custam quase nada — o
veredito da §3.5 ("pouco aprendizado para o esforço") era correto
QUANDO esforço era caro (pilotos 1–2); pós-agent, o denominador caiu e
fechar cobertura barata passou a valer a pena. Não generalizar para
rotas com client islands.

### Efeito na fila

Cobertura: **7 de 21 rotas** sob `/rds/` (partidos, 3 perfis,
privacidade, feed). Restam: `/sign-in`/`/sign-up` (chrome puro, custo
~zero, sem data); `/parlamentares/[id]/gastos` aguarda RDS #162;
home + 5 listagens aguardam RDS #163; painel aguarda N8 (sem issue
upstream). Workarounds §3.9 inalterados.

## §3.13 — Execução da piloto-6 (2026-06-13) + medição de fricção

**`/rds/parlamentares/[id]/gastos` no ar** (PR piloto-6, empilhado na
varredura 3.10.0). Era **a próxima rota da fila desde a §3.7** — o
bloqueador único `FilterChips` (#162) só fechou upstream na varredura
3.10.0 (§3.9), destravando-a. Executada pelo agent
`rds-route-migrator`. Padrão exercitado: "filtros + lista paginada por
cursor server-rendered" — o que a §3 prometia desde a primeira onda.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- Página AUTOCONTIDA reconstruída inline (271 linhas; ZERO componentes
  em `_components/` — lógica de filtros/cursor vive no `page.tsx`,
  precedente piloto-1/piloto-5). Tabela canônica cobriu **todas** as
  classes (8 pares distintos: `border-border-strong→line-emphasis`,
  `bg-background→surface-canvas`, `ring-ring→line-focus`,
  `bg-surface→surface-base`, `hover:bg-surface-elevated→surface-raised`,
  `border-border→line-default`, `text-foreground→fg-primary`,
  `text-foreground-muted→fg-tertiary`). Tradução 1:1, zero hesitação.
- `FilterChips` (wrapper) do RDS `/server` + `FilterChip` (item) local —
  padrão estabelecido na varredura 3.10.0 (§3.9), aplicado verbatim
  (mesmos imports das 4 cópias já convertidas).
- Queries/cursors/`generateMetadata`/params preservados; base href,
  back-link (`/rds/parlamentares/[id]`) e form `action` reescritos pra
  `/rds/`; metadata `(rds-pilot)` — substituições idênticas às pilotos
  2–5.
- Validação: protocolo integral (check limpo + build **3.6s** + 788
  testes + curl lado a lado com entidade real "Acácio Favacho"
  populada: 21 `<tr>` idênticos dos dois lados, SELECT/Label/"Mostrar
  mais"/FilterChip `data-selected` presentes, `X-Robots-Tag: noindex,
  nofollow`, hrefs de filtro/cursor contidos em `/rds/`). **Delta de
  JS: −1.060 bytes** (893.917 → 892.857; 17 → 16 chunks) — ~neutro,
  **zero chunk RDS no client path** dos dois lados (FilterChips, Label
  e FilterChip todos server-rendered; ADR-022 preservado).

**Julgamento** — onde o agent decidiu (1 decisão, **classe conhecida**,
sem stop):

1. **`Label` — adotar do RDS `/server`** (vs manter local). O `Label`
   está no `/server` (server-safe; renderiza `<label>` nativo, sem
   hooks client — confirmado no `Label.d.ts`/`Label.js`). Adoção mantém
   zero-JS (delta 0, confirmado). Tokens via className traduzido
   (`text-foreground-muted text-xs → text-fg-tertiary text-xs`); a base
   do RDS (`block font-medium text-sm`) é sobrescrita por tailwind-merge
   (className vence: rendered `block font-medium text-fg-tertiary
   text-xs`). Diferença vs tradução local: ganha `block`, perde os
   `peer-disabled:*` do Radix (inertes — o SELECT nunca fica disabled
   nesta rota). Sub-perceptual numa label de 1 linha em `flex
   flex-col`. **Nenhum token fora do mapa** → não é stop de regra 1;
   é a mesma régua já aplicada à adoção de apresentacionais `/server`
   (FilterChips wrapper, `<Text>`): server-safe, delta 0, delta visual
   sub-perceptual aceito. Custo: ~minutos (uma medição de export +
   leitura da classe renderizada).

Decisão paralela **sem stop** (já fechada na §3.9, não reaberta): o
`FilterChip` item permanece local — o `Chip` do RDS é client
(+5.759 bytes/rota), os chips são `<Link>`, ADR-022.

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, nenhuma data-viz (regra 2 não disparada — confirmado
no scoping: só tabela + filtros). Tabela de workarounds §3.9 não tocada.

### Leitura para o contrato do agent

A rota mais "domain-light" do plano (página inline, sem `_components/`,
sem charts) saiu **100% mecânica + 1 decisão de classe conhecida** —
exatamente o perfil que a §3.10 (decisão B) previu como ideal pro agent.
O único julgamento (adotar `Label` do `/server`) é a aplicação da
mesma régua de adoção de apresentacional server-safe já consolidada;
não exigiu escalar ao owner porque não houve token fora do mapa nem
data-viz. Grep de tokens BaV residuais limpo.

### Efeito na fila

Cobertura: **8 de 21 rotas** sob `/rds/` (partidos, 3 perfis,
privacidade, feed, gastos). Restam: `/sign-in`/`/sign-up` (chrome puro,
custo ~zero, sem data); home + 5 listagens aguardam RDS #163
(HeroSection); painel + 5 slots aguardam N8/RDS #210 (TabsAsLinks).
Workarounds §3.9 inalterados (varrer no próximo bump do RDS).

## §3.14 — Execução da onda HeroSection #1 (2026-06-13): listagem `/parlamentares`

**`/rds/parlamentares` no ar** (PR onda HeroSection, empilhado no bump
3.10.0 → 3.12.0). É a **primeira listagem** do plano — o bloqueador
único `HeroSection` (#163) fechou upstream e foi entregue no `/server`
da RDS 3.12.0, destravando-a junto com `/proposicoes` e `/votacoes`. O
padrão estabelecido aqui (HeroSection + StatGroup + filtros + grid de
cards) **replica nas outras duas listagens com fricção marginal** —
mesma estrutura, mesmos componentes do `/server`, mesmos imports de
client islands. Executada pelo agent `rds-route-migrator`.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 5 cópias em `_components/` (button, empty-state, filter-chip, filtros,
  parlamentar-card) duplicadas+traduzidas. Tabela canônica + extensões
  cobriram **todas** as classes; tradução 1:1, zero hesitação. Pares
  novos distintos: `bg-surface→surface-base`, `bg-surface-elevated→
  surface-raised`, `bg-background→surface-canvas`, `border-border→
  line-default`, `border-border-strong→line-emphasis`, `ring-ring→
  line-focus`, `ring-offset-{surface,background}→offset-{surface-base,
  surface-canvas}`, `text-foreground{,-muted,-subtle}→fg-{primary,
  tertiary,quaternary}`, `bg-brand/N`/`text-brand`/`border-brand→
  *-fg-brand` (byte-idêntico pós-#358, generalização pilotos 2/4/5).
- `FilterChips` (wrapper) do RDS `/server` + `FilterChip` (item) local +
  `Label` do RDS `/server` + `Combobox`/`FollowButton` client islands
  importados dos originais — **padrão piloto-6 aplicado verbatim** (zero
  reanálise; mesma decisão §3.9 e §3.13).
- `StatsGrid` (composição local) → `StatGroup layout="grid" cols={3}` +
  `Stat` do `/server` — **precedente §3.6 (KpiStrip→StatGroup)** aplicado
  sem parar. Borda/dividers vêm do próprio StatGroup (sem className extra,
  diferente dos perfis grid que pediam borda externa — o StatGroup já a
  traz por default).
- `dynamic` preservado por `auth()` (sem export explícito, idêntico ao
  original); hrefs de filtro/cursor/card e form `action` reescritos pra
  `/rds/`; export href → `/api/export` produção; metadata `(rds-pilot)`.
- Validação: protocolo integral (check limpo + build **3.6s** + 788
  testes + curl lado a lado com dados reais — 722 `<article>` idênticos
  dos dois lados, StatGroup 722/23/27, filtro `casa=SENADO` 81 cards +
  1 chip `data-selected`, empty state, `X-Robots-Tag: noindex, nofollow`,
  hrefs de navegação CONTIDOS em `/rds/` — só o nav-link do chrome
  aponta pra produção, como em toda piloto). **Delta de JS: −946 bytes**
  (981.344 → 980.398; 19 chunks dos dois lados) — ~neutro, **zero chunk
  RDS no client path** (HeroSection/StatGroup/Stat todos server-rendered
  pelo `/server`; o chunk que difere é o bundle de client islands da
  própria página, e sai MENOR que o original). ADR-022 preservado.

**Julgamento** — decisões caso-a-caso (todas de **classe conhecida**,
nenhum stop ao owner):

1. **Adoção do `HeroSection` do RDS `/server`.** A API local→RDS mapeia
   **1:1** (`kicker`/`title`/`description`/`variant`/`align` — todos
   presentes, nenhum slot/prop faltando), então não disparou o stop de
   adoção previsto no contrato. Server-safe confirmado: o build do
   `/server` não tem banner `"use client"` (só o entry raiz tem) e o
   delta de JS provou zero client chunk. Diferença visual aceita: o h1
   do RDS renderiza `text-3xl sm:text-4xl` (vs `text-4xl..6xl` local) e
   o kicker vira eyebrow uppercase brand — é a typography do componente
   adotado, não token fora do mapa. Mesma régua de adoção de
   apresentacional `/server` já consolidada (StatGroup, FilterChips,
   Label, `<Text>`).
2. **`EmptyState` e `Button` mantidos LOCAIS (cópias traduzidas).** Os
   dois existem no RDS mas só no entry raiz (**client** — confirmado:
   ausentes em `/server`, presentes no root). Adotá-los puxaria JS
   contra ADR-022 numa rota cujo CTA é navegação (`<a>`/submit). Cópia
   local traduzida mantém zero-JS + token-clean. Mesma régua das pilotos
   1–6 (apresentacional client → manter local e medir). Custo: minutos.
3. **`bg-accent/15`/`bg-accent/60` (barra CSS-only do AlinhamentoStrip
   no card) MANTIDOS** sem tradução — resíduo data-viz `accent`
   (ADR-024), destino final registrado, **mesma régua do `accent` da
   piloto-2** (alinhamento.tsx). Regra 2 (data-viz custom) avaliada e
   **não disparada**: a barra é CSS-only trivial (width %), não SVG/
   chart/`hsl(var())`/`color-mix` — e a cor é o resíduo já governado,
   não pendência do agent. Confirmado no scoping: a listagem não tem
   nenhum chart/sparkline/hemiciclo.

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, workaround §3.9 (tabela vazia) não tocado. Grep de
tokens BaV residuais limpo (só os resíduos documentados: `accent` no
card, `brand-foreground`/`destructive` no button preservados por
paridade de API).

### Leitura para o contrato do agent

A primeira listagem saiu **100% mecânica + 3 decisões de classe
conhecida, zero stop ao owner**. As três decisões são aplicações de
réguas já consolidadas (adoção `/server` server-safe; client→manter
local; resíduo `accent`). O stop de adoção que o contrato previa
("se a API do RDS divergir materialmente da local, PARE") **não
disparou porque a API mapeou 1:1** — o contrato calibrou certo: a
divergência relevante é de slots/props, não de typography do componente.

### Efeito na fila

Cobertura: **9 de 21 rotas** sob `/rds/`. A onda HeroSection abriu:
**`/proposicoes` e `/votacoes`** são as próximas naturais — mesmo trio
HeroSection + StatGroup + filtros + grid, reusando este padrão verbatim;
`/comparar`, `/busca` e a home também dependiam só do #163 (agora
fechado). Restam fora da onda: `/sign-in`/`/sign-up` (chrome puro);
painel + 5 slots aguardam N8/RDS #210 (TabsAsLinks). Workarounds §3.9
inalterados (varrer no próximo bump do RDS).

## §3.15 — Execução da onda HeroSection #2 (2026-06-13): listagem `/proposicoes`

**`/rds/proposicoes` no ar** (PR onda HeroSection #2, no bump 3.12.0). É
a **segunda das 3 listagens** — o padrão estabelecido em
`/rds/parlamentares` (§3.14) foi a previsão explícita ("replica nas
outras duas listagens com fricção marginal"); este PR é o teste dessa
previsão. Executada pelo agent `rds-route-migrator`.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 6 arquivos sob `_components/`. **3 reuso VERBATIM da listagem #1**
  (`button`, `empty-state`, `filter-chip` — apresentacionais puros sem
  href/rota embutida; só o header de comentário muda) + **1 reuso
  verbatim da piloto-3** (`barra-progresso-tramitacao` — mesmo original,
  já traduzido lá). Só `filtros` e `proposicao-card` são cópias de
  domínio novas, traduzidas 1:1 pela tabela canônica + extensões; zero
  hesitação. Pares de token: os mesmos da #1 + `text-warning→fg-warning`,
  `bg-success/N` homônimo (ext. piloto-2), `bg-destructive/N→bg-error/N`,
  `bg-brand/20→bg-fg-brand/20` (generalização).
- `FilterChips` (wrapper) + `Label` do RDS `/server` + `FilterChip`
  (item) local + `Combobox` client island do original — **padrão
  piloto-6/§3.14 aplicado verbatim** (zero reanálise; mesma decisão §3.9
  e §3.13). Busca `q` via `<input>` cru traduzido (precedente filtros #1,
  evita importar o `Input` do original com tokens BaV não traduzidos).
- `StatsGrid` (composição local) → `StatGroup layout="grid" cols={4}` +
  `Stat` do `/server` **com prop `hint`** — a API do `Stat` cobre
  value/label/hint 1:1 (a #1 não exercitou `hint`; a confirmação foi
  uma leitura do `Stat.d.ts`, server-safe, hint na API). Precedente
  §3.6/§3.14 aplicado sem parar.
- **Cursor pagination (ADR-026) preservada** — `decodeCursor` +
  `permanentRedirect` 308 em token inválido + "Mostrar mais (N
  restantes)" + `buildPageHref` reescrito pra `/rds/`. Não existia na
  listagem #1 (parlamentares não pagina), mas é o mesmo padrão de
  cursor já migrado nas pilotos 2/3/4/6 — classe conhecida, lógica
  server-only, nenhum componente RDS envolvido.
- `dynamic` preservado por `canExport()`/cursor (sem export explícito,
  idêntico ao original); hrefs de filtro/cursor/card e form `action`
  reescritos pra `/rds/`; export href → `/api/export` produção;
  metadata `(rds-pilot)`.
- Validação: protocolo integral (check limpo + build **4.0s** + 788
  testes + curl lado a lado com dados reais — 20 cards `/rds/proposicoes/
  TIPO/...` idênticos dos dois lados, StatGroup Total/Tramitando/
  Aprovadas/Encerradas, "Mostrar mais (9,3 mil restantes)" idêntico,
  filtro `?situacao=TRANSFORMADA_EM_NORMA` → 4 resultados + 14 badges
  "Virou norma" dos dois lados + badge sólido `bg-success
  text-success-foreground` + "Filtros ativos" + 2 chips `data-selected`,
  `X-Robots-Tag: noindex, nofollow`, 12 hrefs de filtro CONTIDOS em
  `/rds/proposicoes` + 0 leaks pra produção — só o nav-link do chrome
  aponta pra produção, como em toda piloto). **Delta de JS: −946 bytes**
  (979.500 → 978.554; 19 chunks dos dois lados) — ~neutro, **zero chunk
  RDS no client path** (HeroSection/StatGroup/Stat/FilterChips/Label
  todos server-rendered pelo `/server`). Delta byte-idêntico ao da #1
  (§3.14) — mesmo conjunto de client islands. ADR-022 preservado.

**Julgamento** — decisões caso-a-caso (todas de **classe conhecida**,
nenhum stop ao owner):

1. **`Stat` com `hint` adotado do `/server`.** A #1 só usou value/label;
   a #2 precisava de hint (4 stats narrativos). A API do `Stat` traz
   `hint` (server-safe, confirmado no `Stat.d.ts`) — mapeou 1:1 com o
   contrato do `StatItem` local (value/label/hint). Mesma régua de
   adoção `/server` da #1; não disparou stop (API não divergiu).
2. **`BarraProgressoTramitacao` mantida como cópia local traduzida.**
   Regra 2 (data-viz custom) avaliada e **não disparada**: é barra
   CSS-only (width/flex-1 %), não SVG/chart/`hsl(var())`/`color-mix` —
   exatamente a mesma classe do AlinhamentoStrip CSS-only aceito na #1
   (§3.14, decisão 3). Cores são `bg-fg-brand/60`/`bg-error/60`/
   `bg-surface-raised`, todas no mapa/extensões; nenhum resíduo
   data-viz `accent` aqui. Reuso verbatim da tradução piloto-3.
3. **`bg-success text-success-foreground` (badge sólido
   TRANSFORMADA_EM_NORMA) MANTIDO** sem tradução — resíduo on-color
   (ext. piloto-3), destino final registrado, **mesma régua já aplicada
   no perfil de proposição (piloto-3)**. Token `text-success-foreground`
   sem par RDS; `bg-success` é o utility homônimo (ext. piloto-2).

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, workaround §3.9 (tabela vazia) não tocado. Grep de
tokens BaV residuais limpo (só os resíduos documentados: `bg-success`/
`text-success-foreground` no card, `brand-foreground`/`destructive` no
button e `shadow-glow` no chip preservados por paridade de API).

### Leitura para o contrato do agent

A previsão da §3.14 ("replica nas outras duas com fricção marginal")
**confirmou-se literalmente**: 100% mecânico + 3 decisões de classe
conhecida, **zero stop ao owner**, e o delta de JS saiu byte-idêntico
ao da #1 (−946 bytes). 4 dos 6 arquivos de `_components/` foram reuso
verbatim (3 da #1, 1 da piloto-3) — só `filtros` e `proposicao-card`
exigiram tradução nova. As duas diferenças estruturais vs a #1 (`Stat`
com `hint`; cursor pagination) eram classes conhecidas — a `hint` é a
API 1:1 do `Stat` (mesma régua de adoção `/server`); o cursor é o
padrão ADR-026 já migrado em 4 pilotos. Nenhuma delas exigiu escalar.

### Efeito na fila

Cobertura: **10 de 21 rotas** sob `/rds/`. Resta **`/votacoes`** para
fechar o trio de listagens (mesmo padrão HeroSection + StatGroup +
filtros + grid, reusando este verbatim). `/comparar`, `/busca` e a home
também dependiam só do #163 (fechado). Restam fora da onda:
`/sign-in`/`/sign-up` (chrome puro); painel + 5 slots aguardam N8/RDS
#210 (TabsAsLinks). Workarounds §3.9 inalterados (varrer no próximo
bump do RDS).

## §3.16 — Execução da onda HeroSection #3 (2026-06-13): listagem `/votacoes`

**`/rds/votacoes` no ar** (PR onda HeroSection #3, no bump 3.12.0). É a
**terceira e ÚLTIMA das 3 listagens** — **fecha o trio**. O padrão
estabelecido em `/rds/parlamentares` (§3.14) e confirmado em
`/rds/proposicoes` (§3.15) era a previsão explícita ("replica nas outras
duas listagens com fricção marginal"); este PR é o fechamento dessa
previsão. Executada pelo agent `rds-route-migrator`.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 5 arquivos sob `_components/`. **3 reuso VERBATIM das listagens #1/#2**
  (`button`, `empty-state`, `filter-chip` — apresentacionais puros sem
  href/rota embutida; só o header de comentário muda). Só `filtros` e
  `votacao-card` são cópias de domínio novas, traduzidas 1:1 pela tabela
  canônica + extensões; zero hesitação. Pares de token: os mesmos das
  #1/#2 + `bg-success/N` homônimo (ext. piloto-2, badge aprovada) +
  `bg-destructive/20 text-destructive→bg-error/20 text-fg-error`
  (ext. piloto-2/3, badge rejeitada — `destructive→error`, primeiro uso
  do par em card de listagem).
- `FilterChips` (wrapper) + `Label` do RDS `/server` + `FilterChip`
  (item) local — **padrão piloto-6/§3.14/§3.15 aplicado verbatim** (zero
  reanálise; mesma decisão §3.9 e §3.13). Sem Combobox (Ano é `<select>`,
  cardinalidade média — não há filtro de alta cardinalidade como o Tema
  das proposições) e sem busca livre `q` (a listagem de votações não
  indexa texto): a `FiltrosVotacao` é estruturalmente MENOR que a
  `FiltrosProposicao`, não maior.
- `StatsGrid` (composição local) → `StatGroup layout="grid" cols={4}` +
  `Stat` do `/server` **com prop `hint`** — API 1:1 (value/label/hint),
  precedente §3.6/§3.14/§3.15 aplicado sem parar. O 4º stat ("Última
  votação") é computado por `formatUltimaVotacaoStat` (helper puro
  preservado do original; value/hint invertem quando > 30 dias).
- **Cursor pagination (ADR-026) + compat `?offset=` (ADR-028 §4)
  preservadas** — `decodeCursor` + `permanentRedirect` 308 em token
  inválido + strip do `offset` via 308 + "Mostrar mais (N restantes)" +
  `buildPageHref` reescrito pra `/rds/`. Mesmo padrão já migrado nas
  pilotos 2/3/4/6 e na listagem #2 — classe conhecida, lógica
  server-only, nenhum componente RDS envolvido.
- `dynamic` preservado por `canExport()`/`auth()` (sem export explícito,
  idêntico ao original); hrefs de filtro/cursor/card e form `action`
  reescritos pra `/rds/votacoes`; export href → `/api/export` produção;
  `alternates` RSS → `/feed/votacoes` produção (é o produto, não
  navegação com contraparte `/rds/`); metadata `(rds-pilot)`.
- Validação: protocolo integral (check limpo + build **3.8s** + 788
  testes + curl lado a lado com dados reais — 24 cards `/rds/votacoes/
  ID` idênticos dos dois lados, StatGroup Total/Aprovadas/Rejeitadas/
  Última votação, filtro `?casa=SENADO` → 24 cards + 2 chips
  `data-selected` + "Filtros ativos", empty state com `?ano=1901` →
  "Nenhuma votação corresponde aos filtros" + "Limpar filtros",
  `X-Robots-Tag: noindex, nofollow`, hrefs de filtro/cursor/card e form
  `action` CONTIDOS em `/rds/votacoes` + 0 leaks pra produção — só o
  nav-link do chrome (Navbar "Votações") aponta pra produção, como em
  toda piloto; o `alternates` RSS no `<head>` aponta pro feed de produção
  por design). **Delta de JS: −1.060 bytes** (893.917 → 892.857; 17 → 16
  chunks) — ~neutro, **zero chunk RDS no client path** (HeroSection/
  StatGroup/Stat/FilterChips/Label todos server-rendered pelo `/server`).
  ADR-022 preservado.

**Julgamento** — decisões caso-a-caso (todas de **classe conhecida**,
nenhum stop ao owner):

1. **Adoção de `HeroSection`/`StatGroup`/`Stat`/`FilterChips`/`Label` do
   RDS `/server`.** Todas mapearam **1:1** com as composições locais
   (mesma régua de adoção `/server` server-safe já consolidada nas
   #1/#2/piloto-6) — nenhum slot/prop faltando, não disparou o stop de
   adoção previsto no contrato. Diferença visual do h1 (RDS
   `text-3xl sm:text-4xl font-bold` vs local `text-4xl..6xl`): é a
   typography do componente adotado, não token fora do mapa (idêntico à
   decisão 1 da §3.14).
2. **`EmptyState` e `Button` mantidos LOCAIS (cópias traduzidas).** Os
   dois existem no RDS mas só no entry raiz (**client**, +JS contra
   ADR-022). Cópia local traduzida mantém zero-JS + token-clean. Reuso
   verbatim das cópias #1/#2 — mesma régua das pilotos 1–6 e listagens
   #1/#2. Custo: minutos.
3. **`bg-success`/`bg-error` nos badges do card MANTIDOS/traduzidos sem
   stop.** `text-success→text-fg-success`, `text-destructive→text-fg-error`
   (ext. piloto-2/3) e `bg-success/20`/`bg-error/20` (utilities homônimos,
   ext. piloto-2). Regra 2 (data-viz custom) avaliada e **NÃO disparada**:
   o card não tem barra/SVG/chart/`hsl(var())`/`color-mix` — são badges
   CSS retangulares com tons de status, tokens todos no mapa/extensões.
   Confirmado no scoping: a listagem não tem nenhum chart/sparkline/
   hemiciclo (diferente do perfil `/votacoes/[id]`, piloto-4, que tinha
   hemiciclo SVG + barra de margem — aqueles ficaram como import do
   original; aqui não há equivalente). **Nenhum resíduo `accent`** neste
   card (diferente do `parlamentar-card` da #1, que tinha AlinhamentoStrip).

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, workaround §3.9 (tabela vazia) não tocado. Grep de
tokens BaV residuais em código limpo (só os resíduos documentados:
`bg-success`/`bg-error` no card, `brand-foreground`/`destructive` no
button e `shadow-glow` no chip, todos por paridade de API/utility
homônimo).

### Leitura para o contrato do agent

O trio de listagens fechou **exatamente como a §3.14 previu**: 100%
mecânico + decisões de classe conhecida, **zero stop ao owner** nas três.
A #3 foi a mais barata das três — 3 dos 5 arquivos de `_components/`
reuso verbatim (vs 4 de 6 na #2), e a `FiltrosVotacao` é MENOR que as
duas anteriores (sem Combobox, sem busca `q`). As diferenças vs #1/#2
(stat "Última votação" computado por helper; compat `?offset=` além do
cursor) eram todas classes conhecidas — helper puro preservado e o
mesmo `permanentRedirect` 308 do padrão ADR-026/ADR-028 já migrado.
Nenhuma exigiu escalar. O delta de JS (−1.060 bytes) é da mesma ordem
das #1/#2 (−946 bytes) e da piloto-6 (−1.060 bytes idêntico).

### Cobertura

**Trio de listagens completo** (`/parlamentares`, `/proposicoes`,
`/votacoes`). Cobertura: **11 de 21 rotas** sob `/rds/` (partidos, 3
perfis, privacidade, feed, gastos, 3 listagens). Restam fora da onda:
`/sign-in`/`/sign-up` (chrome puro, custo ~zero, sem data); `/comparar`,
`/busca` e a home dependiam só do #163 (fechado na 3.12.0 — agora
migráveis); painel + 5 slots aguardam N8/RDS #210 (TabsAsLinks).
Workarounds §3.9 inalterados (tabela vazia; varrer no próximo bump do
RDS).

## §3.17 — Execução da onda HeroSection #4 (2026-06-13): rota `/busca`

**`/rds/busca` no ar** (PR onda HeroSection #4, no bump 3.12.0). Primeira
das 3 rotas que dependiam SÓ do #163 (HeroSection) fora do trio de
listagens — `/busca`, `/comparar` e a home (§3.16). A `/busca` é uma rota
de **busca cruzada server-rendered**: `<form>` GET (zero-JS) + 3 estados
de hero (entry / <2 chars / resultados) + 3 seções de resultado que
consomem os MESMOS 3 cards de listagem já migrados nas ondas #1/#2/#3.
Executada pelo agent `rds-route-migrator`.

### Medição de fricção (por unidade de trabalho)

**Mecânico** — receita do playbook/token-map aplicada sem decisão:

- 9 arquivos sob `_components/`. **4 reuso das traduções das listagens**
  (`parlamentar-card` da #1, `proposicao-card` + `barra-progresso-tramitacao`
  da #2, `votacao-card` da #3 — espelho verbatim, só o header de
  comentário muda; os 3 cards já apontavam para `/rds/`, exatamente a
  navegação contida que `/busca` precisa) + **2 reuso verbatim das
  listagens** (`button`, `section-card` — apresentacionais puros). Só
  `search-form` e `input` foram traduções novas, 1:1 pela tabela
  canônica; zero hesitação.
- `HeroSection` (composição local) → `HeroSection` do `/server` — API
  1:1 (kicker/title/description/variant/align; precedente §3.14), os 3
  estados de hero preservados. Adoção `/server` server-safe, mesma régua
  já consolidada nas listagens — não disparou stop.
- `SectionCard` (composição local) → cópia local sobre Card compound
  (reuso piloto-2); `/busca` usa sem `id` → sem `aria-labelledby` (mesmo
  contrato do original sem id — confirmado no curl: 0 `aria-labelledby`
  dos dois lados).
- `DataBadge` (kicker do hero, `tone="accent"`) → import do ORIGINAL
  (sem par RDS, precedente listagens/perfis); server-rendered, sem JS.
- `search-form` é SERVER COMPONENT (apesar do nome): `<form>` GET nativo,
  sem `'use client'` — duplicado como server-safe (melhor que o "client
  island" previsto no scoping; mantém zero-JS). Button/Input das cópias
  locais traduzidas. form `action` → `/rds/busca`.
- Lógica de query (`busca`) e contrato dos 3 estados preservados; metadata
  `(rds-pilot)`; cross-link do match exato de proposição → `/rds/proposicoes/...`.
- Validação: protocolo integral (check limpo + build **3.6s** + 788
  testes + curl lado a lado com query real `q=silva` — h1 idêntico
  ["Resultados para silva"], 3 seções Parlamentares(10)/Proposições(6)/
  Votações(10) idênticas dos dois lados, 5 `<section>` cada / 0
  `aria-labelledby` cada, 26 hrefs de card CONTIDOS em `/rds/`
  [10 parl + 6 prop + 10 vot, = contagem do original] + 0 leaks pra
  rotas de card de produção, 3 estados de hero verificados [entry/<2/
  empty], `X-Robots-Tag: noindex, nofollow`, form `action="/rds/busca"`
  — só o nav-link e o search do chrome [navbar] apontam pra produção,
  como em toda piloto). **Token BaV no `<main>` da rota = 0** (30
  `text-foreground`, 29 `border-border`, 28 `ring-ring` etc. no original;
  ZERO no RDS — só o chrome fora do `<main>` carrega tokens BaV, por
  design). **Delta de JS: 0 bytes exatos** (894.815 bytes / 17 chunks
  dos dois lados) — rota server-only, **zero chunk RDS no client path**
  (HeroSection/SectionCard/SearchForm/Input/Button/DataBadge todos
  server-rendered). ADR-022 preservado.

**Julgamento** — decisões caso-a-caso (todas de **classe conhecida**,
nenhum stop ao owner):

1. **`search-form` duplicado como SERVER-safe, não client island.** O
   scoping previa "se for client, duplicar como client island"; a
   leitura do original falsificou a premissa — é Server Component puro
   (`<form method="get">`, sem `'use client'`). Duplicado server-safe
   (Button/Input locais), preservando zero-JS — melhor que o caminho
   previsto, mesma régua de manter apresentacional client→local mas
   aqui nem é client. Não exigiu escalar (sem token fora do mapa).
2. **`border-success/40 bg-success/10` (callout do match exato) sem
   tradução.** Base `--success`/`--color-success` é homônima dos dois
   lados (ext. piloto-2 fixou `bg-success/N`; piloto-5 generalizou que o
   prefixo utility só escolhe a propriedade CSS sobre a MESMA base). O
   par `border-success/N` é a mesma base em papel border — homônimo,
   stays. Regra 1 (token fora do mapa) avaliada e **NÃO disparada**: é
   utility idêntico nos dois lados, não tradução ad-hoc. Mesma régua já
   aplicada ao `bg-success/N` dos cards. Classe conhecida.
3. **Cards reusados das listagens com hrefs já em `/rds/`.** Os 3 cards
   migrados nas ondas #1/#2/#3 já apontavam pra `/rds/` — copiá-los pra
   `/busca` deu navegação contida de graça (self-contained com cópias
   próprias, precedente do contrato). `AlinhamentoStrip`/`BarraProgresso`
   (barras CSS-only, resíduo `accent`/tokens no mapa) vêm junto mas não
   renderizam em `/busca` (a query de busca não traz os agregados de
   alinhamento/tramitação) — regra 2 avaliada e não disparada (CSS-only,
   precedente §3.14/§3.15).

**Falsificação nova tipo §3.8: NENHUMA.** Nenhum gap upstream, nenhuma
issue nova no RDS, workaround §3.9 (tabela vazia) não tocado. Grep de
tokens BaV residuais no `<main>` da rota limpo (0); resíduos documentados
preservados (`accent` inalcançável no parlamentar-card, `bg-success`/
`text-success-foreground` no proposicao-card, `brand-foreground`/
`destructive` no button — paridade de API/homônimo).

### Leitura para o contrato do agent

A rota mais "composta de partes já migradas" do plano saiu **100%
mecânica + 3 decisões de classe conhecida, zero stop ao owner**. 6 dos 9
arquivos de `_components/` foram reuso (4 traduções de cards das
listagens + 2 verbatim); só `search-form` e `input` exigiram tradução
nova, ambas triviais (1 token semântico no search-form, 6 no input,
todos canônicos). A única surpresa (search-form ser server, não client)
foi a favor do agent — caiu em zero-JS sem precisar de client boundary.
O delta de JS (0 bytes exatos) é o melhor da onda: a `/busca` não tem
client islands próprios (a #1 tinha FollowButton/Combobox; a #2/#3
Combobox/ExportCsvLink no path), só o `<form>` GET server-safe.

### Cobertura

Cobertura: **12 de 21 rotas** sob `/rds/` (partidos, 3 perfis,
privacidade, feed, gastos, 3 listagens, busca). A onda HeroSection abriu
e fechou o trio de listagens (#1/#2/#3) e agora `/busca` (#4). Restam
dependentes só do #163 (já fechado): **`/comparar`** e a **home** — as
próximas naturais (mesmo padrão HeroSection `/server`). Fora da onda:
`/sign-in`/`/sign-up` (chrome puro, custo ~zero, sem data); painel + 5
slots aguardam N8/RDS #210 (TabsAsLinks). Workarounds §3.9 inalterados
(tabela vazia; varrer no próximo bump do RDS).

## §4 — Notas e premissas

- **Contagem feita por componente catalogado.** Componentes não-listados na
  matriz (ex.: `Filtros`, `BancadaList`, `ParesContraditorios`,
  `ProposicoesAutor`, `VotosRecentes`, `FiltrosProposicao`, `FiltrosVotacao`)
  não foram contados em prontidão porque a matriz não os categoriza. São
  componentes locais sem cobertura RDS prevista.
- **Sub-componentes não-exportados não foram considerados** — a matriz não os
  inclui (decisão documentada em `component-inventory.md` §"O que ficou fora").
- **Chrome do root layout** (`Navbar`, `Footer`, `Toaster`) entra em **todas**
  as rotas — sign-in/sign-up mantêm o root layout, mesmo com widget Clerk.
- **Painel** tem três camadas de layout (root + authenticated + painel) que
  somam a cada rota `@*`: o `TabBar` (cat. 3 / N8) aparece em todas as 6
  superfícies do painel — fechar N8 destrava-as juntas.
- **Os 3 perfis** (`/parlamentares/[id]`, `/proposicoes/[…]`, `/votacoes/[id]`)
  compartilham o mesmo trio de bloqueadores estruturais. Tratar como **lote
  único** quando N1+N4+N6 fecharem.
- **Cat. 1 ausente nas rotas** — primitivas cat. 1 (Skeleton, Badge, Dialog,
  Tabs, P de docs) são consumidas por composições, não importadas diretamente
  pelo page.tsx das rotas. A categoria existirá na contagem por componente,
  não por rota.
- **Esta análise não recategorizou** — confiou inteiramente na matriz versionada.
  Se a matriz tiver omissões ou erros, a prontidão herda esses problemas.
