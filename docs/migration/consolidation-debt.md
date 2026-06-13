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

### Rota piloto — `/rds/partidos/[sigla]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/partido/header.tsx` | `src/app/rds/partidos/[sigla]/_components/partido-header.tsx` | baixo | header simples (eyebrow + h1 + 2 subtítulos); typography custom no h1, demais via `<Text>` |
| `src/components/partido/bancada-list.tsx` | `src/app/rds/partidos/[sigla]/_components/bancada-list.tsx` | médio | layout de card-link com hover/focus; `<img>` cru preservado para zero-JS |
| `src/components/partido/fidelidade-media.tsx` | `src/app/rds/partidos/[sigla]/_components/fidelidade-media.tsx` | médio | **lógica de limiares de cor preservada exata** (≥80 success / ≥50 foreground / <50 warning); padrão "3 limiares" replicado em outras 3 rotas (registro na matriz) |
| `src/components/partido/top-temas.tsx` | `src/app/rds/partidos/[sigla]/_components/top-temas.tsx` | baixo | `<ol>` simples com tema + contagem |
| `src/components/partido/gasto-bancada.tsx` | `src/app/rds/partidos/[sigla]/_components/gasto-bancada.tsx` | médio | formatBRL importado; lógica de estado-vazio preservada |

Helper local `<Section>` do `page.tsx` original NÃO virou arquivo separado
nem no original nem na cópia. Na cópia-rds, foi reconstruído usando `<Card>`
do `/server` + `<Text>` para hint + `<h2>` cru para título.

