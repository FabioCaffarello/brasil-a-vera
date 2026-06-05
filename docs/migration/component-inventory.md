# Inventário de componentes UI — brasil-a-vera

> Data: 2026-06-05 · Branch: `docs/component-inventory` · Read-only
>
> Escopo: `.tsx` em `src/components/**`, `src/design-system/**` e
> `src/app/**` (exceto arquivos de rota e `api/`). Testes (`*.test.tsx`,
> `*.spec.tsx`, `__tests__/`, `__mocks__/`) excluídos.
>
> Arquivos varridos: **118**. Componentes únicos catalogados (entradas de
> export individuais): **133**.
>
> Convenção de contagem de uso: o arquivo de **definição** não é contado
> entre os "arquivos usando" nem entre os "call sites". `*.test.tsx`
> também já estava fora do índice.

## Resumo

- **Total de componentes catalogados:** 133 (somando cada export
  separadamente quando um arquivo exporta mais de um componente — vários
  primitivos shadcn fazem isso, em particular Dialog/Card/Tabs/Command/
  Accordion).
- **Server vs Client:**
  - Server Components: 80
  - Client Components (`"use client"` no topo): 53
- **Apresentacionais vs Interativos:**
  - Apresentacionais (sem hooks, sem handlers funcionais com argumento): 91
  - Interativos (qualquer hook React ou handler que altera state/disparo
    de fetch/router): 42
- **Por área:**
  - `src/design-system/primitives`: 41 exports (em 13 arquivos)
  - `src/design-system/compositions`: 11 exports (em 10 arquivos)
  - `src/components/busca`: 1
  - `src/components/charts`: 0 (apenas re-exports, sem componente próprio
    — `recharts-bundle.tsx` é "barrel" de chunk compartilhado)
  - `src/components/comparar`: 2
  - `src/components/home`: 3
  - `src/components/painel`: 28
  - `src/components/parlamentar`: 13
  - `src/components/partido`: 5
  - `src/components/proposicao`: 14
  - `src/components/site`: 7
  - `src/components/trust` + `trust-banner.tsx`: 2
  - `src/components/ui`: 1
  - `src/components/votacao`: 16 (incluindo `charts/`)
  - `src/components/export-csv-link.tsx`: 1
  - `src/app/dev/design/_components`: 1
  - `src/app/docs/_components`: 8 (Section/P/Ul/Li/InternalLink/
    ExternalLink/DocsHeader/SidebarNav)
- **Top 10 mais usados (por call sites, excluindo o próprio arquivo de
  definição):**
  1. `Button` — 72 sites em 28 arquivos
  2. `DataBadge` — 45 sites em 12 arquivos
  3. `Section` (helper `/docs`) — 42 sites em 8 arquivos
  4. `FilterChip` — 40 sites em 9 arquivos
  5. `Li` (helper `/docs`) — 32 sites em 4 arquivos
  6. `P` (helper `/docs`) — 29 sites em 5 arquivos
  7. `SectionCard` — 28 sites em 8 arquivos
  8. `Skeleton` — 24 sites em 4 arquivos
  9. `PartyBadge` — 24 sites em 4 arquivos
  10. `FilterChips` — 18 sites em 9 arquivos

## Tabela-resumo

> Ordem decrescente por call sites. Tipo: `apres.` (apresentacional) vs
> `inter.` (interativo). S/C: server vs client. "DS" = `cn` + Tailwind
> tokens semânticos (`bg-brand`, `bg-surface*`, `text-foreground*`,
> `bg-success`, etc). "CVA" indica uso de `class-variance-authority`.

