# Dívida de consolidação — cópias-rds vs originais de produção

> Branch `feat/migrate-partidos-rds-pilot` · Read-only
>
> Esta página registra os componentes duplicados sob `/rds/` durante as
> migrações rota-a-rota. Cada par é uma cópia-rds que precisará ser
> consolidada quando a rota correspondente for promovida (cópia-rds vira a
> versão única; original deletado). Enquanto isso não acontece, **mudança
> num lado precisa ser espelhada no outro** — risco de drift.

## Como ler a tabela

- **Original** vive em `src/components/...`. **Intocada** pela migração.
- **Cópia-rds** vive sob `src/app/rds/<rota>/_components/...`. É uma
  tradução do original com tokens RDS + uso seletivo do `<Text>` (regra
  em `docs/migration/token-map.md` §"Como aplicar").
- **Risco de drift**:
  - **baixo** — componente estável que não muda há sprints; pouca
    chance de divergência.
  - **médio** — lógica não-trivial ou estilo que costuma evoluir;
    qualquer PR que toque o original precisa lembrar de espelhar.
  - **alto** — lógica complexa, partilhada com outras rotas, ou
    mudança recente. **Evitar duplicar** se não for absolutamente
    necessário.

## Pares ativos

### Rota piloto — `/rds/partidos/[sigla]` — ✅ PROMOVIDA

> **3ª promoção (2026-06-13 — route-readiness §3.21): a 1ª rota RICA
> consolidada.** Os 5 `_components/` traduzidos viraram os
> `src/components/partido/*` de produção (`partido-header` → `header`;
> esses componentes são usados só por esta rota — sobrescrever foi
> seguro), `src/app/partidos/[sigla]/page.tsx` recebeu o corpo RDS
> (Card/Text/Section), e o staging `src/app/rds/partidos/` foi
> removido. Helper `<Section>` segue inline na page (Card do `/server`).
> Dívida desta rota quitada — pares retirados da tabela. Sub-mecanismo
> validado: promoção de rota **com `_components/`** (mover para
> `src/components/`, ajustar imports `./_components/` → `@/components/`,
> deletar staging).

### Piloto-2 — `/rds/parlamentares/[id]` — ✅ PROMOVIDA (2026-06-15)

11ª promoção (1º perfil). Os 7 `_components/` de domínio (perfil-header,
votos-recentes, alinhamento, proposicoes-autor, gastos-resumo, afinidade-voto,
pares-contraditorios) sobrescritos pelas versões RDS verificadas em
`@/components/parlamentar/*` (sem hrefs/imports relativos a des-stagear).
`section-card` já-RDS; **`section-nav` canonicalizado** (overwrite com a versão
`useScrollSpy` do `/hooks` — API idêntica, cross-3-perfis). **`rds-accordion`**
(wrapper client p/ o Accordion do RDS via `/granular`) movido p/
`@/design-system/primitives/rds-accordion`. Página: `KpiStrip`→`Stat`/`StatGroup`
do `/server`. `GastosChart` (recharts) sobe como resíduo BaV (ADR-034 §5). QA
Playwright (0 erros; header/KPIs/section-nav/seções). Staging removido.

### Piloto-3 — `/rds/proposicoes/[tipo]/[numero]/[ano]` — ✅ PROMOVIDA (2026-06-15)

12ª promoção (2º perfil). Os 6 `_components/` de domínio (perfil-header,
autores-list, footer-cross-links, temas-list, tramitacao-timeline,
votacoes-vinculadas) sobrescritos pelas versões RDS verificadas em
`@/components/proposicao/*`. `barra-progresso`/`section-card`/`section-nav`/
`rds-accordion` já-RDS/canônicos (listagem/perfil parlamentar) → cópias
deletadas. Página: `KpiStrip`→`Stat`/`StatGroup` do `/server`. Charts
(`ApoioPartidoChart`, `VotosConsolidadosChart` donut) sobem como resíduo BaV
(ADR-034 §5; donut com o fix #303/#304 da Fase C #408). QA Playwright (perfil
renderiza, 0 erros; dado de votos consolidados esparso → donut não exercitado,
fix guard-verificado). Staging removido.