### Piloto-2 — `/rds/parlamentares/[id]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/parlamentar/perfil-header.tsx` | `src/app/rds/parlamentares/[id]/_components/perfil-header.tsx` | médio | estrutura semântica (header/dl) preservada; consome DataBadge/PartyBadge/TrustBadge/CompartilharButton dos ORIGINAIS (ver §"client islands") |
| `src/components/parlamentar/votos-recentes.tsx` | `src/app/rds/parlamentares/[id]/_components/votos-recentes.tsx` | médio | filtros + cursor pagination; `DistribuicaoBar` CSS-only preservada; `getTipoVotoStyle` da lib (classes BaV não traduzidas) |
| `src/components/parlamentar/alinhamento.tsx` | `src/app/rds/parlamentares/[id]/_components/alinhamento.tsx` | médio | limiares de cor exatos (≥80/≥50/<50); `Sparkline12m` SVG preservada — `text-accent`/`fill-accent` MANTIDOS (resíduo, sem equivalente RDS) |
| `src/components/parlamentar/proposicoes-autor.tsx` | `src/app/rds/parlamentares/[id]/_components/proposicoes-autor.tsx` | baixo | filtros + cursor pagination, espelho do padrão votos-recentes |
| `src/components/parlamentar/gastos-resumo.tsx` | `src/app/rds/parlamentares/[id]/_components/gastos-resumo.tsx` | médio | `GastosChart` (recharts, dynamic ssr:false) importado do original; link drill-down `text-accent` mantido (resíduo) |
| `src/components/parlamentar/afinidade-voto.tsx` | `src/app/rds/parlamentares/[id]/_components/afinidade-voto.tsx` | baixo | lista ranqueada simples |
| `src/components/parlamentar/pares-contraditorios.tsx` | `src/app/rds/parlamentares/[id]/_components/pares-contraditorios.tsx` | médio | acento warning subtle preservado; badges direção: `destructive→error` (tradução estendida piloto-2) |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/parlamentares/[id]/_components/section-card.tsx` | baixo | **reconstruída sobre Card compound do RDS 3.5.0** (asSection + Card.Title icon/badge); API local preservada |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/parlamentares/[id]/_components/section-nav.tsx` | médio | `useScrollSpy` via entry `./hooks` (RDS 3.8.0, #205 fecha #203; +396 bytes medidos na varredura 2026-06-11) — IntersectionObserver local aposentado |

Composições substituídas por upstream SEM cópia: `KpiStrip` → `StatGroup`+`Stat`
do `/server` direto no `page.tsx` (borda externa via className; tone map
`default/muted→neutral`, `destructive→error`).

### Piloto-3 — `/rds/proposicoes/[tipo]/[numero]/[ano]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/proposicao/perfil-header.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/perfil-header.tsx` | médio | badge sólido TRANSFORMADA_EM_NORMA mantém `bg-success text-success-foreground` (resíduo on-color, extensão piloto-3 do token-map) |
| `src/components/proposicao/autores-list.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/autores-list.tsx` | baixo | PartyBadge local mantido |
| `src/components/proposicao/barra-progresso-tramitacao.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/barra-progresso-tramitacao.tsx` | médio | `brand→fg-brand` (byte-idêntico pós-#358); usada também pelo ProposicaoCard da listagem — original intocado |
| `src/components/proposicao/footer-cross-links.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/footer-cross-links.tsx` | baixo | contratos de fallback exatos |
| `src/components/proposicao/temas-list.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/temas-list.tsx` | baixo | zero deps |
| `src/components/proposicao/tramitacao-timeline.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/tramitacao-timeline.tsx` | médio | filtros + cursor pagination; FilterChips wrapper do RDS /server (#162 fechada, varredura 3.10.0); FilterChip item local |
| `src/components/proposicao/votacoes-vinculadas.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/votacoes-vinculadas.tsx` | médio | filtros mini exatos; FilterChips wrapper do RDS /server (#162 fechada); FilterChip item local |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia da piloto-2 (Card compound) |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/section-nav.tsx` | médio | reuso VERBATIM da cópia da piloto-2 (`useScrollSpy` via `./hooks` desde a varredura 2026-06-11) |

Client islands importados dos originais (sem cópia, precedente
piloto-2): `ApoioPartidoChart`/`VotosConsolidadosChart` (recharts,
dynamic ssr:false), `CompartilharProposicaoButton`, `TrustBadge`.
`KpiStrip` → `StatGroup`+`Stat` do `/server` direto no `page.tsx`
(tone map `STAT_TONE` no próprio arquivo).

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

### Piloto-6 — `/rds/parlamentares/[id]/gastos` (par em nível de página)

Rota AUTOCONTIDA: a lógica vive inline no `page.tsx` (filtros + tabela
paginada por cursor), sem componentes de domínio em `src/components/`.
Nenhum `_components/` — espelhamento em nível de página (precedente
piloto-5). Sem data-viz/charts. O par abaixo dá ao guard a mesma
vigilância de drift das checagens 1/2:

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/app/parlamentares/[id]/gastos/page.tsx` | `src/app/rds/parlamentares/[id]/gastos/page.tsx` | médio | filtros (trimestre via FilterChips + categoria via SELECT cru) + tabela CEAP paginada por cursor (`CursorGastosV1`, ADR-026); `FilterChips` wrapper do RDS `/server` (#162 fechada, varredura 3.10.0); `FilterChip` item local (zero-JS, §3.9); `Label` do RDS `/server` (server-safe, renderiza `<label>` nativo); tokens 1:1 pela tabela canônica (`border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `ring-ring→line-focus`, `bg-surface→surface-base`, `hover:bg-surface-elevated→surface-raised`, `text-foreground{,-muted}→fg-{primary,tertiary}`, `border-border→line-default`); base href, back-link e form `action` em `/rds/`; sem extensão de token nova |

### Onda HeroSection #1 — `/rds/parlamentares` (listagem)

Primeira das 3 listagens. A `HeroSection` (#163) fechou upstream e foi
entregue no `/server` da RDS 3.12.0 (bump 3.10.0 → 3.12.0 neste PR),
destravando a leva. Cinco cópias em `_components/`; `PartyBadge`,
`DataBadge`, `ExportCsvLink`, `FollowButton` e `Combobox` são importados
dos ORIGINAIS (sem cópia — precedente client islands / composições
mantidas), logo sem par de drift.

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/parlamentar/filtros.tsx` | `src/app/rds/parlamentares/_components/filtros.tsx` | médio | filtros Casa (FilterChips Links, URL=state) + busca por nome (input SSR) + partido/UF (Combobox client island do original) + ordem (select nativo) + chips de filtros ativos; `FilterChips` wrapper do RDS `/server` (#162, §3.9); `FilterChip` item local; `Label` do RDS `/server` (server-safe, precedente piloto-6); `Button` da cópia local; hrefs/form `action`/link "Limpar" em `/rds/parlamentares`; tokens 1:1 pela tabela canônica (`border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `ring-ring→line-focus`, `border-border→line-default`, `bg-surface→surface-base`, `text-foreground{,-muted}→fg-{primary,tertiary}`, `hover:bg-surface→hover:bg-surface-base`); sem extensão de token nova |
| `src/components/parlamentar/parlamentar-card.tsx` | `src/app/rds/parlamentares/_components/parlamentar-card.tsx` | médio | card de listagem (gating server-side do FollowButton preservado — anônimo sem HTML/JS do botão); `FollowButton` e `PartyBadge` importados dos ORIGINAIS; href do card → `/rds/parlamentares/[id]`; contrato de fallback do alinhamento exato (com_amostra/insuficiente/sem_dado); `AlinhamentoStrip` barra CSS-only mantém `bg-accent/15`/`bg-accent/60` (resíduo data-viz ADR-024, mesma régua piloto-2 alinhamento.tsx — NÃO traduzido); demais tokens 1:1 (`border-border{,-strong}→line-{default,emphasis}`, `bg-surface{,-elevated}→surface-{base,raised}`, `ring-ring→line-focus`, `ring-offset-surface→offset-surface-base`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`) |
| `src/components/ui/empty-state.tsx` | `src/app/rds/parlamentares/_components/empty-state.tsx` | baixo | apresentacional puro; o `EmptyState` do RDS existe mas só no entry raiz (client, +JS contra ADR-022) → cópia local traduzida mantém zero-JS; tokens 1:1 (`border-border→line-default`, `bg-surface/50→surface-base/50`, `bg-surface-elevated→surface-raised`, `text-foreground{,-muted}→fg-{primary,tertiary}`) |
| `src/design-system/primitives/button.tsx` | `src/app/rds/parlamentares/_components/button.tsx` | médio | primitivo Button; o Button do RDS é client (não está no `/server`, +JS) e o local diverge em token de marca → cópia local traduzida (zero-JS + token-clean); `bg-brand→bg-fg-brand`/`text-brand→text-fg-brand` (byte-idêntico pós-#358), `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API (variantes não usadas na listagem): `brand-foreground` (on-color do CTA), `destructive`/`destructive-foreground` |
| `src/design-system/compositions/filter-chips.tsx` (item `FilterChip`) | `src/app/rds/parlamentares/_components/filter-chip.tsx` | baixo | só o item `FilterChip` (o wrapper `FilterChips` vem do RDS `/server`); decisão §3.9: item local (Chip do RDS é client +5.759 bytes/rota, chips são `<Link>`, ADR-022); tokens 1:1 (`ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`, `border-brand bg-brand/10 text-brand→*-fg-brand`, `border-border→line-default`, `bg-surface{,-elevated}→surface-{base,raised}`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`); MANTIDO: `shadow-glow` (resíduo sem par RDS) |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server`
(API 1:1: kicker/title/description/variant="plain"/align="center");
`StatsGrid` (composição local) → `StatGroup layout="grid" cols={3}` +
`Stat` do `/server` (precedente §3.6; borda/dividers do próprio
StatGroup). Client islands importados dos originais (sem cópia):
`ExportCsvLink`, `FollowButton`, `Combobox`, `DataBadge`, `PartyBadge`,
e o auth/`canExport`/`getFollowsByUserId`/`getOrCreateUserProfileId`.

### Onda HeroSection #2 — `/rds/proposicoes` (listagem)

Segunda das 3 listagens — replica o padrão da #1 (`/rds/parlamentares`)
verbatim no bump 3.12.0. `button`, `empty-state` e `filter-chip` são
reuso VERBATIM das cópias da listagem #1 (apresentacionais puros, sem
href/rota embutida — só o header de comentário muda); `filtros` e
`proposicao-card` são cópias de domínio próprias; `barra-progresso-tramitacao`
é reuso verbatim da tradução da piloto-3 (mesmo original, usado lá pelo
detalhe). `DataBadge`, `ExportCsvLink`, `Combobox` importados dos
ORIGINAIS (client islands / composições mantidas), logo sem par de drift.

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/proposicao/filtros.tsx` | `src/app/rds/proposicoes/_components/filtros.tsx` | médio | hybrid de filtros: Tipo + Situação via FilterChips Links (URL=state) + busca `q` (input SSR cru, precedente filtros #1) + Tema via Combobox (client island do original) + Ano/Ordem via select nativo + chips de filtros ativos; `FilterChips` wrapper do RDS `/server` (#162, §3.9); `FilterChip` item local; `Label` do RDS `/server` (server-safe, precedente piloto-6); `Button` da cópia local; hrefs/form `action`/links "Limpar" em `/rds/proposicoes`; tokens 1:1 pela tabela canônica (`border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `ring-ring→line-focus`, `border-border→line-default`, `bg-surface→surface-base`, `text-foreground{,-muted}→fg-{primary,tertiary}`, `hover:bg-surface→hover:bg-surface-base`); sem extensão de token nova |
| `src/components/proposicao/proposicao-card.tsx` | `src/app/rds/proposicoes/_components/proposicao-card.tsx` | médio | card de listagem (ref + badge de situação + ementa line-clamp-3 + mini-barra de tramitação + footer compacto); href do card → `/rds/proposicoes/[tipo]/[numero]/[ano]` (perfil migrado na piloto-3); lógica de domínio única preservada (`classifyTramitacaoCard`/`inferirMarcoAtual`/`isSituacaoTerminalNegativa`); `BarraProgressoTramitacao` → cópia local; SITUACAO_CLASSES traduzidas (`bg-brand/20 text-brand→bg-fg-brand/20 text-fg-brand`, `text-success→text-fg-success` com `bg-success/N` homônimo mantido, `bg-destructive/20 text-destructive→bg-error/20 text-fg-error`, `bg-surface-elevated text-foreground-muted→bg-surface-raised text-fg-tertiary`); MANTIDO `bg-success text-success-foreground` (badge sólido TRANSFORMADA_EM_NORMA — resíduo on-color, ext. piloto-3); demais tokens 1:1 (`border-border{,-strong}→line-{default,emphasis}`, `bg-surface→surface-base`, `hover:bg-surface-elevated→surface-raised`, `ring-ring→line-focus`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`, `text-warning→fg-warning`) |
| `src/components/proposicao/barra-progresso-tramitacao.tsx` | `src/app/rds/proposicoes/_components/barra-progresso-tramitacao.tsx` | médio | reuso VERBATIM da tradução da piloto-3 (mesmo original, lá usado pelo SectionCard do detalhe — original INTOCADO, compartilhado pelos dois `_components/`); barra CSS-only (regra 2 não disparada — width/flex-1 %, não SVG/chart/`hsl(var())`/`color-mix`; mesma classe do AlinhamentoStrip de #1); `brand→fg-brand` (byte-idêntico pós-#358), `destructive→error`, `surface-elevated→surface-raised`, `foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}` |
| `src/design-system/primitives/button.tsx` | `src/app/rds/proposicoes/_components/button.tsx` | médio | reuso VERBATIM da cópia de #1 (Button do RDS é client, +JS; local diverge em token de marca → cópia local traduzida zero-JS + token-clean); `bg-brand/text-brand→*-fg-brand`, `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API (variantes não usadas): `brand-foreground`, `destructive`/`destructive-foreground` |
| `src/components/ui/empty-state.tsx` | `src/app/rds/proposicoes/_components/empty-state.tsx` | baixo | reuso VERBATIM da cópia de #1 (EmptyState do RDS só no entry raiz client, +JS contra ADR-022 → cópia local traduzida zero-JS); tokens 1:1 (`border-border→line-default`, `bg-surface/50→surface-base/50`, `bg-surface-elevated→surface-raised`, `text-foreground{,-muted}→fg-{primary,tertiary}`) |
| `src/design-system/compositions/filter-chips.tsx` (item `FilterChip`) | `src/app/rds/proposicoes/_components/filter-chip.tsx` | baixo | reuso VERBATIM da cópia de #1 (só o item; wrapper `FilterChips` vem do RDS `/server`); decisão §3.9: item local (Chip do RDS é client +5.759 bytes/rota, chips são `<Link>`, ADR-022); tokens 1:1 (`ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`, `border-brand bg-brand/10 text-brand→*-fg-brand`, `border-border→line-default`, `bg-surface{,-elevated}→surface-{base,raised}`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`); MANTIDO `shadow-glow` (resíduo sem par RDS) |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server`
(API 1:1: kicker/title/description/variant="plain"/align="center");
`StatsGrid` (composição local) → `StatGroup layout="grid" cols={4}` +
`Stat` do `/server` com prop `hint` (API 1:1: value/label/hint —
precedente §3.6/§3.14; borda/dividers do próprio StatGroup). Lógica
preservada do original: normalização de params, cursor (ADR-026 —
`decodeCursor` + `permanentRedirect` 308 em token inválido), "Mostrar
mais" com restantes da primeira página. Client islands importados dos
originais (sem cópia): `ExportCsvLink`, `Combobox`, `DataBadge`, e o
auth/`canExport`.

### Onda HeroSection #3 — `/rds/votacoes` (listagem)

Terceira e ÚLTIMA das 3 listagens — fecha o trio replicando o padrão das
#1 (`/rds/parlamentares`, §3.14) e #2 (`/rds/proposicoes`, §3.15) verbatim
no bump 3.12.0. `button`, `empty-state` e `filter-chip` são reuso VERBATIM
das cópias das listagens #1/#2 (apresentacionais puros, sem href/rota
embutida — só o header de comentário muda); `filtros` e `votacao-card` são
cópias de domínio próprias, traduzidas 1:1. `DataBadge`, `ExportCsvLink`
importados dos ORIGINAIS (client islands / composições mantidas), logo sem
par de drift. Sem Combobox (Ano é `<select>`, não há filtro de alta
cardinalidade como o Tema das proposições); sem busca livre `q`.

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/votacao/filtros.tsx` | `src/app/rds/votacoes/_components/filtros.tsx` | médio | hybrid de filtros: Casa + Resultado via FilterChips Links (URL=state) + "Só nominais" toggle (FilterChip único) + Ano via select nativo em form GET + chips de filtros ativos; `FilterChips` wrapper do RDS `/server` (#162, §3.9); `FilterChip` item local; `Label` do RDS `/server` (server-safe, precedente piloto-6/§3.14); `Button` da cópia local; hrefs/form `action`/links "Limpar" em `/rds/votacoes`; tokens 1:1 pela tabela canônica (`border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `ring-ring→line-focus`, `border-border→line-default`, `bg-surface→surface-base`, `text-foreground{,-muted}→fg-{primary,tertiary}`, `hover:bg-surface→hover:bg-surface-base`); sem extensão de token nova |
| `src/components/votacao/votacao-card.tsx` | `src/app/rds/votacoes/_components/votacao-card.tsx` | baixo | card de listagem (data/casa/órgão + badge aprovada/rejeitada + descrição line-clamp-3 + linha de votos nominais); href do card → `/rds/votacoes/[id]` (perfil migrado na piloto-4); `formatDataBR` da lib preservado; SEM data-viz (regra 2 não disparada — sem SVG/chart/`hsl(var())`/`color-mix`, sem barra); badges traduzidos `bg-success/20 text-success→bg-success/20 text-fg-success` (bg-success utility homônimo, ext. piloto-2) e `bg-destructive/20 text-destructive→bg-error/20 text-fg-error` (ext. piloto-2/3, `destructive→error`); demais tokens 1:1 (`border-border→line-default`, `bg-surface→surface-base`, `hover:border-border-strong→hover:border-line-emphasis`, `hover:bg-surface-elevated→hover:bg-surface-raised`, `ring-ring→line-focus`, `text-foreground{,-muted}→fg-{primary,tertiary}`) |
| `src/design-system/primitives/button.tsx` | `src/app/rds/votacoes/_components/button.tsx` | médio | reuso VERBATIM das cópias de #1/#2 (Button do RDS é client, +JS; local diverge em token de marca → cópia local traduzida zero-JS + token-clean); `bg-brand/text-brand→*-fg-brand`, `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API (variantes não usadas): `brand-foreground`, `destructive`/`destructive-foreground` |
| `src/components/ui/empty-state.tsx` | `src/app/rds/votacoes/_components/empty-state.tsx` | baixo | reuso VERBATIM das cópias de #1/#2 (EmptyState do RDS só no entry raiz client, +JS contra ADR-022 → cópia local traduzida zero-JS); tokens 1:1 (`border-border→line-default`, `bg-surface/50→surface-base/50`, `bg-surface-elevated→surface-raised`, `text-foreground{,-muted}→fg-{primary,tertiary}`) |
| `src/design-system/compositions/filter-chips.tsx` (item `FilterChip`) | `src/app/rds/votacoes/_components/filter-chip.tsx` | baixo | reuso VERBATIM das cópias de #1/#2 (só o item; wrapper `FilterChips` vem do RDS `/server`); decisão §3.9: item local (Chip do RDS é client +5.759 bytes/rota, chips são `<Link>`, ADR-022); tokens 1:1 (`ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`, `border-brand bg-brand/10 text-brand→*-fg-brand`, `border-border→line-default`, `bg-surface{,-elevated}→surface-{base,raised}`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`); MANTIDO `shadow-glow` (resíduo sem par RDS) |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server`
(API 1:1: kicker/title/description/variant="plain"/align="center");
`StatsGrid` (composição local) → `StatGroup layout="grid" cols={4}` +
`Stat` do `/server` com prop `hint` (API 1:1: value/label/hint —
precedente §3.6/§3.14/§3.15; borda/dividers do próprio StatGroup). Lógica
preservada do original: normalização de params, compat `?offset=`
(ADR-028 §4 — `permanentRedirect` 308 strip do param), cursor (ADR-026 —
`decodeCursor` + `permanentRedirect` 308 em token inválido), helper
`formatUltimaVotacaoStat`, descrição narrativa, "Mostrar mais" com
restantes da primeira página. Client islands importados dos originais
(sem cópia): `ExportCsvLink`, `DataBadge`, e o auth/`canExport`.
`alternates` RSS → `/feed/votacoes` produção (é o produto, não navegação
com contraparte `/rds/`).

### Onda HeroSection #4 — `/rds/busca` (busca cruzada)

Quarta rota da onda HeroSection (bump 3.12.0). A `/busca` é uma rota de
**busca cruzada server-rendered** — `<form>` GET (zero-JS) + 3 seções de
resultado (parlamentares/proposições/votações) consumindo os MESMOS 3
cards de listagem já migrados nas ondas #1/#2/#3. Padrão reusado: os
cards são **espelho das traduções das listagens** (mesmos originais,
hrefs → `/rds/`), mantendo `/rds/busca` self-contained com suas próprias
cópias. `DataBadge` (kicker `tone="accent"` do hero) importado do
ORIGINAL (sem par RDS — precedente listagens/perfis), logo sem par de
drift. Sem data-viz (regra 2 não disparada — confirmado no scoping: 3
estados de hero + grid de cards; os únicos elementos CSS-only de
"barra" — AlinhamentoStrip do parlamentar-card, BarraProgresso do
proposicao-card — não chegam a renderizar porque a query de busca não
traz os agregados de alinhamento/tramitação).

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/busca/search-form.tsx` | `src/app/rds/busca/_components/search-form.tsx` | médio | `<form>` GET SERVER-safe (sem `'use client'`; `<search>` landmark + input/Button nativos — zero-JS, ADR-022); form `action` → `/rds/busca`; Button/Input das cópias LOCAIS traduzidas (não os primitivos do original); só `text-foreground-subtle→fg-quaternary` (ícone Search), demais classes layout/Tailwind puro |
| `src/components/parlamentar/parlamentar-card.tsx` | `src/app/rds/busca/_components/parlamentar-card.tsx` | médio | reuso da tradução da listagem #1 (§3.14) — espelho verbatim, exceto header; `FollowButton`/`PartyBadge` dos ORIGINAIS; href do card → `/rds/parlamentares/[id]`; `/busca` não passa `follow` (anônimo, footer-action nunca renderiza); `bg-accent/15`/`bg-accent/60` (AlinhamentoStrip CSS-only) MANTIDO (resíduo data-viz ADR-024) mas inalcançável nesta rota (query sem agregado); demais tokens 1:1 (`border-border{,-strong}→line-{default,emphasis}`, `bg-surface{,-elevated}→surface-{base,raised}`, `ring-ring→line-focus`, `text-foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}`) |
| `src/components/proposicao/proposicao-card.tsx` | `src/app/rds/busca/_components/proposicao-card.tsx` | médio | reuso da tradução da listagem #2 (§3.15) — espelho verbatim, exceto header; href do card → `/rds/proposicoes/[tipo]/[numero]/[ano]`; `BarraProgressoTramitacao` → cópia local (não renderiza em `/busca` — query sem agregado de tramitação); SITUACAO_CLASSES traduzidas (`bg-brand/20 text-brand→bg-fg-brand/20 text-fg-brand`, `text-success→text-fg-success` com `bg-success/N` homônimo, `bg-destructive/20 text-destructive→bg-error/20 text-fg-error`, `bg-surface-elevated text-foreground-muted→bg-surface-raised text-fg-tertiary`); MANTIDO `bg-success text-success-foreground` (badge sólido TRANSFORMADA_EM_NORMA — resíduo on-color, ext. piloto-3); demais tokens 1:1 |
| `src/components/proposicao/barra-progresso-tramitacao.tsx` | `src/app/rds/busca/_components/barra-progresso-tramitacao.tsx` | médio | reuso VERBATIM da tradução da piloto-3 / listagem #2 (mesmo original, INTOCADO, compartilhado pelos `_components/`); barra CSS-only (regra 2 não disparada — width/flex-1 %); dependência de import do proposicao-card (não chega a renderizar em `/busca`); `brand→fg-brand` (byte-idêntico pós-#358), `destructive→error`, `surface-elevated→surface-raised`, `foreground{,-muted,-subtle}→fg-{primary,tertiary,quaternary}` |
| `src/components/votacao/votacao-card.tsx` | `src/app/rds/busca/_components/votacao-card.tsx` | baixo | reuso da tradução da listagem #3 (§3.16) — espelho verbatim, exceto header; href do card → `/rds/votacoes/[id]`; SEM data-viz; badges `bg-success/20 text-success→bg-success/20 text-fg-success` (homônimo, ext. piloto-2) e `bg-destructive/20 text-destructive→bg-error/20 text-fg-error` (ext. piloto-2/3); demais tokens 1:1 |
| `src/design-system/primitives/input.tsx` | `src/app/rds/busca/_components/input.tsx` | médio | primitivo Input (HTML nativo sem state — Server Component, zero-JS); cópia local traduzida (mesma régua do Button local: token-clean + zero-JS vs importar o primitivo do original com tokens BaV); `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `ring-offset-background→ring-offset-surface-canvas`, `file:text-foreground→file:text-fg-primary`, `placeholder:text-foreground-subtle→placeholder:text-fg-quaternary`, `ring-ring→line-focus` |
| `src/design-system/primitives/button.tsx` | `src/app/rds/busca/_components/button.tsx` | médio | reuso VERBATIM das cópias das listagens #1/#2/#3 (Button do RDS é client, +JS; local diverge em token de marca → cópia local traduzida zero-JS + token-clean); `bg-brand/text-brand→*-fg-brand`, `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API (variantes não usadas): `brand-foreground`, `destructive`/`destructive-foreground` |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/busca/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia da piloto-2 (Card compound do RDS); `/busca` usa sem `id` → sem `aria-labelledby` (mesmo contrato do original sem id) |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server`
(API 1:1: kicker/title/description/variant="plain"/align="center";
3 estados de hero — entry / <2 chars / resultados — preservados).
`DataBadge` importado do ORIGINAL (sem par RDS, kicker `tone="accent"`).
Lógica de query (`busca`) e contrato dos 3 estados preservados do
original; callout do match exato de proposição (`border-success/40
bg-success/10`, base homônima ext. piloto-2 em papel border/bg — sem
tradução) com cross-link → `/rds/proposicoes/...` (navegação contida na
staging). Sem `_components/` para o callout (helper inline no `page.tsx`).