| Componente | Caminho | Tipo | S/C | Arquivos | Sites | Stack |
| --- | --- | --- | --- | ---: | ---: | --- |
| `Button` | design-system/primitives/button.tsx | apres. | server | 28 | 72 | CVA + DS |
| `DataBadge` | design-system/compositions/data-badge.tsx | apres. | server | 12 | 45 | DS (mapa tone) |
| `Section` (docs) | app/docs/\_components/typography.tsx | apres. | server | 8 | 42 | DS |
| `FilterChip` | design-system/compositions/filter-chips.tsx | apres. | server | 9 | 40 | DS (Slot) |
| `Li` (docs) | app/docs/\_components/typography.tsx | apres. | server | 4 | 32 | DS |
| `P` (docs) | app/docs/\_components/typography.tsx | apres. | server | 5 | 29 | DS |
| `SectionCard` | design-system/compositions/section-card.tsx | apres. | server | 8 | 28 | DS |
| `Skeleton` | design-system/primitives/skeleton.tsx | apres. | server | 4 | 24 | DS (animate-pulse) |
| `PartyBadge` | design-system/compositions/party-badge.tsx | apres. | server | 4 | 24 | Tailwind (cores `bg-{cor}/15` hardcoded por sigla) |
| `FilterChips` | design-system/compositions/filter-chips.tsx | apres. | server | 9 | 18 | DS |
| `AccordionItem/Trigger/Content` | design-system/primitives/accordion.tsx | inter. | client | 3 | 16 (cada) | DS + Radix |
| `Label` | design-system/primitives/label.tsx | apres. | client | 5 | 15 | CVA + DS + Radix |
| `HeroSection` | design-system/compositions/hero-section.tsx | apres. | server | 7 | 14 | DS + classes `bg-hero`/`grid-bg`/`hero-glow*` |
| `Ul` (docs) | app/docs/\_components/typography.tsx | apres. | server | 4 | 13 | DS |
| `TrustBadge` | components/trust/trust-badge.tsx | inter. | client | 10 | 12 | Tailwind tokens + tooltip custom |
| `Separator` | design-system/primitives/separator.tsx | apres. | client | 1 | 10 | DS + Radix |
| `ExternalLink` (docs) | app/docs/\_components/typography.tsx | apres. | server | 5 | 10 | DS |
| `KpiStrip` | design-system/compositions/kpi-strip.tsx | apres. | server | 7 | 9 | DS (tone hint) |
| `DialogContent` | design-system/primitives/dialog.tsx | apres. | client | 8 | 8 | DS + Radix |
| `Dialog` | design-system/primitives/dialog.tsx | inter. | client | 7 | 8 | Radix |
| `Swatch` | app/dev/design/\_components/swatch.tsx | apres. | server | 1 | 8 | DS (showroom) |
| `Card` / `CardContent` | design-system/primitives/card.tsx | apres. | server | 3 | 7 | DS |
| `KpiCard` | design-system/compositions/kpi-card.tsx | apres. | server | 3 | 7 | DS |
| `ParlamentarCard` | components/parlamentar/parlamentar-card.tsx | apres. | server | 7 | 7 | DS + Link |
| `Badge` | design-system/primitives/badge.tsx | apres. | server | 1 | 6 | CVA + DS |
| `DialogTitle/Header/Description` | design-system/primitives/dialog.tsx | apres. | client | 6 | 6 (cada) | DS + Radix |
| `ExportCsvLink` | components/export-csv-link.tsx | apres. | server | 5 | 6 | Button + lucide |
| `ConsentGate` | components/painel/consent-gate/consent-gate.tsx | inter. | server | 5 | 6 | Auth + DB (RSC async) |
| `CardFooter` | design-system/primitives/card.tsx | apres. | server | 4 | 5 | DS |
| `Input` | design-system/primitives/input.tsx | apres. | server | 3 | 5 | DS |
| `SectionNav` | design-system/compositions/section-nav.tsx | inter. | client | 4 | 5 | IntersectionObserver |
| `StatsGrid` | design-system/compositions/stats-grid.tsx | apres. | server | 4 | 5 | DS |
| `SearchForm` | components/busca/search-form.tsx | apres. | server | 3 | 5 | DS + form GET |
| `AuthSlot` | components/site/auth-slot.tsx | inter. | server | 4 | 5 | Clerk auth() RSC |
| `DocsHeader` (docs) | app/docs/\_components/typography.tsx | apres. | server | 5 | 5 | DS |
| `CardHeader/Title` | design-system/primitives/card.tsx | apres. | server | 3 | 4 (cada) | DS |
| `DialogTrigger` | design-system/primitives/dialog.tsx | apres. | client | 4 | 4 | Radix |
| `Combobox` | design-system/compositions/combobox.tsx | inter. | client | 2 | 4 | Command + Popover |
| `AuthIslandLoader` | components/site/auth-island-loader.tsx | inter. | client | 3 | 4 | `next/dynamic` |
| `ActiveSlotPicker` | components/painel/active-slot-picker.tsx | inter. | client | 2 | 4 | `useSearchParams` |
| `CardDescription` | design-system/primitives/card.tsx | apres. | server | 2 | 3 | DS |
| `TabsTrigger/Content` | design-system/primitives/tabs.tsx | apres. | client | 1 | 3 | DS + Radix |
| `Accordion` (Root) | design-system/primitives/accordion.tsx | inter. | client | 3 | 3 | Radix |
| `EmptyState` | components/ui/empty-state.tsx | apres. | server | 3 | 3 | DS |
| `BarraProgressoTramitacao` | components/proposicao/barra-progresso-tramitacao.tsx | apres. | server | 2 | 3 | DS (5 marcos) |
| `NavMobile` | components/site/nav-mobile.tsx | inter. | client | 2 | 3 | DS + drawer |
| `Navbar` | components/site/navbar.tsx | inter. | server | 2 | 3 | RSC async + auth() |
| `ItemRecebido` | components/painel/alertas/item-recebido.tsx | inter. | client | 2 | 3 | `<details>` + fetch |
| `CommandItem` | design-system/primitives/command.tsx | apres. | client | 1 | 2 | cmdk + DS |
| `Toaster` | design-system/primitives/sonner.tsx | apres. | client | 2 | 2 | sonner |
| `ProposicaoCard` | components/proposicao/proposicao-card.tsx | apres. | server | 2 | 2 | DS + Link |
| `VotacaoCard` | components/votacao/votacao-card.tsx | apres. | server | 2 | 2 | DS + Link |
| `GastosResumoBlock` | components/parlamentar/gastos-resumo.tsx | apres. | server | 1 | 2 | DS |
| `ApoioPartidoChart` | components/proposicao/apoio-partido-chart.tsx | apres. | client | 1 | 2 | Recharts |
| `Top5Afinidade` | components/parlamentar/afinidade-voto.tsx | apres. | server | 1 | 2 | DS |
| `AlinhamentoBancada` | components/parlamentar/alinhamento.tsx | apres. | server | 1 | 2 | DS (3 limiares de cor) |
| `VotosResumo` | components/votacao/votos-resumo.tsx | apres. | server | 1 | 2 | DS |
| `VotosPorPartido` | components/votacao/votos-por-partido.tsx | apres. | server | 1 | 2 | DS (tabela) |
| `VotosIndividuais` | components/votacao/votos-individuais.tsx | inter. | client | 1 | 2 | `useSearchParams` + `useMemo` |
| `MargemDecisaoBar` | components/votacao/margem-decisao.tsx | apres. | server | 1 | 2 | DS (flex %) |
| `RebeldesList` | components/votacao/rebeldes-list.tsx | apres. | server | 1 | 2 | DS |
| `ProposicaoVinculada` | components/votacao/proposicao-vinculada.tsx | apres. | server | 1 | 2 | DS + Link |
| `AutoresList` | components/proposicao/autores-list.tsx | apres. | server | 1 | 2 | DS + PartyBadge |
| `TemasList` | components/proposicao/temas-list.tsx | apres. | server | 1 | 2 | DS |
| `TramitacaoTimeline` | components/proposicao/tramitacao-timeline.tsx | apres. | server | 1 | 2 | DS + FilterChips |
| `VotacoesVinculadas` | components/proposicao/votacoes-vinculadas.tsx | apres. | server | 1 | 2 | DS + FilterChips |
| `VotosConsolidadosChart` (prop) | components/proposicao/votos-consolidados-chart.tsx | apres. | client | 1 | 2 | Recharts |
| `VotacaoVotosConsolidadosChart` | components/votacao/charts/votos-consolidados-chart.tsx | apres. | client | 1 | 2 | Recharts |
| `VotacaoPorPartidoChart` | components/votacao/charts/por-partido-chart.tsx | apres. | client | 1 | 2 | Recharts |
| `DisciplinaPartidariaChart` | components/votacao/charts/disciplina-chart.tsx | apres. | client | 1 | 2 | Recharts |
| `ConsentModal` | components/painel/consent-gate/consent-modal.tsx | inter. | client | 1 | 2 | Radix Dialog direto + Clerk |
| `DialogFooter/Close` | design-system/primitives/dialog.tsx | apres. | client | 1 | 1 | Radix |
| `Tabs/TabsList` | design-system/primitives/tabs.tsx | apres./inter. | client | 1 | 1 | Radix |
| `Popover/PopoverContent/PopoverTrigger` | design-system/primitives/popover.tsx | apres./inter. | client | 1 | 1 | Radix |
| `Command/Input/List/Group/Empty` | design-system/primitives/command.tsx | apres./inter. | client | 1 | 1 | cmdk |
| `CardParlamentares` | components/home/card-parlamentares.tsx | apres. | server | 1 | 1 | DS + Card |
| `CardVotacoesSemana` | components/home/card-votacoes-semana.tsx | apres. | server | 1 | 1 | DS + Card |
| `FeaturesGrid` | components/home/features-grid.tsx | apres. | server | 1 | 1 | DS + lucide |
| `PerfilHeader` | components/parlamentar/perfil-header.tsx | apres. | server | 1 | 1 | DS + DataBadge + PartyBadge |
| `PerfilProposicaoHeader` | components/proposicao/perfil-header.tsx | apres. | server | 1 | 1 | DS + TrustBadge |
| `PerfilVotacaoHeader` | components/votacao/perfil-header.tsx | apres. | server | 1 | 1 | DS + DataBadge |
| `CompartilharButton` (parlamentar) | components/parlamentar/compartilhar-button.tsx | inter. | client | 1 | 1 | Dialog + clipboard API |
| `CompartilharProposicaoButton` | components/proposicao/compartilhar-button.tsx | inter. | client | 1 | 1 | Dialog + clipboard |
| `CompartilharVotacaoButton` | components/votacao/compartilhar-button.tsx | inter. | client | 1 | 1 | Dialog + clipboard |
| `FollowButton` | components/parlamentar/follow-button.tsx | inter. | client | 1 | 1 | `useState` + fetch otimista |
| `GastosChart` | components/parlamentar/gastos-chart.tsx | apres. | client | 1 | 1 | Recharts |
| `FidelidadeMediaBlock` | components/partido/fidelidade-media.tsx | apres. | server | 1 | 1 | DS (3 limiares) |
| `GastoBancadaBlock` | components/partido/gasto-bancada.tsx | apres. | server | 1 | 1 | DS |
| `PartidoHeader` | components/partido/header.tsx | apres. | server | 1 | 1 | DS |
| `TopTemasPartido` | components/partido/top-temas.tsx | apres. | server | 1 | 1 | DS |
| `VotacoesRelacionadasFooter` | components/votacao/footer-relacionadas.tsx | apres. | server | 1 | 1 | DS + tag colorida |
| `FooterCrossLinks` | components/proposicao/footer-cross-links.tsx | apres. | server | 1 | 1 | DS |
| `ConcordanciaMatrix` | components/comparar/concordancia-matrix.tsx | apres. | server | 1 | 1 | DS (3 limiares) |
| `ParlamentaresGrid` | components/comparar/parlamentares-grid.tsx | apres. | server | 1 | 1 | DS + inline `<img>` |
| `AuthIsland` | components/site/auth-island.tsx | inter. | client | 1 | 1 | Clerk Show + dynamic UserButton |
| `Footer` | components/site/footer.tsx | apres. | server | 1 | 1 | DS + bg-gradient-primary |
| `NavLinks` | components/site/nav-links.tsx | inter. | client | 1 | 1 | `usePathname` |
| `OnboardingWizard` | components/painel/onboarding-wizard.tsx | inter. | client | 1 | 1 | Dialog + multi-step |
| `PainelHeader` | components/painel/painel-header.tsx | apres. | server | 1 | 1 | DS + bg-gradient-primary |
| `TabBar` | components/painel/tab-bar.tsx | inter. | client | 1 | 1 | `useSearchParams` + Link |
| `EstadoMaduro` | components/painel/estado-maduro.tsx | apres. | server (async) | 1 | 1 | DS + KpiStrip |
| `EstadoNovo` | components/painel/estado-novo.tsx | apres. | server (async) | 1 | 1 | DS + Button |
| `EstadoOnboarding` | components/painel/estado-onboarding.tsx | apres. | server (async) | 1 | 1 | DS + KpiStrip |
| `FormPoliticas` | components/painel/alertas/form-politicas.tsx | inter. | client | 1 | 1 | `useTransition` + fetch |
| `FormPerfil` | components/painel/configuracoes/form-perfil.tsx | inter. | client | 1 | 1 | `useTransition` |
| `ComunicacaoToggles` | components/painel/configuracoes/comunicacao-toggles.tsx | inter. | client | 1 | 1 | `useTransition` |
| `TemasChips` | components/painel/configuracoes/temas-chips.tsx | inter. | client | 1 | 1 | `useTransition` |
| `AcoesLgpd` | components/painel/meus-dados/acoes-lgpd.tsx | inter. | client | 1 | 1 | Radix Dialog + Clerk signOut |
| `MigracaoLocalStorageModal` | components/painel/migracao-localstorage/modal.tsx | inter. | client | 1 | 1 | Radix Dialog + LS + Zod |
| `BannerMudancaUf` | components/painel/parlamentares/banner-mudanca-uf.tsx | inter. | client | 1 | 1 | `useState` |
| `FormUfInline` | components/painel/parlamentares/form-uf-inline.tsx | inter. | client | 1 | 1 | `useTransition` |
| `ListaAcompanhando` | components/painel/parlamentares/lista-acompanhando.tsx | apres. | server | 1 | 1 | DS + ParlamentarCard |
| `ListaDaMinhaUf` | components/painel/parlamentares/lista-da-minha-uf.tsx | apres. | server (async) | 1 | 1 | DS |
| `ModalRevisarUfAntiga` | components/painel/parlamentares/modal-revisar-uf-antiga.tsx | inter. | client | 1 | 1 | Dialog DS + checkboxes |
| `SubTabs` (parlamentares) | components/painel/parlamentares/sub-tabs.tsx | apres. | client | 1 | 1 | DS + Link |
| `SubTabs` (alertas) | components/painel/alertas/sub-tabs.tsx | apres. | client | 1 | 1 | DS + Link |
| `ListaRecebidos` | components/painel/alertas/lista-recebidos.tsx | apres. | server | 1 | 1 | DS + markdown server-rendered |
| `SidebarNav` (docs) | app/docs/\_components/sidebar-nav.tsx | inter. | client | 1 | 1 | `usePathname` |
| `InternalLink` (docs) | app/docs/\_components/typography.tsx | apres. | server | 1 | 1 | DS |
| `Sparkline12m` (parlamentar/alinhamento) | components/parlamentar/alinhamento.tsx | apres. | server | — | — | inline SVG (componente interno do mesmo arquivo) |
| `TrustBanner` | components/trust-banner.tsx | apres. | server | 0 | 0 | DS — **órfão** |
| `VotacaoHemicicloChart` | components/votacao/charts/hemiciclo.tsx | apres. | server | 1 | 1 | SVG manual (componente exporta como `VotacaoHemicicloChart`, não `Hemiciclo`) |
| `DialogPortal/Overlay` | design-system/primitives/dialog.tsx | apres. | client | 0 | 0 | Radix re-export (não consumido fora) |
| `CommandDialog/Separator/Shortcut` | design-system/primitives/command.tsx | apres. | client | 0 | 0 | cmdk re-export (não consumido) |