### Piloto-4 — `/rds/votacoes/[id]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/votacao/perfil-header.tsx` | `src/app/rds/votacoes/[id]/_components/perfil-header.tsx` | médio | consome DataBadge/TrustBadge/CompartilharVotacaoButton dos ORIGINAIS (precedente piloto-2); breadcrumb → `/votacoes` produção |
| `src/components/votacao/votos-resumo.tsx` | `src/app/rds/votacoes/[id]/_components/votos-resumo.tsx` | baixo | `<dl>` simples; tradução 1:1 pela tabela |
| `src/components/votacao/votos-por-partido.tsx` | `src/app/rds/votacoes/[id]/_components/votos-por-partido.tsx` | baixo | tabela; `text-brand→text-fg-brand` (extensão piloto-2, byte-idêntico) |
| `src/components/votacao/votos-individuais.tsx` | `src/app/rds/votacoes/[id]/_components/votos-individuais.tsx` | médio | client island duplicado (hrefs de filtro contidos em `/rds/`); pill ativo `bg-foreground/text-background → bg-fg-primary/text-surface-canvas` (extensão piloto-4, CP3 aprovado); `getTipoVotoStyle` da lib (classes BaV não traduzidas) |
| `src/components/votacao/rebeldes-list.tsx` | `src/app/rds/votacoes/[id]/_components/rebeldes-list.tsx` | médio | `getTipoVotoStyle` da lib; `text-foreground-subtle→fg-quaternary` |
| `src/components/votacao/proposicao-vinculada.tsx` | `src/app/rds/votacoes/[id]/_components/proposicao-vinculada.tsx` | baixo | link-card; href → `/proposicoes/...` produção |
| `src/components/votacao/footer-relacionadas.tsx` | `src/app/rds/votacoes/[id]/_components/footer-relacionadas.tsx` | médio | `bg-brand/15 → bg-fg-brand/15` (generalização `bg-brand/N` da extensão piloto-4, CP4 aprovado); links → `/votacoes/[id]` produção |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/votacoes/[id]/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia das pilotos 2/3 (Card compound) |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/votacoes/[id]/_components/section-nav.tsx` | médio | reuso VERBATIM da cópia das pilotos 2/3 (`useScrollSpy` via `./hooks` desde a varredura 2026-06-11) |

Client islands importados dos originais (sem cópia, precedente
piloto-2/3): `DisciplinaPartidariaChart`/`VotacaoPorPartidoChart`/
`VotacaoVotosConsolidadosChart` (recharts, dynamic ssr:false),
`ExportCsvLink`, `CompartilharVotacaoButton`, `TrustBadge`, `DataBadge`.
`KpiStrip` → `StatGroup`+`Stat` do `/server` direto no `page.tsx`
(tones inline: success/error/neutral).

**Checkpoints resolvidos (decisão do owner, PR piloto-4):**
`VotacaoHemicicloChart` (`src/components/votacao/charts/hemiciclo.tsx`,
SVG inline com `fill: var(--success)` etc.) e `MargemDecisaoBar`
(`src/components/votacao/margem-decisao.tsx`, barra CSS-only
`bg-success`/`bg-destructive`) permanecem **imports dos ORIGINAIS**, sem
cópia e sem tradução — mesma classe da pendência piloto-3 (cor via var
em prop/atributo). Razão: consistência cross-chart na seção Resumo
(mesmos verdes/vermelhos do donut recharts ao lado). Calibram na
promoção, junto com os charts recharts e `getTipoVotoStyle`.

### Piloto-5 — `/rds/privacidade` + `/rds/feed` (pares em nível de página)

Rotas textuais sem componentes de domínio em `src/components/` — os
helpers locais (`Section`, `ContactLink`, `FeedGroup`) vivem DENTRO do
`page.tsx` e foram reconstruídos inline na cópia (precedente piloto-1:
helper local não vira arquivo separado). Sem `_components/`, o
espelhamento é em nível de página — os pares abaixo dão ao guard a
mesma vigilância de drift das checagens 1/2:

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|

> **`/privacidade` e `/feed` PROMOVIDAS** (1ª e 2ª promoções,
> 2026-06-13 — ver route-readiness §3.21): as cópias `/rds/privacidade`
> e `/rds/feed` foram consolidadas em produção (tokens RDS) e os
> stagings removidos. Pares retirados da tabela — a seção piloto-5 está
> totalmente quitada.

### Piloto-6 — `/rds/parlamentares/[id]/gastos` — ✅ PROMOVIDA (2026-06-14)

Promovida ao RDS (4ª promoção; 1ª da fase de promoção das rotas ricas).
A página de produção `src/app/parlamentares/[id]/gastos/page.tsx` recebeu o
corpo RDS (tokens da tabela canônica; `FilterChips`/`Label` do `/server`;
`FilterChip` item local) com des-staging (base href, back-link e form
`action` em `/parlamentares/...`; title sem `(rds-pilot)`). Staging
`src/app/rds/parlamentares/[id]/gastos/` removido — par retirado da tabela.

### Onda HeroSection #1 — `/rds/parlamentares` (listagem) — ✅ PROMOVIDA (2026-06-14)

5ª promoção (1ª listagem rica). `parlamentar-card` e `filtros` canonicalizados
in-place em produção (tokens RDS pela tabela canônica, hrefs de produção;
`FilterChips`/`Label` do `/server`, `FilterChip` item de `@/design-system`,
`bg-accent` residue preservado no AlinhamentoStrip). A página recebeu o corpo RDS
des-staged (`HeroSection` + `Stat`/`StatGroup` do `/server`; imports canônicos;
href "Limpar" em `/parlamentares`; title sem `(rds-pilot)`). As 5 cópias em
`_components/` + a página staging removidas — pares retirados da tabela.
`button`/`empty-state`/`filter-chip` já eram RDS em produção (Fase B); cópias só
deletadas.

### Onda HeroSection #2 — `/rds/proposicoes` (listagem) — ✅ PROMOVIDA (2026-06-14)

6ª promoção (2ª listagem). `proposicao-card` e `barra-progresso-tramitacao`
canonicalizados in-place (tokens RDS; resíduos `bg-success`/`text-success-foreground`
do badge TRANSFORMADA_EM_NORMA + `bg-success/N` preservados; hrefs de produção);
`filtros` adota RDS `FilterChips`/`Label` do `/server`. Página com `HeroSection` +
`StatGroup cols=4` (com `hint`) do `/server`. Cópias `_components/` + staging
removidas — pares retirados. `button`/`empty-state`/`filter-chip` já-RDS (Fase B).

### Onda HeroSection #3 — `/rds/votacoes` (listagem) — ✅ PROMOVIDA (2026-06-14)

7ª promoção (3ª e última listagem; fecha o trio). `votacao-card` canonicalizado
in-place (badges `bg-success/20 text-fg-success` e `bg-error/20 text-fg-error`;
href de produção); `filtros` adota RDS `FilterChips`/`Label` do `/server`. Página
com `HeroSection` + `StatGroup cols=4` do `/server`; `alternates` RSS →
`/feed/votacoes`. Cópias `_components/` + staging removidas — pares retirados.

### Onda HeroSection #4 — `/rds/busca` (busca cruzada) — ✅ PROMOVIDA (2026-06-15)

8ª promoção. Reusa os 3 cards já canonicalizados (listagens). Canonicalizados
neste PR: `input` (primitivo, tokens RDS in-place) e **`section-card`**
(`@/design-system/compositions` — sobrescrito com a versão RDS Card compound;
API idêntica → afeta home/comparar/perfis sem quebrar, convergência antecipada).
`search-form` (`@/components/busca`) só trocou o token do ícone
(`text-foreground-subtle→fg-quaternary`); action/imports já eram de produção.
Página com `HeroSection` do `/server` (3 estados); callout do match exato mantém
`border-success/40 bg-success/10` + `text-fg-success`; cross-link → `/proposicoes/...`.
Staging removido — pares retirados.

### Onda HeroSection #5 — `/rds/comparar` (comparativo lado a lado) — ✅ PROMOVIDA (2026-06-15)

9ª promoção. `concordancia-matrix` (3 limiares de cor success/fg/warning — não é
data-viz, mesmo padrão AlinhamentoBancada) e `parlamentares-grid` canonicalizados
in-place; `section-card` já-RDS (busca #4). Página com `HeroSection` do `/server`;
`ErrorState` helper local inline (`text-fg-warning` + `border-warning/40
bg-warning/10` BaV neutralizado). Staging removido — pares retirados.

### Onda HeroSection #6 — `/rds/home` (home `/`) — ✅ PROMOVIDA (2026-06-15)

10ª promoção (a rota mais visível). `kpi-card` (KpiCard local mantido — opção A:
o Stat do RDS não tem slot p/ o `floatingBadge` do TrustBadge L1; candidato a
issue upstream), `card` (primitivo shadcn — Card compound do RDS não cobre a
API), `card-parlamentares`/`card-votacoes-semana`/`features-grid` canonicalizados
in-place; `section-card`/`button` já-RDS. Página com `HeroSection` do `/server`
(slot `kpis`); `DataBadge`/`TrustBadge` mantidos (resíduo accent / client island).
`dynamic='force-dynamic'` preservado. Staging removido — pares retirados.

### Migração painel — `/rds/painel` (área logada, parallel routes + 5 slots)

A MAIOR migração da leva e a ÚLTIMA: a área logada inteira (entry +
5 slots de Parallel Routes + TabsAsLinks). A estrutura `@slot` foi
recriada 1:1 sob `src/app/rds/painel/` (`layout.tsx` recebe os 5 slots
nomeados; `page.tsx` neutral; cada slot com `page.tsx` + `default.tsx`).
**Parallel routes funcionam aninhados sob o `RdsStagingLayout`** (este
layout filho declara/renderiza os slots; o `/rds/layout.tsx` pai só
envolve em `<div>` + noindex) — confirmado pelo build (sem
incompatibilidade estrutural; era o risco de "estruturalmente inédito"
do scoping, falsificado a favor).

`auth()` (Clerk) preservado server-side no `layout.tsx` e nos 5 slots
(ClerkProvider único vem do root layout, fix #315). Queries (follows,
alert-delivery, user-profile, alert-policy, data-request, recomendacoes)
e `painel-tabs` (parsers puros) **importadas das libs ORIGINAIS** —
lógica de domínio única, NÃO duplicada (decisão #4 do scoping).

`TabBar` (5 pilares) → `TabsAsLinks variant="default"` do RDS `/server`;
os 2 SubTabs (parlamentares, alertas) → `TabsAsLinks variant="sub"`. API
1:1 confirmada (`TabAsLink { label, href, active?, icon?, count? }` +
`variant 'default'|'sub'`): counters→count, ícones lucide→icon. `KpiStrip`
(composição local) → `StatGroup layout="grid" cols={4}` + `Stat` do
`/server` (precedente §3.6/piloto-2; tone `default/muted→neutral`,
`warning→warning`, `destructive→error`).

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/painel/painel-header.tsx` | `src/app/rds/painel/_components/painel-header.tsx` | médio | header de identidade (RSC, zero-JS); tokens 1:1 (`border-border→line-default`, `bg-surface-elevated→surface-raised`, `text-foreground{,-muted}→fg-{primary,tertiary}`); MANTIDOS (resíduo, classe conhecida): `bg-gradient-primary` (utility custom do BaV `linear-gradient(--primary,--accent)`, compõe o `--accent` roxo ADR-024 sem par RDS — mesmo regime do `bg-accent/N` §3.14; regra 2 NÃO disparada: gradiente ESTÁTICO de marca, não SVG/chart/`hsl(var())`/`color-mix`) e `text-white`/`ring-white/10` (utilities Tailwind PADRÃO, byte-idênticas dos dois lados — não apelido semântico BaV, regra 1 não disparada, mesma régua de homônimo §3.17) |
| `src/components/painel/tab-bar.tsx` | `src/app/rds/painel/_components/tab-bar.tsx` | médio | client wrapper fino (lê `useSearchParams()` p/ derivar `active` — o layout server não recebe searchParams) que renderiza `TabsAsLinks variant="default"` do `/server` com `linkComponent={Link}`; counters→count, ícones lucide→icon; diferença visual da ADOÇÃO (não tradução de token, régua §3.14): active `border-line-brand text-fg-brand-emphasis` (vs `border-brand text-foreground` local), count em pill (vs `· N` middot) — apresentação do componente adotado |
| `src/components/painel/parlamentares/sub-tabs.tsx` | `src/app/rds/painel/_components/sub-tabs-parlamentares.tsx` | baixo | `TabsAsLinks variant="sub"` do `/server`; cópia **SERVER** (o original era client só p/ `<Link>`+aria-current; o active vem por prop, TabsAsLinks já emite aria-current → drop `'use client'`, ESTRITAMENTE menos JS); count entre parênteses → pill |
| `src/components/painel/alertas/sub-tabs.tsx` | `src/app/rds/painel/_components/sub-tabs-alertas.tsx` | baixo | idem (cópia SERVER `TabsAsLinks variant="sub"`); count só na sub-tab "recebidos" (preservado) |
| `src/components/painel/active-slot-picker.tsx` | `src/app/rds/painel/_components/active-slot-picker.tsx` | baixo | client island duplicado (decisão #4); lê `useSearchParams()` e retorna o slot ativo (slots inativos → null); sem classnames → sem tradução; `parseTab` puro do util ORIGINAL |
| `src/components/painel/estado-maduro.tsx` | `src/app/rds/painel/_components/estado-maduro.tsx` | médio | RSC; `KpiStrip`→`StatGroup grid cols={4}`+`Stat` (tone map); `ParlamentarCard` do ORIGINAL (client island); tokens 1:1 (`text-foreground{,-muted}→fg-{primary,tertiary}`); regra 2 NÃO disparada (grep só casou a string "KpiStrip" composição, não SVG/chart) |
| `src/components/painel/estado-onboarding.tsx` | `src/app/rds/painel/_components/estado-onboarding.tsx` | médio | idem (RSC; KpiStrip→StatGroup; `ParlamentarCard` do ORIGINAL; tone `warning`/`muted`/`default`) |
| `src/components/painel/estado-novo.tsx` | `src/app/rds/painel/_components/estado-novo.tsx` | baixo | RSC; `Button`→cópia local `./button`; `ParlamentarCard` do ORIGINAL; href "Explorar" → `/rds/parlamentares`; tokens 1:1 (`text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`, `hover:text-foreground→hover:text-fg-primary`) |
| `src/components/painel/parlamentares/lista-acompanhando.tsx` | `src/app/rds/painel/_components/lista-acompanhando.tsx` | baixo | RSC; `Button`→cópia local; `ParlamentarCard` do ORIGINAL; href → `/rds/parlamentares`; tokens 1:1 (`border-border→line-default`, `bg-surface→surface-base`, `text-foreground{,-muted}→fg-{primary,tertiary}`) |
| `src/components/painel/parlamentares/lista-da-minha-uf.tsx` | `src/app/rds/painel/_components/lista-da-minha-uf.tsx` | baixo | RSC; `FormUfInline`/`ParlamentarCard` dos ORIGINAIS (client islands); tokens 1:1 (idem lista-acompanhando) |
| `src/components/painel/alertas/lista-recebidos.tsx` | `src/app/rds/painel/_components/lista-recebidos.tsx` | baixo | RSC (renderiza markdown server-side); `ItemRecebido` do ORIGINAL (client island); `renderMarkdown` da lib; tokens 1:1 (idem) |
| `src/design-system/primitives/button.tsx` | `src/app/rds/painel/_components/button.tsx` | médio | reuso VERBATIM das ondas anteriores (Button do RDS é client; cópia local zero-JS + token-clean); `bg-brand/text-brand→*-fg-brand` (byte-idêntico pós-#358), `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API: `brand-foreground`, `destructive`/`destructive-foreground` |

Pares em nível de página (slots/layout/page — `src/components/` não tem
contraparte; a lógica vive no `page.tsx`/`layout.tsx`):

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/app/(authenticated)/painel/layout.tsx` | `src/app/rds/painel/layout.tsx` | médio | layout de Parallel Routes (5 slots nomeados); `auth()` + queries (follows/alert-delivery/user-profile) preservadas; compõe `PainelHeader`+`TabBar`+`ActiveSlotPicker` |
| `src/app/(authenticated)/painel/page.tsx` | `src/app/rds/painel/page.tsx` | baixo | neutral entry (retorna null); `generateMetadata` por `?tab=` com sufixo `(rds-pilot)` |
| `src/app/(authenticated)/painel/@resumo/page.tsx` | `src/app/rds/painel/@resumo/page.tsx` | médio | slot Resumo (4 estados); `OnboardingWizard` do ORIGINAL (client island); `Estado*`→cópias locais; queries preservadas |
| `src/app/(authenticated)/painel/@parlamentares/page.tsx` | `src/app/rds/painel/@parlamentares/page.tsx` | médio | slot Parlamentares (2 sub-tabs); `BannerMudancaUf` do ORIGINAL; `SubTabs`/`Lista*`→cópias locais; tokens 1:1 |
| `src/app/(authenticated)/painel/@alertas/page.tsx` | `src/app/rds/painel/@alertas/page.tsx` | médio | slot Alertas (2 sub-tabs); `FormPoliticas` do ORIGINAL; `SubTabs`/`ListaRecebidos`→cópias locais; tokens 1:1 |
| `src/app/(authenticated)/painel/@configuracoes/page.tsx` | `src/app/rds/painel/@configuracoes/page.tsx` | médio | slot Configurações (4 seções inline); `FormPerfil`/`TemasChips`/`ComunicacaoToggles` dos ORIGINAIS; tokens 1:1 + `hover:text-brand→hover:text-fg-brand`; hrefs → `/rds/painel?tab=meus-dados` e `/rds/privacidade` (rota migrada piloto-5) |
| `src/app/(authenticated)/painel/@meusDados/page.tsx` | `src/app/rds/painel/@meusDados/page.tsx` | médio | slot Meus dados (dashboard LGPD inline); `AcoesLgpd` do ORIGINAL; tokens 1:1 + `text-brand→text-fg-brand`; href "voltar" → `/rds/painel?tab=configuracoes`; MANTIDO `text-red-500` (status "failed" — utility Tailwind PADRÃO byte-idêntica, inconsistência do ORIGINAL preservada 1:1, regra 1 não disparada) |
| `src/app/(authenticated)/painel/@{resumo,parlamentares,alertas,configuracoes,meusDados}/default.tsx` (×5) | `src/app/rds/painel/@.../default.tsx` (×5) | baixo | fallbacks de Parallel Route (`return null`); sem classnames |

Client islands importados dos ORIGINAIS (sem cópia, precedente universal):
`OnboardingWizard`, `BannerMudancaUf`, `FormUfInline`, `FormPoliticas`,
`ItemRecebido`, `ComunicacaoToggles`, `FormPerfil`, `TemasChips`,
`AcoesLgpd`, `ParlamentarCard`, `FollowButton`. `ConsentGate`/
`MigracaoLocalStorageModal` vivem no `(authenticated)/layout.tsx` (auth
layout, FORA do escopo desta migração — `/rds/painel` herda do root
layout via nesting, não do authenticated layout). Tokens BaV internos dos
client islands calibram na promoção.

### Wrappers de entry granular (varredura 3.9.0 — sem original)

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `(novo — sem original; re-export do RDS)` | `src/app/rds/parlamentares/[id]/_components/rds-accordion.ts` | baixo | wrapper 'use client' de 1 linha: faz o import do barrel `/granular` cruzar o boundary DENTRO de módulo client (tree-shaking poda ~200 re-exports; import direto de SC custava +294KB — medição na varredura 3.9.0) |
| `(novo — sem original; re-export do RDS)` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/rds-accordion.ts` | baixo | idem (cópia verbatim) |
| `(novo — sem original; re-export do RDS)` | `src/app/rds/votacoes/[id]/_components/rds-accordion.ts` | baixo | idem (cópia verbatim) |

O Accordion Radix local (`src/design-system/primitives/accordion`)
segue em uso pelas rotas de PRODUÇÃO; as rotas `/rds/` não o consomem
mais (Accordion do RDS via wrapper desde a varredura 3.9.0).

### Pendências upstream / client islands (piloto-2)

- **Accordion mobile**: primitiva Radix LOCAL (`src/design-system/primitives/accordion`)
  mantida na rota staging. Gap reportado em
  [RDS #202](https://github.com/FabioCaffarello/react-design-system/issues/202)
  (clipping `max-h-[1000px]` + typography fixa do trigger + sem className
  por item). Swap quando fechar.
- **useScrollSpy**: pedido entry granular em
  [RDS #203](https://github.com/FabioCaffarello/react-design-system/issues/203)
  com medição literal (+277.593 bytes no chunk da rota, +29% de JS).
- **FilterChips**: wrapper adotado do RDS `/server` na varredura 3.10.0
  ([RDS #162](https://github.com/FabioCaffarello/react-design-system/issues/162) fechada / [RDS #211](https://github.com/FabioCaffarello/react-design-system/pull/211)). O `FilterChip` **item** segue
  local (server-safe/zero-JS) por decisão do owner — o `Chip` do RDS é
  client (+5.759 bytes/rota medidos) e os chips são `<Link>`. Eliminar a
  duplicação do item depende de um chip server-safe upstream (issue
  futura), não de gap aberto.
- **Client islands compartilhados, importados dos originais (sem tradução
  neste PR)**: `TrustBadge`, `CompartilharButton`, `GastosChart`
  (recharts). Tokens BaV internos; traduzir na promoção ou quando o RDS
  cobrir os respectivos padrões.
- **`getTipoVotoStyle`** (`src/lib/format.ts`): retorna classes BaV
  (`bg-success/20 text-success` etc.) consumidas pelas cópias. Lógica de
  domínio única — NÃO duplicada; classes traduzem na promoção.

## Política de espelhamento (enquanto a dívida existir)

1. **Modificar o original** (`src/components/partido/*.tsx`) sem espelhar:
   o original muda em produção, a cópia-rds não. Aceitável a curto prazo
   (a rota /rds/ é staging, não produção).
2. **Modificar a cópia-rds** sem espelhar: deformação na rota staging que
   não reflete a real. Evitar — qualquer ajuste descoberto na piloto
   deveria virar PR de consolidação ou ser portado pro original.
3. **Mudança estrutural** (rename, prop change): PARAR a migração e
   reavaliar — pode ser sinal de que a estratégia de duplicação esgotou
   sua utilidade para essa peça.

## Consolidação (quando uma rota é promovida)

Promoção = rota `/rds/X` substitui a rota `/X` em produção. No momento da
promoção:

1. Mover o conteúdo do `_components/` da rota piloto para o local de
   produção (`src/components/<área>/`).
2. Deletar o original.
3. Atualizar os imports nos demais consumidores (se houver — o usual é
   que cópias-rds só sirvam à rota piloto).
4. Rodar build + dev para confirmar.
5. Remover a entrada desta tabela.

## Observações da rota piloto

- **`BancadaList` não estava catalogada na matriz** (omissão herdada do
  inventário em `docs/migration/component-inventory.md`). Registrar como
  nota de correção na matriz (ver §"correções pendentes").
- **`p-5` vs `p-4` no Card**: o original usa `p-5` (20px); o `<Card>` do
  RDS com `padding="medium"` (default) renderiza `p-4` (16px). Diferença
  de 4px — sub-perceptual. Aceito. Se acumular nas migrações futuras,
  considerar passar `padding="large"` (renderiza `p-6` = 24px, ligeiramente
  maior) ou trocar `<Card>` por `<div>` cru com classes traduzidas.

## Correções pendentes à matriz

- **`BancadaList`** (`src/components/partido/bancada-list.tsx`): cat. 4
  (domain-coupled — `PartidoMembro` no contrato). Usos: 1 arquivo / 1 site
  (`/partidos/[sigla]`). Estilo: Tailwind com tokens semânticos do BaV
  (`bg-surface`, `border-border{,-strong}`, `text-foreground{,-muted}`,
  `ring-ring`).

Adicionar na próxima atualização de `docs/migration/migration-matrix.md`.