### Onda HeroSection #5 — `/rds/comparar` (comparativo lado a lado)

Quinta rota da onda HeroSection (bump 3.12.0) — a penúltima das que
dependiam SÓ do #163 (HeroSection), restando só a home. A `/comparar` é
um comparativo **server-rendered** de 2-3 parlamentares (`HeroSection` +
2 `SectionCard`): grid de métricas (`ParlamentaresGrid`) + matriz de
concordância par-a-par (`ConcordanciaMatrix`). `section-card` é reuso
VERBATIM da cópia da piloto-2 / busca (#4); `concordancia-matrix` e
`parlamentares-grid` são cópias de domínio próprias, traduzidas 1:1.
`DataBadge` (kicker `tone="accent"` do hero) importado do ORIGINAL (sem
par RDS — precedente listagens/perfis/busca), logo sem par de drift.
**Sem data-viz** (regra 2 não disparada — confirmado no scoping e na
nota do scoping recebido: a `ConcordanciaMatrix` é um `<ul>` com os 3
limiares de cor semânticos, MESMO padrão de `AlinhamentoBancada`/
`FidelidadeMediaBlock` já traduzido nas pilotos; sem SVG/chart/
`hsl(var())`/`color-mix`/barra).

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/comparar/parlamentares-grid.tsx` | `src/app/rds/comparar/_components/parlamentares-grid.tsx` | médio | grid 2-3 col (foto + nome/partido + 3 métricas: presença/proposições/gasto CEAP top-3 categorias); `<img>` cru preservado para zero-JS (CLS via width/height, precedente bancada-list/parlamentar-card); `formatBRL` da lib (lógica de domínio única, NÃO duplicada); tokens 1:1 pela tabela canônica (`border-border→line-default`, `bg-surface→surface-base`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `text-foreground-muted→fg-tertiary`); `tracking-wide`/`tabular-nums`/`uppercase`/`truncate` homônimos; sem extensão de token nova |
| `src/components/comparar/concordancia-matrix.tsx` | `src/app/rds/comparar/_components/concordancia-matrix.tsx` | médio | `<ul>` de pares com **3 limiares de cor semânticos** (≥80 success / ≥50 foreground / <50 warning) — mesmo padrão `AlinhamentoBancada`/`FidelidadeMediaBlock`/`fidelidade-media` (piloto-1); lógica de limiares preservada exata; tokens 1:1 (`text-success→text-fg-success`, `text-foreground→fg-primary`, `text-warning→fg-warning`, `text-foreground-muted→fg-tertiary`, `text-foreground-subtle→fg-quaternary`, `border-border→line-default`); regra 2 NÃO disparada (não é data-viz); sem extensão de token nova |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/comparar/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia da piloto-2 / busca (#4) — Card compound do RDS (asSection + Card.Title `as="h2"`); `/comparar` usa sem `id` → sem `aria-labelledby` (mesmo contrato do original sem id; confirmado no curl: 0 `aria-labelledby` dos dois lados, 2 `<h2>` nos níveis corretos) |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server`
(API 1:1: kicker/title/description/variant="plain"/align="center";
diferença de typography do h1 — RDS `text-3xl sm:text-4xl font-bold` vs
local `text-4xl..6xl` — aceita, é a typography do componente adotado,
precedente §3.14 decisão 1). `DataBadge` importado do ORIGINAL (sem par
RDS, kicker `tone="accent"`). Lógica de query
(`getCompararParlamentares`), parse/validação de ids e contrato dos 4
estados de erro preservados do original. `ErrorState` é helper local
reconstruído inline traduzido (`text-warning→text-fg-warning`;
`border-warning/40`/`bg-warning/10` homônimos, base `--warning`/
`--color-warning` idêntica dos dois lados — ext. piloto-2 generalizada
por papel utility, princípio piloto-5); o exemplo de URL no `<code>`
reescrito pra `/rds/comparar` (navegação contida na staging). Sem
`_components/` para o `ErrorState` (helper inline no `page.tsx`,
precedente piloto-1/5/6).

### Onda HeroSection #6 — `/rds/home` (home `/`)

Sexta e ÚLTIMA rota da onda HeroSection (bump 3.12.0) — a rota mais
visível do app e a única da onda com gap adicional além do #163
(`KpiCard`, draft N5). Posicionada em `src/app/rds/home/page.tsx` (a raiz
`/rds/` é o índice de smoke, sem `page.tsx`). `section-card` é reuso
VERBATIM da cópia da piloto-2 / busca #4 / comparar #5; `button` é reuso
VERBATIM das listagens. `kpi-card` é cópia LOCAL (decisão de scoping
aprovada pelo owner — opção A: o `Stat`/`StatGroup` do RDS não tem slot
para o `floatingBadge` e renderiza strip dividido em vez de card elevado;
ver §3.19 CP1). `card` (primitivo shadcn-style), `card-parlamentares`,
`card-votacoes-semana` e `features-grid` são cópias de domínio próprias.
`DataBadge`, `TrustBadge` importados dos ORIGINAIS (kicker/meta + selo de
procedência — client island / sem par RDS), logo sem par de drift.

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/design-system/compositions/kpi-card.tsx` | `src/app/rds/home/_components/kpi-card.tsx` | médio | **MANTIDA LOCAL (não adotada do RDS)** — decisão de scoping aprovada (opção A, §3.19 CP1): o `Stat`/`StatGroup` do `/server` cobre `icon`/`value`/`label`/`hint`/`align="center"` 1:1 mas NÃO tem slot equivalente ao `floatingBadge` (TrustBadge L1 sobreposto à borda — sinal de procedência global dos KPIs) e renderiza "strip dividido" (`bg-surface-base` + dividers 1px) em vez de "card elevado com gutters" (`bg-surface-raised`, sem dividers). Adotá-lo perderia o selo L1 + mudaria o visual da rota mais visível (regressão de produto). Mesma régua de apresentacional local quando o RDS não cobre a API (EmptyState/Button/DataBadge). Server Component puro sem hooks → zero-JS (ADR-022). **Candidato a issue upstream futura** (Stat com badge slot de procedência) — NÃO aberta agora (não bloqueia). Tradução 1:1: `border-border→line-default`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `text-foreground-muted→fg-tertiary`; `floatingBadge`/gutters/type scale preservados idênticos; sem extensão de token nova |
| `src/design-system/primitives/card.tsx` | `src/app/rds/home/_components/card.tsx` | médio | primitivo Card shadcn-style (`CardHeader`/`CardContent`/`CardFooter`/`CardTitle`/`CardDescription`) — o Card compound do RDS (`Card.Header`/`Card.Title`/`Card.Body`) NÃO cobre essa API (sem `CardContent`/`CardFooter`/`CardDescription`; os cards de entrada usam layout flex-col + footer ancorado via `CardContent flex-1` + `CardFooter`); adotar exigiria reescrever a estrutura — mudança estrutural, não tradução. Cópia local server-safe (forwardRef divs, sem hooks → zero-JS). Tokens 1:1: `bg-surface→surface-base`, `text-foreground→fg-primary`, `border-border→line-default`, `text-foreground-muted→fg-tertiary`; sem extensão de token nova |
| `src/components/home/card-parlamentares.tsx` | `src/app/rds/home/_components/card-parlamentares.tsx` | baixo | card de entrada (ícone + título + descrição + link "Explorar"); Card primitive → cópia local `./card`; href → `/rds/parlamentares` (listagem migrada #1); tokens 1:1: `border-border-strong→line-emphasis`, `bg-surface-elevated→surface-raised`, `text-brand→text-fg-brand` (byte-idêntico pós-#358), `ring-ring→line-focus`; sem extensão de token nova |
| `src/components/home/card-votacoes-semana.tsx` | `src/app/rds/home/_components/card-votacoes-semana.tsx` | médio | card de entrada (votações recentes, fallback 7d→30d via prop diasJanela); Card primitive → cópia local `./card`; `formatDataBR` da lib preservado; hrefs → `/rds/votacoes/[id]` (perfil migrado piloto-4) + `/rds/votacoes` (listagem #3); badges `bg-success/20 text-success→bg-success/20 text-fg-success` (homônimo ext. piloto-2 + `text-success→fg-success`) e `bg-destructive/20 text-destructive→bg-error/20 text-fg-error` (ext. piloto-2/3); demais tokens 1:1: `bg-surface-elevated→surface-raised`, `text-brand→fg-brand`, `border-border→line-default`, `text-foreground{,-muted}→fg-{primary,tertiary}`, `ring-ring→line-focus`; sem extensão de token nova |
| `src/components/home/features-grid.tsx` | `src/app/rds/home/_components/features-grid.tsx` | baixo | grid de 6 value props (apresentacional puro, Server Component, sem href); tokens 1:1: `border-border{,-strong}→line-{default,emphasis}`, `bg-surface→surface-base`, `bg-surface-elevated→surface-raised`, `bg-brand/10 text-brand→bg-fg-brand/10 text-fg-brand` (base brand byte-idêntica pós-#358, opacidade aritmética — generalização piloto-5), `text-foreground{,-muted}→fg-{primary,tertiary}`; sem extensão de token nova |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/home/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia da piloto-2 / busca #4 / comparar #5 (Card compound do RDS — asSection + `aria-labelledby` + Card.Title/Subtitle/Body); a home usa com `id="piramide-confianca"` → renderiza `aria-labelledby="piramide-confianca-title"` (confirmado no curl, idêntico ao original; âncora `#piramide-confianca` do link do TrustBadge preservada) |
| `src/design-system/primitives/button.tsx` | `src/app/rds/home/_components/button.tsx` | médio | reuso VERBATIM das cópias das listagens #1/#2/#3 e /busca/comparar (Button do RDS é client, +JS; local diverge em token de marca → cópia local zero-JS + token-clean); usos na home: CTA default (asChild → Link) + `variant="ghost"`; tokens 1:1: `bg-brand/text-brand→*-fg-brand`, `border-border-strong→line-emphasis`, `bg-background→surface-canvas`, `bg-surface-elevated→surface-raised`, `text-foreground→fg-primary`, `ring-ring→line-focus`, `ring-offset-background→offset-surface-canvas`; MANTIDOS por paridade de API (variantes não usadas na home): `brand-foreground`, `destructive`/`destructive-foreground` |

Composições substituídas por upstream SEM cópia (direto no `page.tsx`):
`HeroSection` (composição local) → `HeroSection` do `/server` (API 1:1:
kicker/title/description/actions/kpis/meta/variant="plain"/align="center";
o slot `kpis` é opaco e recebe o `KpiCard` local; diferença de typography
do h1 — RDS `text-3xl sm:text-4xl font-bold` vs local `text-4xl..6xl` —
aceita, typography do componente adotado, precedente §3.14 decisão 1).
`DataBadge` (kicker `tone="accent"` + 3 meta pills) e `TrustBadge` (selo
L1 floating no KpiCard + 4 da pirâmide de confiança) importados dos
ORIGINAIS (client island de domínio / sem par RDS — precedente
listagens/perfis/busca/comparar); seus tokens BaV internos calibram na
promoção. Lógica preservada do original: `dynamic = 'force-dynamic'`,
queries `getPublicStats`/`getVotacoesRecentes` + fallback honesto 7d→30d,
`trustExamples`. Cross-links a rotas NÃO migradas apontam pra produção
(classe conhecida): `/docs/piramide-de-confianca` (docs, sem contraparte
`/rds/`) e `/#piramide-confianca` (link interno do TrustBadge island,
âncora da home de produção). `formatNumeroAbreviado` da lib (lógica de
domínio única, NÃO duplicada).

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