## Detalhe por área

### src/design-system/primitives

Camada base, copiada do shadcn/ui via `add-primitive` skill (ADR-021).
Todos os arquivos têm comentário de cabeçalho documentando: data de
adoção, mapping shadcn→token, justificativas. Padrão de estilo: classes
Tailwind v4 com tokens semânticos (`bg-brand`, `bg-surface-elevated`,
`text-foreground-muted`, `bg-destructive`, `bg-success`, `bg-warning`,
`ring-ring`, `border-border`, `border-border-strong`). `cn()` em
`@/lib/cn`. Variantes via `cva()` quando há matriz de variants.

#### Button (`button.tsx`)
- **Tipo:** apresentacional
- **Server/Client:** server (sem `'use client'`; sem hooks — `forwardRef`
  é safe em RSC para componentes que apenas reembalam `<button>`)
- **Props:** `variant?: 'default' | 'destructive' | 'outline' |
  'secondary' | 'ghost' | 'link'`; `size?: 'default' | 'sm' | 'lg' |
  'icon'`; `asChild?: boolean` (Radix Slot); herda `ButtonHTMLAttributes`.
- **Variantes:** 6 visuais × 4 sizes = 24 combinações.
- **Usos:** 28 arquivos, 72 sites — **componente mais usado do
  codebase**.
- **Estilo:** CVA com tokens `bg-brand`, `bg-destructive`,
  `border-border-strong`, `bg-surface-elevated`, `ring-ring`. Nenhum HEX
  inline.

#### Badge (`badge.tsx`)
- **Tipo:** apresentacional · **S/C:** server
- **Props:** `variant?: 'default' | 'secondary' | 'destructive' |
  'outline'`; herda `HTMLAttributes<HTMLDivElement>`.
- **Variantes:** 4.
- **Usos:** 1 arquivo, 6 sites. Note que `Badge` (do DS) é
  intencionalmente distinto de `TrustBadge` (domínio) e de `DataBadge`
  (composição); a observação geral comenta o caso.
- **Estilo:** CVA + DS tokens.

#### Card (5 sub-componentes: `Card`, `CardHeader`, `CardTitle`,
  `CardDescription`, `CardContent`, `CardFooter`) (`card.tsx`)
