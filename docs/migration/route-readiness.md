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
