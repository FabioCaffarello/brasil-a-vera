## Prontidão de migração por rota — brasil-a-vera × RDS 3.3.1

> Data 2026-06-06 · Branch `docs/route-readiness` · Read-only
>
> Fonte de categorias: `docs/migration/migration-matrix.md` (mergeado em #355).
> Inventário-base: `docs/migration/component-inventory.md`. Drafts E1–E12
> (enhancements) e N1–N9 (novos componentes) referenciam essa matriz.

## Resumo executivo

- 21 rotas de produção analisadas (`app/**/page.tsx`, excluindo `rds/`, `dev/`,
  `docs/`, `api/`).
- **Alta prontidão:** 6 rotas (`/feed`, `/privacidade`, `/partidos/[sigla]`,
  `/sign-in`, `/sign-up`, `/parlamentares/[id]/gastos`).
- **Média prontidão:** 12 rotas (todas as listagens, home, e as 6 superfícies do
  painel).
- **Baixa prontidão:** 3 rotas — exatamente os 3 perfis de detalhe
  (`/parlamentares/[id]`, `/proposicoes/[tipo]/[numero]/[ano]`,
  `/votacoes/[id]`), todos com o mesmo trio de bloqueadores estruturais.
- **Recomendação:** migrar primeiro **`/partidos/[sigla]`** — zero bloqueadores
  cat. 3, exercita o padrão dominante (componentes domain-coupled consumindo
  primitivas do RDS).

## §1 — Tabela de prontidão

Ordenada por score (alta → baixa), depois por nº total catalogado.
`cat.X` = quantidade de componentes da matriz naquela categoria que a rota usa.
`Total` = soma. Chrome do root layout (Navbar/Footer/Toaster) entra em todas
as rotas que não sobrescrevem o root layout — toda a coluna conta com eles.

| Rota | Total | cat. 1 | cat. 2 | cat. 3 | cat. 4 | Bloqueadores cat. 3 | Score |
| --- | ---: | ---: | ---: | ---: | ---: | --- | :---: |
| `/feed` | 3 | 0 | 1 | 0 | 2 | — | alta |
| `/privacidade` | 3 | 0 | 1 | 0 | 2 | — | alta |
| `/sign-in` | 5 | 0 | 1 | 0 | 4 | — | alta |
| `/sign-up` | 5 | 0 | 1 | 0 | 4 | — | alta |
| `/partidos/[sigla]` | 7 | 0 | 1 | 0 | 6 | — | alta |
| `/parlamentares/[id]/gastos` | 6 | 0 | 3 | 1 | 2 | FilterChips (N2) | alta |
| `/comparar` | 8 | 0 | 2 | 2 | 4 | HeroSection (N3), SectionCard (N1) | média |
| `/busca` | 10 | 0 | 2 | 2 | 6 | HeroSection (N3), SectionCard (N1) | média |
| `/parlamentares` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média |
| `/proposicoes` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média |
| `/votacoes` | 10 | 0 | 4 | 2 | 4 | HeroSection (N3), StatsGrid (N7) | média |
| `/` (home) | 12 | 0 | 3 | 3 | 6 | HeroSection (N3), KpiCard (N5), SectionCard (N1) | média |
| `/painel` (entry) | 7 | 0 | 1 | 1 | 5 | TabBar (N8) | média |
| `/painel ?tab=resumo` | 11 | 0 | 1 | 1 | 9 | TabBar (N8) | média |
| `/painel ?tab=meus-dados` | 8 | 0 | 1 | 1 | 6 | TabBar (N8) | média |
| `/painel ?tab=configuracoes` | 10 | 0 | 1 | 1 | 8 | TabBar (N8) | média |
| `/painel ?tab=alertas` | 10 | 0 | 1 | 2 | 7 | TabBar (N8), SubTabs alertas (N8) | média |
| `/painel ?tab=parlamentares` | 11 | 0 | 1 | 2 | 8 | TabBar (N8), SubTabs parl. (N8) | média |
| `/parlamentares/[id]` | 11 | 0 | 2 | 3 | 6 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa |
| `/proposicoes/[tipo]/[numero]/[ano]` | 15 | 0 | 2 | 3 | 10 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa |
| `/votacoes/[id]` | 17 | 0 | 2 | 3 | 12 | KpiStrip (N4), SectionCard (N1), SectionNav (N6) | baixa |

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