- **Tipo:** apresentacional · **S/C:** server
- **Props:** herda `HTMLAttributes<HTMLDivElement>`.
- **Variantes:** —
- **Usos:** `Card` 3/7, `CardHeader` 3/4, `CardTitle` 3/4,
  `CardDescription` 2/3, `CardContent` 3/7, `CardFooter` 4/5.
- **Estilo:** DS (`bg-surface`, `text-foreground`, `border-border`).

#### Input (`input.tsx`)
- **Tipo:** apresentacional · **S/C:** server (input nativo, sem state).
- **Props:** herda `React.ComponentProps<'input'>`.
- **Variantes:** —
- **Usos:** 3/5.
- **Estilo:** DS (`border-border-strong`, `bg-background`,
  `placeholder:text-foreground-subtle`).

#### Label (`label.tsx`)
- **Tipo:** apresentacional · **S/C:** client (Radix Label exige
  `'use client'` — hooks internos de associação `htmlFor`).
- **Props:** herda Radix Label + `VariantProps<typeof labelVariants>`
  (sem variants efetivas; placeholder para futuro).
- **Variantes:** — (CVA vazia preparada).
- **Usos:** 5/15.
- **Estilo:** Tailwind base `text-sm font-medium`, sem token semântico de
  cor (herda do consumer).

#### Separator (`separator.tsx`)
- **Tipo:** apresentacional · **S/C:** client (Radix `orientation`/
  `decorative`).
- **Props:** Radix Separator (`orientation?`, `decorative?`).
- **Variantes:** orientação horizontal | vertical.
- **Usos:** 1/10 (todos no mesmo arquivo de docs).
- **Estilo:** DS `bg-border`.

#### Skeleton (`skeleton.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `HTMLAttributes<HTMLDivElement>`.
- **Variantes:** —
- **Usos:** 4/24.
- **Estilo:** DS `bg-surface-elevated animate-pulse`.

#### Dialog (10 sub-componentes) (`dialog.tsx`)
- **Tipo:** Dialog/Trigger/Close/Portal/Overlay/Title/Description são
  interativos (Radix Root); Header/Footer/Content são wrappers
  apresentacionais.
- **S/C:** client (`'use client'`).
- **Props:** Radix Dialog primitives + className.
- **Variantes:** —
- **Usos:** `Dialog` 7/8; `DialogContent` 8/8; `DialogTitle/Header/
  Description` 6/6 cada; `DialogTrigger` 4/4; `DialogFooter/Close` 1/1;
  `DialogPortal/Overlay` **0/0** (re-exports inativos).
- **Estilo:** DS `border-border`, `bg-background`, `text-foreground-muted`,
  `bg-surface-elevated`. Animações `data-[state=...]:animate-in` no-op
  (tw-animate-css não instalado — registrado no header do arquivo).

#### Tabs (4 sub-componentes) (`tabs.tsx`)
- **Tipo:** apresentacional (lista/conteúdo) · interativo (root).
- **S/C:** client.
- **Props:** Radix Tabs primitives.
- **Variantes:** —
- **Usos:** Apenas 1 arquivo consumidor (`Tabs` 1/1, `TabsList` 1/1,
  `TabsTrigger` 1/3, `TabsContent` 1/3) — uso muito localizado vs
  `<TabBar>` próprio do painel.
- **Estilo:** DS `bg-surface-elevated`, `data-[state=active]:bg-background`.

#### Popover (`popover.tsx`)
- **Tipo:** apresentacional (content) · interativo (trigger via Radix).
- **S/C:** client.
- **Usos:** 1/1 cada (`Popover`, `PopoverContent`, `PopoverTrigger`). O
  único consumidor é o próprio `Combobox`.
- **Estilo:** DS `bg-surface-elevated`, `border-border`.

#### Command (9 sub-componentes) (`command.tsx`)
- **Tipo:** wrappers cmdk; `CommandItem`/`Input` interativos via cmdk.
- **S/C:** client.
- **Usos:** `Command` 1/1, `CommandInput` 1/1, `CommandList` 1/1,
  `CommandEmpty` 1/1, `CommandGroup` 1/1, `CommandItem` 1/2. **Não
  consumidos:** `CommandDialog`, `CommandSeparator`, `CommandShortcut`.
- **Estilo:** DS `bg-surface-elevated`, `data-[selected=true]:bg-surface`.

#### Accordion (4 sub-componentes) (`accordion.tsx`)
- **Tipo:** interativo (Root) · apresentacional (Item/Trigger/Content).
- **S/C:** client.
- **Usos:** Root 3/3; Item/Trigger/Content 3/16 cada. Consumer principal:
  perfis dos detalhes (parlamentar/proposicao/votacao) — wrap de
  SectionCards no mobile.
- **Estilo:** DS `border-border`, `text-foreground`,
  `text-foreground-muted`, ícone `ChevronDown` lucide.

#### Toaster / sonner.tsx
- **Tipo:** apresentacional · **S/C:** client.
- **Props:** herda `ComponentProps<typeof Sonner>`.
- **Variantes:** —
- **Usos:** 2/2.
- **Estilo:** classes Sonner `group-[.toaster]:bg-background`,
  `group-[.toaster]:border-border`; ícones lucide
  (CircleCheck/Info/TriangleAlert/OctagonX/LoaderCircle). **`theme="dark"`
  hardcoded** (sem `next-themes`).

### src/design-system/compositions

Composições de domínio-agnóstico construídas sobre primitivas. Todas
documentadas em cabeçalho com data, intenção e como difere de
componentes adjacentes.

#### HeroSection (`hero-section.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `kicker?: ReactNode`; `title: ReactNode`; `description?`;
  `actions?`; `kpis?`; `meta?`; `variant?: 'plain' | 'gradient' |
  'gradient-glow'`; `align?: 'start' | 'center'`; `className?`.
- **Variantes:** 3 visuais × 2 alinhamentos.
- **Usos:** 7/14.
- **Estilo:** DS + classes especiais `bg-hero`, `grid-bg`, `hero-glow*`,
  `text-gradient`, `hero-stagger` definidas em `globals.css §5/5b`. Sem
  framer-motion (ADR-023).
- **Observações:** doc do arquivo deixa claro que variantes gradient são
  **vedadas em rotas de produto sem novo ADR**.

#### KpiCard (`kpi-card.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `items: KpiCardItem[]` (cada item: `icon?`, `label`,
  `value`, `hint?`); `aria-label?`; `floatingBadge?`; `className?`.
- **Variantes:** — (visual fixo, opcional floatingBadge muda padding).
- **Usos:** 3/7.
- **Estilo:** DS (`bg-surface-elevated`, `text-foreground`).
- **Observações:** `role="list"` redundante intencional (Tailwind v4
  preflight + Safari/VoiceOver).

#### KpiStrip (`kpi-strip.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `items: KpiItem[]` (cada item: `icon?`, `label`, `value`,
  `hint?`, `tone?: 'default'|'success'|'warning'|'destructive'|
  'muted'`); `className?`.
- **Variantes:** 5 tones para o hint.
- **Usos:** 7/9.
- **Estilo:** DS, `divide-border`, `bg-surface`. Cap responsivo em 4
  colunas.

#### SectionCard (`section-card.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `title: ReactNode`; `subtitle?`; `icon?`; `badge?`;
  `children`; `id?`; `className?`.
- **Variantes:** —
- **Usos:** 8/28.
- **Estilo:** DS `bg-surface`, `border-border`, `text-foreground`.

#### SectionNav (`section-nav.tsx`)
- **Tipo:** interativo · **S/C:** client (IntersectionObserver).
- **Props:** `items: SectionNavItem[]`; `stickyTop?: string` (CSS value);
  `className?`.
- **Variantes:** —
- **Usos:** 4/5.
- **Estilo:** DS `bg-background/80 backdrop-blur`, active
  `bg-brand/10 text-brand`. Hook custom de scrollspy.

#### DataBadge (`data-badge.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `label: ReactNode`; `source?`; `icon?`; `tone?: 'default' |
  'success' | 'warning' | 'destructive' | 'accent' | 'brand'`;
  `className?`.
- **Variantes:** 6 tones (mapa `TONE_VARIANTS` local).
- **Usos:** 12/45 — **2º componente mais usado**.
- **Estilo:** DS `border-{tone}/40 bg-{tone}/10 text-{tone}` (uso de
  variants opacity das cores semânticas).

#### FilterChip / FilterChips (`filter-chips.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props (FilterChip):** `selected?: boolean`; `count?: number`;
  `asChild?: boolean` (Slot); `children`; `className?`.
- **Props (FilterChips):** `label?: string`; `children`; `className?`.
- **Variantes:** estado selecionado/idle.
- **Usos:** FilterChip 9/40; FilterChips 9/18.
- **Estilo:** DS, selected `border-brand bg-brand/10 text-brand
  shadow-glow`, idle `border-border bg-surface text-foreground-muted`.

#### PartyBadge (`party-badge.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `sigla: string`; `name?: string`; `size?: 'sm' | 'md'`;
  `className?`.
- **Variantes:** **22 cores hardcoded** por sigla
  (PT/PL/UNIÃO/PP/MDB/PSDB/REPUBLICANOS/PSD/PDT/PSB/PSOL/NOVO/PCdoB/
  AVANTE/CIDADANIA/PODE/SOLIDARIEDADE/REDE/PV/PRTB + DEFAULT).
- **Usos:** 4/24.
- **Estilo:** mistura DS + **Tailwind raw color tokens** (`bg-red-500/15
  text-red-300 border-red-500/30`, etc) — única composição que usa
  paleta crua, intencional por D4 do prompt mestre Wave 6 (espelhar
  identidade visual oficial dos partidos, não tokenizar).
- **Observações:** doc explicita "não é juízo político".

#### StatsGrid (`stats-grid.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `items: StatItem[]`; `className?`.
- **Variantes:** — (cap responsivo em 4 colunas).
- **Usos:** 4/5.
- **Estilo:** DS `bg-border` (truque para "1px gap divisor" via
  `gap-px`), `bg-surface`.

#### Combobox (`combobox.tsx`)
- **Tipo:** interativo · **S/C:** client (`useState`).
- **Props:** `name?`; `options: ComboboxOption[]`; `defaultValue?`;
  `placeholder?`; `searchPlaceholder?`; `emptyText?`; `allOptionLabel?:
  string | null`; `className?`; `contentClassName?`; `ariaLabel?`.
- **Variantes:** —
- **Usos:** 2/4.
- **Estilo:** DS + Command + Popover primitives.

### src/components/ui

#### EmptyState (`empty-state.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `icon?: LucideIcon`; `title: string`; `description?: string`;
  `action?: ReactNode`.
- **Variantes:** —
- **Usos:** 3/3.
- **Estilo:** DS `bg-surface/50`, `border-dashed`, `text-foreground`.
- **Observações:** Comentário no arquivo diz "não substitui empty states
  densos com copy honesto". É a única coisa em `src/components/ui/`.
  **escopo: incerto** — convivência com `src/design-system/primitives/`
  sugere decisão arquitetural pendente (ver Observações gerais).

### src/components/trust + trust-banner.tsx

#### TrustBadge (`trust/trust-badge.tsx`)
- **Tipo:** interativo · **S/C:** client (`useState`, `useEffect`,
  `useId`, `useRef`).
- **Props:** `trustLevel: TrustLevel` (L1|L2|L3|L4).
- **Variantes:** 4 (via `getTrustLevelColor` em `@/lib/trust`).
- **Usos:** 10/12.
- **Estilo:** classes Tailwind dinâmicas vindas de helper de domínio +
  tokens DS para tooltip (`bg-surface`, `border-border`, `text-foreground`,
  `text-brand`).
- **Observações:** **domain-coupled** (L1-L4 mapeia pirâmide cívica de
  confiança, ver `@/shared/trust`). Compõe tooltip custom (não usa
  Popover primitive — provavelmente anterior à introdução de Popover).

#### TrustBanner (`trust-banner.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `level: TrustLevel`; `message: string`.
- **Usos:** **0/0 — órfão**.
- **Estilo:** DS + TrustBadge.
- **Observações:** componente não consumido em lugar nenhum hoje (busca
  por nome exato). Candidato a remoção ou re-uso intencional.

### src/components/busca

#### SearchForm (`search-form.tsx`)
- **Tipo:** apresentacional · **S/C:** server (form GET nativo, sem JS).
- **Props:** `defaultValue?: string`; `variant?: 'header' | 'page'`.
- **Variantes:** 2 (header tem `<search>` landmark + responsive width;
  page tem botão `Buscar`).
- **Usos:** 3/5.
- **Estilo:** DS via Input + Button. Ícone `Search` lucide inline.

### src/components/charts

`recharts-bundle.tsx` é **barrel re-export**, sem componente próprio.
Estratégia para Turbopack agrupar Recharts em 1 chunk único compartilhado
entre 6 wrappers `next/dynamic` (Wave 8 Sprint 8.4 PR2). Os charts reais
vivem em `parlamentar/`, `proposicao/` e `votacao/charts/`.

### src/components/comparar

#### ConcordanciaMatrix (`concordancia-matrix.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `pares: ConcordanciaPar[]`; `nomesPorId: Map<string, string>`.
- **Variantes:** —
- **Usos:** 1/1.
- **Estilo:** DS, 3 limiares de cor (`text-success` ≥80%, `text-foreground`
  ≥50%, `text-warning` <50%, `text-foreground-muted` insuficiente).
- **Observações:** **domain-coupled** (tipos `ConcordanciaPar` do módulo
  `parlamentares`).

#### ParlamentaresGrid (`parlamentares-grid.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `parlamentares: ParlamentarComparar[]`; `metricas:
  MetricasParlamentar[]`; `ano: number`.
- **Variantes:** — (grid dinâmico via inline `style={{ gridTemplateColumns:
  '...' }}`).
- **Usos:** 1/1.
- **Estilo:** DS, `<img>` nativo (não Next/Image — fonte externa
  camara.leg.br/senado.leg.br).
- **Observações:** **domain-coupled** (Parlamentar + métricas).

### src/components/home

#### CardParlamentares (`card-parlamentares.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** —
- **Usos:** 1/1.
- **Estilo:** DS via Card primitive + ícone lucide `Users` em quadrado
  `bg-surface-elevated text-brand`.

#### CardVotacoesSemana (`card-votacoes-semana.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `votacoes: VotacaoRecente[]`; `diasJanela: number`.
- **Usos:** 1/1.
- **Estilo:** DS via Card + badge approved/rejected (`bg-success/20
  text-success` vs `bg-destructive/20 text-destructive`).
- **Observações:** **domain-coupled** (VotacaoRecente).

#### FeaturesGrid (`features-grid.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `className?: string`.
- **Usos:** 1/1.
- **Estilo:** DS, FEATURES const inline com 6 cards. Ícones lucide
  (`Shield`/`RefreshCw`/`Code2`/`Layers`/`UserCheck`/`HandCoins`).

### src/components/parlamentar

#### ParlamentarCard (`parlamentar-card.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `parlamentar: {id, nome, casa, partidoSigla, uf, urlFoto,
  pctAlinhamento?, votacoesAnalisadas?}`; `follow?: {isFollowing: boolean}`.
- **Variantes:** estado interno de alinhamento (`com_amostra`,
  `amostra_insuficiente`, `sem_dado`) determina render.
- **Usos:** 7/7.
- **Estilo:** DS, hover unificado (`hover:border-border-strong
  hover:bg-surface-elevated`), `<img>` nativo (domínio externo), barra de
  alinhamento CSS-only.
- **Observações:** **domain-coupled** completo. Footer-action condicional
  (gating server-side — anônimo não vê o botão).

#### PerfilHeader (`perfil-header.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `parlamentar: {nome, nomeCivil, casa, partidoSigla,
  partidoNome, uf, urlFoto, legislatura, situacaoMandato, sourceUrl,
  trustLevel}`.
- **Usos:** 1/1.
- **Estilo:** DS + DataBadge (cargo/legislatura/situação) + PartyBadge +
  TrustBadge.
- **Observações:** **domain-coupled** completo.

#### PerfilProposicaoHeader (`proposicao/perfil-header.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `proposicao: {tipo, numero, ano, ementa, ementaDetalhada,
  situacao, regime, sourceUrl, trustLevel}`; `stats?: {diasEmTramitacao,
  nAutores}`.
- **Usos:** 1/1.
- **Estilo:** DS + mapping `SITUACAO_CLASSES` 5 estados (Tramitando=brand,
  Aprovada=success, Rejeitada=destructive, Arquivada=surface-elevated,
  Transformada=success solid). TrustBadge + CompartilharProposicaoButton.
- **Observações:** **domain-coupled**.

#### PerfilVotacaoHeader (`votacao/perfil-header.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `votacao: {casa, dataHora, descricao, orgao, aprovada,
  votosSim, votosNao, sourceUrl, trustLevel}`.
- **Usos:** 1/1.
- **Estilo:** DS + DataBadge ×4 (casa, órgão, data/hora, aprovada/
  rejeitada).
- **Observações:** **domain-coupled**.

#### FollowButton (`follow-button.tsx`)
- **Tipo:** interativo · **S/C:** client (`useState`, `useTransition`).
- **Props:** `parlamentarId: string`; `parlamentarNome: string`;
  `initialIsFollowing: boolean`.
- **Variantes:** following | not-following (toggle Bell/BellRing).
- **Usos:** 1/1 (consumido apenas por `ParlamentarCard`).
- **Estilo:** Button ghost icon-only 44×44 (WCAG 2.5.5).
- **Observações:** **domain-coupled**, gating server-side (anônimo não
  recebe o componente).

#### CompartilharButton (`compartilhar-button.tsx`)
- **Tipo:** interativo · **S/C:** client (`useState`, `useEffect`).
- **Props:** `parlamentar: {nome, partidoSigla, uf, casa}`.
- **Usos:** 1/1.
- **Estilo:** Dialog primitive + textareas com classes inline
  (`TEXTAREA_CLASS`, `COPY_BUTTON_CLASS`) — pequena dose de duplicação com
  `proposicao/compartilhar-button.tsx` e `votacao/compartilhar-button.tsx`.
- **Observações:** **domain-coupled**. Padrão duplicado 3× (uma versão
  por entidade).

#### Filtros (parlamentar/filtros.tsx)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `partidos: string[]`; `ufs: string[]`; `selecionado: {casa?,
  partido?, uf?, q?, ordem?}`.
- **Variantes:** —
- **Usos:** 1/1.
- **Estilo:** DS + Combobox (Partido/UF) + FilterChip (Casa) + Input
  (busca) + Button. Helper `buildHref` local.
- **Observações:** **domain-coupled**.

#### Top5Afinidade (`afinidade-voto.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `afinidades: AfinidadeRow[]`.
- **Usos:** 1/2.
- **Estilo:** DS, `<img>` nativo, TrustBadge L2.

#### AlinhamentoBancada (`alinhamento.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `alinhamento: AlinhamentoResult`; `casa: 'CAMARA' | 'SENADO'`;
  `mensal?: AlinhamentoMensalPoint[]`.
- **Usos:** 1/2.
- **Estilo:** DS, 3 limiares (`text-success`, `text-foreground`,
  `text-warning`), `Sparkline12m` interno (SVG manual sem libs).

#### GastosResumoBlock (`gastos-resumo.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `ano: number`; `resumo: GastosResumo`; `mensal?:
  GastoMensalPoint[]`; `topFornecedores?: FornecedorTop[]`;
  `parlamentarId?: string`.
- **Usos:** 1/2.
- **Estilo:** DS + `GastosChart` dynamic-import.

#### GastosChart (`gastos-chart.tsx`)
- **Tipo:** apresentacional · **S/C:** client (Recharts).
- **Props:** `categorias: GastoCategoria[]`; etc.
- **Usos:** 1/1 (chega via barrel `recharts-bundle.tsx`).
- **Estilo:** Recharts + tokens semânticos via `var(--chart-1)` (não HEX),
  opacidade ranqueada local.

#### ProposicoesAutor (`proposicoes-autor.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `proposicoes: Proposicao[]`; `filtros: ProposicoesAutorFiltros`;
  `buildFiltroHref`; `proximaPaginaHref`.
- **Usos:** (não rastreado individualmente acima — consumido pelo perfil
  de parlamentar; 1 arquivo / 1 site esperado).
- **Estilo:** DS + FilterChips.

#### VotosRecentes (`votos-recentes.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `votos: Voto[]`; `filtros: VotosRecentesFiltros`;
  `distribuicao: VotosDistribuicao`; `buildFiltroHref`; `proximaPaginaHref`.
- **Estilo:** DS + FilterChips.

#### ParesContraditorios (`pares-contraditorios.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `pares: ParContraditorio[]`; `stats: CoerenciaStats`.
- **Estilo:** DS warning subtle + tokens `destructive`/`success` em
  badges RESTRITIVA/PERMISSIVA.
- **Observações:** **domain-coupled**.

### src/components/partido

5 componentes apresentacionais server. Todos **domain-coupled**.
PadrõesDS sem ressalvas: `PartidoHeader` (header simples), `BancadaList`
(grid de link-cards, `<img>` nativo), `FidelidadeMediaBlock` (3 limiares
de cor — mesmo padrão de Alinhamento), `GastoBancadaBlock` (DS), e
`TopTemasPartido` (lista ordenada).

### src/components/proposicao

14 componentes, dos quais:
- **Apresentacionais server:** `AutoresList`, `BarraProgressoTramitacao`,
  `Filtros` (server, com helper local), `FooterCrossLinks`,
  `PerfilProposicaoHeader`, `ProposicaoCard`, `TemasList`,
  `TramitacaoTimeline`, `VotacoesVinculadas`.
- **Client (charts/share):** `ApoioPartidoChartClient` (wrapper dynamic),
  `ApoioPartidoChart` (Recharts), `VotosConsolidadosChartClient`
  (wrapper dynamic), `VotosConsolidadosChart` (Recharts),
  `CompartilharProposicaoButton`.

`BarraProgressoTramitacao` tem variantes `compact | full` (server,
domain-coupled via `MARCOS_TRAMITACAO`).

`ProposicaoCard` tem mapping `SITUACAO_CLASSES` × 5 estados, função
local `TramitacaoStrip` + `CardFooter` (ambas no mesmo arquivo,
não-exportadas).

`Filtros` (proposicao) tem `TIPOS_CHIPS` + `SITUACOES_CHIPS` const +
Combobox (Tema) + FilterChip + Input + Button (~327 linhas — o filtro mais
complexo do app).

### src/components/site

7 componentes do shell + navegação + auth.

- **`Navbar`** (server async — `auth()`): orquestrador. Renderiza
  AuthSlot + NavLinks + NavMobile + SearchForm. Sticky `glass-strong`.
- **`Footer`** (server): brand mark + 3 links. Usa
  `bg-gradient-primary`.
- **`AuthSlot`** (server async): decide AuthIslandLoader (autenticado)
  vs Link estático "Entrar" (anônimo) — **principio: zero JS Clerk para
  anônimos** (ADR-022).
- **`AuthIslandLoader`** (client `next/dynamic`): cria split-point.
- **`AuthIsland`** (client): `<Show when=...>` + `<UserButton>` dinâmico.
- **`NavLinks`** (client — `usePathname`): lista horizontal desktop +
  `personalLink` opcional para `/painel`.
- **`NavMobile`** (client — `useState`, `useEffect`, `useId`): trigger
  hambúrguer + drawer com lock de scroll, Esc fecha.

### src/components/painel

28 componentes (área logada, Wave 10). Quase tudo é **domain-coupled**
(Clerk auth, alert_policy, follows, recomendações, consent_log etc).

- **Shell:** `PainelHeader` (server, mostra identidade), `TabBar`
  (client, 5 tabs), `ActiveSlotPicker` (client, switch entre 5 slots por
  query `?tab=`).
- **Estados de página:** `EstadoNovo` / `EstadoOnboarding` / `EstadoMaduro`
  (todos RSC async — chamam queries).
- **Onboarding:** `OnboardingWizard` (client, 3 passos com Dialog DS).
- **Consent:** `ConsentGate` (server async — checa DB) + `ConsentModal`
  (client, **usa `DialogPrimitive` direto do Radix** porque modal
  não-fechável).
- **Migração LS:** `MigracaoLocalStorageModal` (client, Radix Dialog
  direto, Zod, leitura defensiva de localStorage).
- **Alertas:**
  - `SubTabs` (client, 2 sub-tabs: recebidos/políticas)
  - `FormPoliticas` (client — `useTransition` + fetch)
  - `ListaRecebidos` (server — renderiza markdown via `marked`)
  - `ItemRecebido` (client — `<details>` com fetch on-open para marcar
    leitura, otimista)
- **Configurações:**
  - `FormPerfil` (client)
  - `ComunicacaoToggles` (client)
  - `TemasChips` (client, 8 chips toggle)
- **Parlamentares:**
  - `SubTabs` (client — 2 sub-tabs, **outro componente com o mesmo nome
    `SubTabs` que o de alertas** — diferenciados por path)
  - `ListaAcompanhando` (server)
  - `ListaDaMinhaUf` (server async)
  - `BannerMudancaUf` (client) + `ModalRevisarUfAntiga` (client)
  - `FormUfInline` (client)
- **Meus dados:** `AcoesLgpd` (client, 3 modais Radix direto — export/
  anonimizar/eliminar com fricção crescente).

### src/components/votacao

16 componentes (incluindo charts/).

- **Cards/headers:** `VotacaoCard` (server, `<Link>` para detalhe),
  `PerfilVotacaoHeader` (server).
- **Apresentacionais server:** `MargemDecisaoBar` (CSS-only),
  `ProposicaoVinculada`, `RebeldesList`, `VotacoesRelacionadasFooter`,
  `VotosResumo`, `VotosPorPartido` (table), `Filtros` (sem JS).
- **Client:** `CompartilharVotacaoButton`, `VotosIndividuais`
  (`useSearchParams` + `useMemo`).
- **Charts (todos client, wrappers dynamic + bundles Recharts):**
  `DisciplinaPartidariaChart`, `VotacaoPorPartidoChart`,
  `VotacaoVotosConsolidadosChart`, `VotacaoHemicicloChart` (este é SVG
  manual, **server**, sem Recharts).

### src/components/export-csv-link.tsx

Único componente solto fora de subpasta (além de `trust-banner.tsx`).
Server, apresentacional, usa `Button asChild` + `<a download>` + ícone
`Download` lucide. Sem variantes. 5 arquivos, 6 sites.

### src/app/dev/design/_components

#### Swatch (`swatch.tsx`)
- **Tipo:** apresentacional · **S/C:** server.
- **Props:** `className: string`; `token: string`; `label: string`;
  `description: string`.
- **Usos:** 1/8 — todos na própria página `/dev/design`.
- **Estilo:** DS.
- **Observações:** showroom interno — não é primitiva.

### src/app/docs/_components

#### SidebarNav (`sidebar-nav.tsx`)
- **Tipo:** interativo · **S/C:** client (`usePathname`).
- **Props:** —
- **Usos:** 1/1.
- **Estilo:** DS, active `bg-brand/10 text-brand`.

#### typography.tsx — múltiplos exports
- `Section({title, children, id?})` — wrapper de seção (h2 + space-y),
  server. 8/42.
- `P({children})` — `<p className="leading-relaxed">`, server. 5/29.
- `Ul({children})` — `<ul className="space-y-2 leading-relaxed">`, server.
  4/13.
- `Li({children})` — `<li>` com prefixo "—". 4/32.
- `InternalLink({href, children})` — Next `<Link>` com `docsLinkClass`.
  1/1.
- `ExternalLink({href, children})` — `<a target="_blank">` com
  `docsLinkClass`. 5/10.
- `DocsHeader({title, subtitle})` — header de página `/docs/*`. 5/5.
- Constante exportada: `docsLinkClass`.
- **Observações:** vivem em `_components` (prefixo `_` exclui do router
  Next) intencionalmente; o cabeçalho do arquivo diz para **não
  generalizar para `components/ui/` enquanto for usado só aqui**.
  Pequeno DS escopado em rota.

## Observações gerais

### 1. Camada de tokens semânticos consolidada e generalizada

A grande maioria dos componentes (≈95%) usa **apenas tokens semânticos
Tailwind v4** (`bg-brand`, `bg-surface`, `bg-surface-elevated`,
`text-foreground`, `text-foreground-muted`, `text-foreground-subtle`,
`border-border`, `border-border-strong`, `bg-success`, `bg-destructive`,
`bg-warning`, `text-success`, etc). HEX inline não foi encontrado em
nenhum componente.

**Exceções intencionais:**
- `PartyBadge` — paleta crua Tailwind (`bg-red-500/15 text-red-300
  border-red-500/30`, etc) para 22 siglas. Decisão consciente (D4 Wave
  6).
- `PainelHeader` e `Footer` — usam `bg-gradient-primary` (utilitário
  definido em `globals.css`, ADR-024).
- Charts (Recharts) — recebem cor por `var(--success)`/`var(--brand)`/
  `var(--destructive)`/`var(--chart-1)` via inline `style`/`fill` em
  Cells. Isso conta como token semântico via CSS var, não HEX.

### 2. Pirâmide de "Badges" — 3 entidades conviventes

Existem três componentes que se chamam ou se comportam como badge,
deliberadamente distintos:

- **`Badge`** (`design-system/primitives/badge.tsx`) — shadcn original,
  CVA com 4 variants (default/secondary/destructive/outline). Usado em 1
  arquivo, 6 sites — uso baixo.
- **`DataBadge`** (`design-system/compositions/data-badge.tsx`) — chip
  rico (`label + source + icon + tone`), 6 tones semânticos. Uso
  altíssimo (12/45, 2º mais usado).
- **`TrustBadge`** (`components/trust/trust-badge.tsx`) — domain-coupled
  L1-L4 com tooltip custom (anterior à introdução de Popover). Uso
  significativo (10/12). Há também `PartyBadge` (composição própria).

`DataBadge` superou claramente `Badge` em adoção; a primitiva original
parece subutilizada. Pode haver oportunidade de consolidar, ou pelo menos
documentar quando escolher uma vs outra (atualmente o doc do `DataBadge`
diz que é "boundary respeitado" vs `TrustBadge`, mas não menciona o
primitivo `Badge`).

### 3. Duplicação `src/components/ui/` vs `src/design-system/primitives/`

`src/components/ui/` tem **um único componente**, `EmptyState`. O resto
do "DS" vive em `src/design-system/primitives/` e `compositions/`. Isso
parece resíduo histórico — `EmptyState` é genérico o suficiente para ser
uma composição do DS, mas vive em `components/ui/` provavelmente porque é
anterior ao ADR-021 (Sprint 3.1 / Sprint 4.2 PR 3). **Decisão arquitetural
relevante para trabalho futuro:** mover para `design-system/compositions/`
ou aceitar a convivência e documentar.

Não foi encontrada **colisão de nomes** entre `ui` e `primitives` — só
falta de critério para escolher onde criar componente novo.

### 4. Padrão "Compartilhar*Button" triplicado

Três variantes do mesmo componente (parlamentar/proposicao/votacao),
cada uma com builders de texto WhatsApp/Twitter próprios. Compartilham:
classes `TEXTAREA_CLASS` + `COPY_BUTTON_CLASS` (declaradas localmente em
cada arquivo, mesma string), uso de Dialog DS, lógica de clipboard,
toast. Candidato natural a composição `CompartilharDialog` no DS
recebendo função `buildShareText(channel, payload)` e título genérico.

### 5. Padrão "3 limiares de cor"

Recorre em pelo menos 4 lugares:
- `ConcordanciaMatrix` (`text-success ≥80` / `text-foreground ≥50` /
  `text-warning <50`)
- `AlinhamentoBancada` (mesma escala)
- `FidelidadeMediaBlock` (mesma escala)
- mais variações pontuais em cards

Cada arquivo replica a ternária. Candidato natural a helper
(`thresholdClass(pct)` em `@/lib/colors` ou similar).

### 6. Charts: 1 bundle, 6 wrappers, 2 técnicas para SVG

A estratégia de barrel `recharts-bundle.tsx` é deliberada (Wave 8 Sprint
8.4 PR2) e bem documentada. 4 das 6 entradas são charts Recharts; 1
(`VotacaoHemicicloChart`) é SVG manual server-renderizado (não passa pelo
bundle). Há também `Sparkline12m` interno em
`parlamentar/alinhamento.tsx` (SVG manual, não exportado).

### 7. Painel: Radix Dialog direto vs Dialog DS

Em três pontos do painel (Wave 10), componentes usam
`DialogPrimitive.Root/Trigger/Content` **direto do Radix**, não via DS:
`ConsentModal`, `AcoesLgpd`, `MigracaoLocalStorageModal`. Comentários
nos arquivos explicam: precisam controlar abertura manualmente, ou
remover o botão X automático que vem no `DialogContent` do DS. Isso é
sinal de que o `DialogContent` do DS é opinionated demais para alguns
casos (close button fixo) — pode valer um prop `showCloseButton?: boolean`
para permitir consumo via DS em vez de Radix direto.

### 8. Auth/Skin: zero-JS-anônimo é princípio arquitetural

A topologia `Navbar` (RSC async) → `AuthSlot` (RSC async) → `Button`
estático para anônimo ou `AuthIslandLoader` para autenticado é o
mecanismo central de respeitar ADR-022. Replicar essa lógica fora do DS
exigiria preservar o split-point. Útil para quem migra: qualquer
componente que toque Clerk hooks (`useClerk`, `useUser`) deve ser client
e idealmente lazy.

### 9. Componente órfão e exports inativos

- `TrustBanner` (`components/trust-banner.tsx`) — **0 usos**. Candidato a
  remoção.
- `DialogPortal`, `DialogOverlay` (re-exports Radix) — 0 usos externos.
  Provavelmente ok manter como API completa.
- `CommandDialog`, `CommandSeparator`, `CommandShortcut` — 0 usos.
  Idem.

### 10. Mistura de `SubTabs`

Há **dois `SubTabs` distintos** com o mesmo nome:
`src/components/painel/parlamentares/sub-tabs.tsx` e
`src/components/painel/alertas/sub-tabs.tsx`. Mesmo shape conceitual
(tabs aria-current Link com `?subtab=`), mesmo estilo de classes, type
diferente (`ParlamentaresSubtab` vs `AlertasSubtab`). Candidato a
composição genérica `<SubTabs<T>>` parametrizada — ou aceitar duplicação
deliberada para baixo acoplamento (a documentação em cada arquivo
sugere a 2ª).

### 11. Convenções de nomenclatura: kebab-case files, PascalCase exports

Todos os arquivos seguem kebab-case (`parlamentar-card.tsx`,
`hero-section.tsx`). Exports PascalCase. Nenhuma exceção encontrada.

### 12. Acoplamento ao domínio é regra, não exceção

Componentes "puros de layout" estão concentrados em `design-system/`
(primitives + compositions). Tudo em `src/components/` (exceto `ui/`,
`busca/`, `home/` parcialmente, `site/`, `charts/`) é **domain-coupled**
— props referenciam `Parlamentar`, `Proposicao`, `Votacao`, `Partido`,
`Trust`, `AlertPolicy`, `Follow`, `Consent`. Isso é esperado e
intencional para um produto cívico.

## O que ficou fora

Nada do escopo declarado pelo prompt ficou sem inventário. Os 118
arquivos `.tsx` em `src/components/**`, `src/design-system/**` e
`src/app/**` (exceto arquivos de rota + `api/`) foram processados.

Algumas contagens podem subestimar levemente o uso quando o consumer
**renomeia o export no import** (ex.: `import { VotacaoHemicicloChart
as Hemiciclo }`). Para `VotacaoHemicicloChart` confirmei por busca
nominal (1 site real em `src/app/votacoes/[id]/page.tsx`); para os
demais não foi observado padrão de alias.

Não inventariei separadamente:
- Sub-componentes não-exportados declarados em arquivos
  (ex.: `TramitacaoStrip` e `CardFooter` locais em `proposicao-card.tsx`,
  `KpiCell` em `kpi-strip.tsx`, `VotoCard` em `pares-contraditorios.tsx`,
  builders de share text). Mencionados em "Observações" do componente
  pai quando relevantes.
- Helpers de função pura (`buildHref`, `classifyAlinhamento`,
  `getInitials`, `formatJoinDate`, `truncate`, etc) embutidos em
  arquivos `.tsx` — não são componentes.
- Constantes exportadas que não são componentes (`docsLinkClass`,
  `NAV_LINKS`, `MARCOS_TRAMITACAO` re-exportado, `TIPOS_CHIPS`, etc).
