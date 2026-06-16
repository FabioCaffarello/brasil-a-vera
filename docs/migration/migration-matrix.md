# Matriz de migração brasil-a-vera × RDS 3.0.0

> ⚠️ **Categorização superada (2026-06-16).** Snapshot contra RDS 3.0.0; o RDS
> hoje está em 3.12.0 e a migração de rotas terminou. Fila de consolidação
> atual em [`rds-consolidation-plan.md`](rds-consolidation-plan.md).
>
> Data: 2026-06-05 · Branch `docs/component-inventory` · Read-only
>
> Fontes: `docs/migration/component-inventory.md` (133 componentes,
> 118 arquivos), `@fabio.caffarello/react-design-system@3.0.0` instalado
> em `node_modules/`, listas de exports em `/tmp/rds-3-server.txt`
> (21 entries) e `/tmp/rds-3-client.txt` (265 entries, filtrados
> tokens UPPERCASE + providers + factories). Tipos consultados em
> `node_modules/@fabio.caffarello/react-design-system/dist/ui/**/*.d.ts`.

## Resumo executivo

- **Total catalogado:** 133 componentes do brasil-a-vera.
- **Categoria 1 (casa direto):** 5 (3,8% do inventário).
- **Categoria 2 (casa com ajuste):** 23 (17,3%).
- **Categoria 3 (falta no RDS):** 11 (8,3%).
- **Categoria 4 (fica no consumidor):** 94 (70,7%).
- **Call sites cobertos por categoria 1:** ~46 de aproximadamente 619
  sites totais identificáveis no inventário (~7,4%).
- **Call sites de categoria 4:** ~145 de ~619 (~23,4%).
- **Call sites cobertos por categoria 2:** ~334 de ~619 (~54,0%) — quase
  todos puxados por Button (72), DataBadge (45), FilterChip (40),
  Section helpers de `/docs` (~116 somando Section+Li+P+Ul+ExternalLink
  +DocsHeader+InternalLink), SectionCard (28), Skeleton (24), Dialog
  family (~40), Label (15), HeroSection (14), TrustBadge (12),
  Separator (10), KpiStrip (9), KpiCard (7), Combobox (4), Toaster (2).
- **Issues sugeridas:** 12 drafts de enhancement (E1–E12) + 9 drafts de
  novo componente (N1–N9), todos rascunhados nesta página.

A leitura do split `./server` vs `.` é load-bearing: 80 componentes do
brasil-a-vera são RSC. O server entry do RDS expõe apenas 21
componentes (Skeleton, Spinner, Progress, Text, Chip, Container, Stack,
Breadcrumb, Timeline, Info, ErrorMessage, AutocompleteOption,
DialogHeader, DialogFooter, DrawerHeader, DrawerFooter, HeaderActions,
HeaderNavigation, MenuSeparator, NavbarSeparator, TableCell). **Button,
Badge, Card, Input, Label, Separator, Dialog (Root/Content),
Accordion, Tabs, Popover, EmptyState, Toast — todos ficam no entry
client `.`**. Isso transforma vários componentes "que pareceriam
casar direto" em categoria 2 sob a regra de desempate, porque migrar
implica empurrar a fronteira `"use client"` para mais perto da raiz,
não só trocar imports.

## Tabela mestra

Ordem decrescente por call sites. `Esforço`: S = troca de import +
1–2 props, M = ajuste de props/comportamento, L = re-arquitetura.
`Issue?`: `Draft EN` (enhancement) / `Draft NN` (novo componente) / `—`.

| Componente brasil-a-vera | Caminho | Cat. | RDS equivalente | Entry | Usos (arq/sites) | Esforço | Issue? |
| --- | --- | ---: | --- | --- | ---: | :---: | --- |
| `Button` | design-system/primitives/button.tsx | 2 | `Button` | `.` | 28 / 72 | M | Draft E1 |
| `DataBadge` | design-system/compositions/data-badge.tsx | 2 | `Badge` (+ wrap) | `.` | 12 / 45 | M | Draft E2 |
| `Section` (docs) | app/docs/_components/typography.tsx | 4 | — (Text + Stack como primitivas internas) | `./server` | 8 / 42 | S | — |
| `FilterChip` | design-system/compositions/filter-chips.tsx | 2 | `Chip` | `./server` | 9 / 40 | M | Draft E3 |
| `Li` (docs) | app/docs/_components/typography.tsx | 4 | — | `./server` (não tem direto; `Text` ajuda) | 4 / 32 | S | — |
| `P` (docs) | app/docs/_components/typography.tsx | 1 | `Text` (variant `paragraph`/`body`) | `./server` | 5 / 29 | S | — |
| `SectionCard` | design-system/compositions/section-card.tsx | 3 | — | — | 8 / 28 | M | Draft N1 |
| `Skeleton` | design-system/primitives/skeleton.tsx | 1 | `Skeleton` | `./server` | 4 / 24 | S | — |
| `PartyBadge` | design-system/compositions/party-badge.tsx | 4 | — (usa `Badge` internamente) | `.` | 4 / 24 | M | — |
| `FilterChips` | design-system/compositions/filter-chips.tsx | 3 | — (wrap de Chips) | — | 9 / 18 | S | Draft N2 |
| `AccordionItem/Trigger/Content` | design-system/primitives/accordion.tsx | 2 | `Accordion` | `.` | 3 / 16 (cada) | L | Draft E4 |
| `Label` | design-system/primitives/label.tsx | 2 | `Label` | `.` | 5 / 15 | S | Draft E5 |
| `HeroSection` | design-system/compositions/hero-section.tsx | 3 | — | — | 7 / 14 | L | Draft N3 |
| `Ul` (docs) | app/docs/_components/typography.tsx | 4 | — | `./server` (custom) | 4 / 13 | S | — |
| `TrustBadge` | components/trust/trust-badge.tsx | 4 | — (usa `Tooltip` + `Badge` internos) | `.` | 10 / 12 | M | — |
| `Separator` | design-system/primitives/separator.tsx | 2 | `Separator` | `.` | 1 / 10 | S | Draft E6 |
| `ExternalLink` (docs) | app/docs/_components/typography.tsx | 4 | — | — | 5 / 10 | S | — |
| `KpiStrip` | design-system/compositions/kpi-strip.tsx | 3 | — | — | 7 / 9 | M | Draft N4 |
| `DialogContent` | design-system/primitives/dialog.tsx | 2 | `Dialog.Content` | `.` | 8 / 8 | M | Draft E7 |
| `Dialog` (Root) | design-system/primitives/dialog.tsx | 1 | `Dialog` | `.` | 7 / 8 | S | — |
| `Swatch` | app/dev/design/_components/swatch.tsx | 4 | — | — (showroom) | 1 / 8 | S | — |
| `Card` / `CardContent` | design-system/primitives/card.tsx | 2 | `Card` | `.` | 3 / 7 | M | Draft E8 |
| `KpiCard` | design-system/compositions/kpi-card.tsx | 3 | — | — | 3 / 7 | M | Draft N5 |
| `ParlamentarCard` | components/parlamentar/parlamentar-card.tsx | 4 | — (Card+Avatar+Badge+Progress internos) | `.` | 7 / 7 | M | — |
| `Badge` | design-system/primitives/badge.tsx | 1 | `Badge` | `.` | 1 / 6 | S | — |
| `DialogTitle/Header/Description` | design-system/primitives/dialog.tsx | 2 | `Dialog.Title/.Header/.Description` | `./server` (Header/Footer) + `.` (Title/Description) | 6 / 6 cada | S | — |
| `ExportCsvLink` | components/export-csv-link.tsx | 4 | — (Button as `<a>`) | `.` | 5 / 6 | S | — |
| `ConsentGate` | components/painel/consent-gate/consent-gate.tsx | 4 | — | — | 5 / 6 | M | — |
| `CardFooter` | design-system/primitives/card.tsx | 2 | (faz parte de `Card`; ver Draft E8) | `.` | 4 / 5 | M | (Draft E8) |
| `Input` | design-system/primitives/input.tsx | 2 | `Input` | `.` | 3 / 5 | M | Draft E9 |
| `SectionNav` | design-system/compositions/section-nav.tsx | 3 | — | — | 4 / 5 | L | Draft N6 |
| `StatsGrid` | design-system/compositions/stats-grid.tsx | 3 | — | — | 4 / 5 | M | Draft N7 |
| `SearchForm` | components/busca/search-form.tsx | 4 | — (Input/Button via DS) | `.` | 3 / 5 | M | — |
| `AuthSlot` | components/site/auth-slot.tsx | 4 | — | — | 4 / 5 | L | — |
| `DocsHeader` (docs) | app/docs/_components/typography.tsx | 4 | — (`PageHeader` parecido mas com breadcrumb) | `.` | 5 / 5 | S | — |
| `CardHeader/Title` | design-system/primitives/card.tsx | 2 | parte de `Card` (Draft E8) | `.` | 3 / 4 cada | M | (Draft E8) |
| `DialogTrigger` | design-system/primitives/dialog.tsx | 1 | `Dialog.Trigger` | `.` | 4 / 4 | S | — |
| `Combobox` | design-system/compositions/combobox.tsx | 2 | `Autocomplete` (~) ou `Select` | `.` | 2 / 4 | L | Draft E10 |
| `AuthIslandLoader` | components/site/auth-island-loader.tsx | 4 | — | — | 3 / 4 | L | — |
| `ActiveSlotPicker` | components/painel/active-slot-picker.tsx | 4 | — | — | 2 / 4 | M | — |
| `CardDescription` | design-system/primitives/card.tsx | 2 | parte de `Card` (Draft E8) | `.` | 2 / 3 | M | (Draft E8) |
| `TabsTrigger/Content` | design-system/primitives/tabs.tsx | 1 | `Tabs.Trigger/.Content` | `.` | 1 / 3 cada | S | — |
| `Accordion` (Root) | design-system/primitives/accordion.tsx | 2 | `Accordion` | `.` | 3 / 3 | L | (Draft E4) |
| `EmptyState` | components/ui/empty-state.tsx | 2 | `EmptyState` | `.` | 3 / 3 | M | Draft E11 |
| `BarraProgressoTramitacao` | components/proposicao/barra-progresso-tramitacao.tsx | 4 | — | — | 2 / 3 | M | — |
| `NavMobile` | components/site/nav-mobile.tsx | 4 | — (`Drawer` parcial; `HeaderMobileMenu` parcial) | `.` | 2 / 3 | L | — |
| `Navbar` (site) | components/site/navbar.tsx | 4 | — (`Header` orquestra parecido) | `.` | 2 / 3 | L | — |
| `ItemRecebido` | components/painel/alertas/item-recebido.tsx | 4 | — | — | 2 / 3 | M | — |
| `CommandItem` | design-system/primitives/command.tsx | 2 | parte de `CommandPalette` | `.` | 1 / 2 | L | (Draft E10) |
| `Toaster` (sonner) | design-system/primitives/sonner.tsx | 2 | `ToastContainer` + `useToast` | `.` | 2 / 2 | M | Draft E12 |
| `ProposicaoCard` | components/proposicao/proposicao-card.tsx | 4 | — | — | 2 / 2 | M | — |
| `VotacaoCard` | components/votacao/votacao-card.tsx | 4 | — | — | 2 / 2 | M | — |
| `GastosResumoBlock` | components/parlamentar/gastos-resumo.tsx | 4 | — | — | 1 / 2 | M | — |
| `ApoioPartidoChart` | components/proposicao/apoio-partido-chart.tsx | 4 | — (Recharts) | — | 1 / 2 | — | — |
| `Top5Afinidade` | components/parlamentar/afinidade-voto.tsx | 4 | — | — | 1 / 2 | M | — |
| `AlinhamentoBancada` | components/parlamentar/alinhamento.tsx | 4 | — | — | 1 / 2 | M | — |
| `VotosResumo` | components/votacao/votos-resumo.tsx | 4 | — | — | 1 / 2 | M | — |
| `VotosPorPartido` | components/votacao/votos-por-partido.tsx | 4 | — | — | 1 / 2 | M | — |
| `VotosIndividuais` | components/votacao/votos-individuais.tsx | 4 | — | — | 1 / 2 | M | — |
| `MargemDecisaoBar` | components/votacao/margem-decisao.tsx | 4 | — | — | 1 / 2 | S | — |
| `RebeldesList` | components/votacao/rebeldes-list.tsx | 4 | — | — | 1 / 2 | M | — |
| `ProposicaoVinculada` | components/votacao/proposicao-vinculada.tsx | 4 | — | — | 1 / 2 | M | — |
| `AutoresList` | components/proposicao/autores-list.tsx | 4 | — | — | 1 / 2 | M | — |
| `TemasList` | components/proposicao/temas-list.tsx | 4 | — | — | 1 / 2 | S | — |
| `TramitacaoTimeline` | components/proposicao/tramitacao-timeline.tsx | 4 | — (`Timeline` ajuda parcial) | `./server` | 1 / 2 | M | — |
| `VotacoesVinculadas` | components/proposicao/votacoes-vinculadas.tsx | 4 | — | — | 1 / 2 | M | — |
| `VotosConsolidadosChart` (prop) | components/proposicao/votos-consolidados-chart.tsx | 4 | — (Recharts) | — | 1 / 2 | — | — |
| `VotacaoVotosConsolidadosChart` | components/votacao/charts/votos-consolidados-chart.tsx | 4 | — | — | 1 / 2 | — | — |
| `VotacaoPorPartidoChart` | components/votacao/charts/por-partido-chart.tsx | 4 | — | — | 1 / 2 | — | — |
| `DisciplinaPartidariaChart` | components/votacao/charts/disciplina-chart.tsx | 4 | — | — | 1 / 2 | — | — |
| `ConsentModal` | components/painel/consent-gate/consent-modal.tsx | 4 | — (`Dialog` controlado) | `.` | 1 / 2 | M | — |
| `DialogFooter/Close` | design-system/primitives/dialog.tsx | 1 | `Dialog.Footer/.Close` | `./server` (Footer) + `.` (Close) | 1 / 1 | S | — |
| `Tabs/TabsList` | design-system/primitives/tabs.tsx | 1 | `Tabs` / `Tabs.List` | `.` | 1 / 1 | S | — |
| `Popover/Content/Trigger` | design-system/primitives/popover.tsx | 2 | `Popover` | `.` | 1 / 1 cada | L | (ver obs.) |
| `Command/Input/List/Group/Empty` | design-system/primitives/command.tsx | 2 | `CommandPalette` (~) | `.` | 1 / 1 cada | L | (Draft E10) |
| `CardParlamentares` | components/home/card-parlamentares.tsx | 4 | — | — | 1 / 1 | S | — |
| `CardVotacoesSemana` | components/home/card-votacoes-semana.tsx | 4 | — | — | 1 / 1 | M | — |
| `FeaturesGrid` | components/home/features-grid.tsx | 4 | — | — | 1 / 1 | M | — |
| `PerfilHeader` (parlamentar) | components/parlamentar/perfil-header.tsx | 4 | — | — | 1 / 1 | M | — |
| `PerfilProposicaoHeader` | components/proposicao/perfil-header.tsx | 4 | — | — | 1 / 1 | M | — |
| `PerfilVotacaoHeader` | components/votacao/perfil-header.tsx | 4 | — | — | 1 / 1 | M | — |
| `CompartilharButton` (parlamentar) | components/parlamentar/compartilhar-button.tsx | 4 | — | — | 1 / 1 | M | — |
| `CompartilharProposicaoButton` | components/proposicao/compartilhar-button.tsx | 4 | — | — | 1 / 1 | M | — |
| `CompartilharVotacaoButton` | components/votacao/compartilhar-button.tsx | 4 | — | — | 1 / 1 | M | — |
| `FollowButton` | components/parlamentar/follow-button.tsx | 4 | — | — | 1 / 1 | S | — |
| `GastosChart` | components/parlamentar/gastos-chart.tsx | 4 | — (Recharts) | — | 1 / 1 | — | — |
| `FidelidadeMediaBlock` | components/partido/fidelidade-media.tsx | 4 | — | — | 1 / 1 | M | — |
| `GastoBancadaBlock` | components/partido/gasto-bancada.tsx | 4 | — | — | 1 / 1 | M | — |
| `PartidoHeader` | components/partido/header.tsx | 4 | — | — | 1 / 1 | M | — |
| `TopTemasPartido` | components/partido/top-temas.tsx | 4 | — | — | 1 / 1 | M | — |
| `VotacoesRelacionadasFooter` | components/votacao/footer-relacionadas.tsx | 4 | — | — | 1 / 1 | M | — |
| `FooterCrossLinks` | components/proposicao/footer-cross-links.tsx | 4 | — | — | 1 / 1 | M | — |
| `ConcordanciaMatrix` | components/comparar/concordancia-matrix.tsx | 4 | — | — | 1 / 1 | M | — |
| `ParlamentaresGrid` | components/comparar/parlamentares-grid.tsx | 4 | — | — | 1 / 1 | M | — |
| `AuthIsland` | components/site/auth-island.tsx | 4 | — | — | 1 / 1 | M | — |
| `Footer` | components/site/footer.tsx | 4 | — | — | 1 / 1 | M | — |
| `NavLinks` | components/site/nav-links.tsx | 4 | — (`Navigation`/`NavLink` parcial) | `.` | 1 / 1 | L | — |
| `OnboardingWizard` | components/painel/onboarding-wizard.tsx | 4 | — (`Stepper` ajuda) | `.` | 1 / 1 | L | — |
| `PainelHeader` | components/painel/painel-header.tsx | 4 | — | — | 1 / 1 | M | — |
| `TabBar` | components/painel/tab-bar.tsx | 3 | — | — | 1 / 1 | M | Draft N8 |
| `EstadoMaduro` | components/painel/estado-maduro.tsx | 4 | — | — | 1 / 1 | M | — |
| `EstadoNovo` | components/painel/estado-novo.tsx | 4 | — | — | 1 / 1 | M | — |
| `EstadoOnboarding` | components/painel/estado-onboarding.tsx | 4 | — | — | 1 / 1 | M | — |
| `FormPoliticas` | components/painel/alertas/form-politicas.tsx | 4 | — (`Form`/`FormField` parcial) | `.` | 1 / 1 | M | — |
| `FormPerfil` | components/painel/configuracoes/form-perfil.tsx | 4 | — | — | 1 / 1 | M | — |
| `ComunicacaoToggles` | components/painel/configuracoes/comunicacao-toggles.tsx | 4 | — (`Switch` ajuda) | `.` | 1 / 1 | M | — |
| `TemasChips` | components/painel/configuracoes/temas-chips.tsx | 4 | — (`Chip` ajuda) | `./server` | 1 / 1 | M | — |
| `AcoesLgpd` | components/painel/meus-dados/acoes-lgpd.tsx | 4 | — | — | 1 / 1 | M | — |
| `MigracaoLocalStorageModal` | components/painel/migracao-localstorage/modal.tsx | 4 | — | — | 1 / 1 | M | — |
| `BannerMudancaUf` | components/painel/parlamentares/banner-mudanca-uf.tsx | 4 | — | — | 1 / 1 | M | — |
| `FormUfInline` | components/painel/parlamentares/form-uf-inline.tsx | 4 | — | — | 1 / 1 | M | — |
| `ListaAcompanhando` | components/painel/parlamentares/lista-acompanhando.tsx | 4 | — | — | 1 / 1 | M | — |
| `ListaDaMinhaUf` | components/painel/parlamentares/lista-da-minha-uf.tsx | 4 | — | — | 1 / 1 | M | — |
| `ModalRevisarUfAntiga` | components/painel/parlamentares/modal-revisar-uf-antiga.tsx | 4 | — | — | 1 / 1 | M | — |
| `SubTabs` (parlamentares) | components/painel/parlamentares/sub-tabs.tsx | 3 | — | — | 1 / 1 | M | Draft N8 |
| `SubTabs` (alertas) | components/painel/alertas/sub-tabs.tsx | 3 | — | — | 1 / 1 | M | (Draft N8) |
| `ListaRecebidos` | components/painel/alertas/lista-recebidos.tsx | 4 | — | — | 1 / 1 | M | — |
| `SidebarNav` (docs) | app/docs/_components/sidebar-nav.tsx | 4 | — | — | 1 / 1 | M | — |
| `InternalLink` (docs) | app/docs/_components/typography.tsx | 4 | — | — | 1 / 1 | S | — |
| `Sparkline12m` | components/parlamentar/alinhamento.tsx | 3 | — | — | interno | M | Draft N9 |
| `TrustBanner` | components/trust-banner.tsx | 4 | — (órfão, candidato a remover) | — | 0 / 0 | — | — |
| `VotacaoHemicicloChart` | components/votacao/charts/hemiciclo.tsx | 4 | — | — | 1 / 1 | — | — |

## Detalhe por categoria

### Categoria 1 — Casa direto (5 componentes)

#### Skeleton

- **brasil-a-vera:** `src/design-system/primitives/skeleton.tsx`,
  4 arquivos / 24 sites.
- **RDS:** `Skeleton` em `./server`.
- **Mapeamento de props:** trocar import. Brasil-a-vera só usa
  `className` (herda `HTMLAttributes<HTMLDivElement>`); RDS aceita
  `className` + extras opcionais (`variant`, `width`, `height`,
  `lines`). Não é preciso mudar nenhum call site existente.
- **Observação:** confirmar em smoke se a classe Tailwind do
  `animate-pulse` do RDS bate visualmente com o token
  `bg-surface-elevated` que o brasil-a-vera espera no skeleton — em
  caso de divergência cosmética, classe extra resolve.

#### P (docs)

- **brasil-a-vera:** `src/app/docs/_components/typography.tsx`,
  5 arquivos / 29 sites.
- **RDS:** `Text` em `./server`, com `variant="paragraph"` (ou `body`).
- **Mapeamento de props:** `<P>...</P>` → `<Text variant="paragraph">
  ...</Text>`. Ambos são server, sem dependência de hook.
- **Observação:** ganho real: tipografia centralizada. Custos
  similares: o helper local é 1 linha; substituí-lo só vale a pena
  como parte de uma reformatação do escopo `_components` inteiro, não
  isolado.

#### Dialog (Root)

- **brasil-a-vera:** `src/design-system/primitives/dialog.tsx`,
  7 arquivos / 8 sites.
- **RDS:** `Dialog` em `.`.
- **Mapeamento de props:** `<Dialog open onOpenChange={...}>` ↔
  `<Dialog open onOpenChange={...}>`. APIs equivalentes (open,
  defaultOpen, onOpenChange).
- **Observação:** o filho direto muda — em vez de `<DialogTrigger>` e
  `<DialogContent>` isolados, o RDS expõe via namespace
  (`Dialog.Trigger`, `Dialog.Content`, ...). Como o brasil-a-vera já
  importa esses nomeadamente, ambos os padrões funcionam (RDS também
  re-exporta `DialogTrigger` e `DialogContent` no top level).

#### DialogTrigger

- **brasil-a-vera:** `src/design-system/primitives/dialog.tsx`,
  4 arquivos / 4 sites.
- **RDS:** `DialogTrigger` em `.`.
- **Mapeamento de props:** API equivalente; o brasil-a-vera usa
  `asChild`, e o RDS também (`DialogTrigger` aceita `asChild` para
  composição Radix-like).
- **Observação:** verificar se `DialogTrigger` do RDS aceita
  `asChild`. Se não aceitar, vira categoria 2 (Draft E7 cobre).

#### Tabs / TabsList / TabsTrigger / TabsContent

- **brasil-a-vera:** `src/design-system/primitives/tabs.tsx`, 1 arquivo
  / 1 site cada (`Tabs`, `TabsList`), 1 arquivo / 3 sites
  (`TabsTrigger`, `TabsContent`).
- **RDS:** `Tabs` (compound: `Tabs.List`, `Tabs.Trigger`,
  `Tabs.Content`) em `.`.
- **Mapeamento de props:** `<TabsTrigger value="...">` mantém a
  prop `value` (igual). `<TabsContent value="...">` idem. Apenas a
  importação muda. `<Tabs defaultValue="...">` (shadcn) vira o que o
  `TabsProvider` aceitar — checar `TabsProviderProps` se o brasil-a-
  vera usa `defaultValue` (categoria 1 se cobre; categoria 2 se exige
  `value`/`onValueChange` obrigatórios).
- **Observação:** uso é localizado em 1 arquivo — risco baixo, ganho
  baixo.

#### Badge

- **brasil-a-vera:** `src/design-system/primitives/badge.tsx`,
  1 arquivo / 6 sites.
- **RDS:** `Badge` em `.`.
- **Mapeamento de props:** o brasil-a-vera usa `variant` com 4 valores
  (`default | secondary | destructive | outline`); o RDS tem
  `variant` com 7 (`success | warning | error | info | neutral |
  primary | secondary`) + prop separada `style` (`solid | outline`).
  Mapeamento manual:
  - `default` → `variant="primary" style="solid"`
  - `secondary` → `variant="secondary" style="solid"`
  - `destructive` → `variant="error" style="solid"`
  - `outline` → `variant="neutral" style="outline"`
- **Observação:** ainda casa direto porque o set cobre os 4
  legacy. O fato de o RDS exigir prop `style` separada é leve, mas
  caberia uma melhoria documental ("how to migrate from shadcn
  variants").

### Categoria 2 — Casa com ajuste (23 componentes)

> Nesta categoria, o predominante é (a) RDS expor o componente apenas
> no entry `.` (client), enquanto o brasil-a-vera usa em RSC; e
> (b) APIs ligeiramente divergentes para subcomponentes shadcn que o
> RDS não expõe.

#### Button

- **brasil-a-vera:** `src/design-system/primitives/button.tsx`,
  28 arquivos / 72 sites.
- **RDS aproximado:** `Button` em `.`.
- **Gap exato:**
  1. Brasil-a-vera é **server component** (sem `"use client"`,
     `forwardRef` safe). RDS está no entry `.`, então importar marca
     toda a árvore-pai como client se o consumer for RSC. Para 72
     sites, isso pode mover dezenas de páginas de RSC para client,
     o que conflita com o ADR de zero-JS-anônimo.
  2. Variantes não casam 1-para-1: brasil-a-vera tem `default`,
     `destructive`, `outline`, `secondary`, `ghost`, `link`. RDS
     tem `primary`, `secondary`, `error`, `outline`, `ghost`,
     `iconOnly`. Faltam `link` e `default`-color (renomeáveis). E
     no RDS o icon-only é variante separada, no brasil-a-vera é
     `size="icon"`.
  3. RDS não tem `asChild` (usa polimórfico `as` + `href`/`target`).
     Brasil-a-vera depende de `<Button asChild><Link>...</Link>
     </Button>` para integração com `next/link` (ExportCsvLink usa
     esse padrão; SearchForm idem; PartidoHeader idem; vários
     cards no painel idem). Substituir `asChild` por `as={Link}
     href={...}` força reescrita do call site quando `<Link>` já
     traz `prefetch={false}`/`scroll={false}`/etc.
- **Sites do brasil-a-vera afetados pelo gap:** todos os 72 (estilo) +
  ~25 dos que usam `asChild` (padrão `<Button asChild><Link href=
  ...>...</Link></Button>`).
- **Exemplo:** `src/components/parlamentar/parlamentar-card.tsx`
  faz `<Button asChild variant="ghost" size="sm"><Link href={...}>
  Ver perfil</Link></Button>`.
- **Esforço sem o gap resolvido:** L (re-arquitetura por causa do
  asChild + variant rename) em 25 sites; M nos outros 47.
- **Draft de issue:** **Draft E1**.

#### DataBadge

- **brasil-a-vera:** `src/design-system/compositions/data-badge.tsx`,
  12 arquivos / 45 sites.
- **RDS aproximado:** `Badge` em `.`.
- **Gap exato:** DataBadge tem 4 slots: `label`, `source`, `icon`,
  `tone` (6 valores: `default | success | warning | destructive |
  accent | brand`). RDS `Badge` aceita só `children + variant + size +
  style`. Faltam: campo `source` (texto sub-label que renderiza
  abaixo do label, padrão "fonte oficial"); slot `icon` (`leftIcon`
  similar ao Button do RDS); tones `accent` e `brand` (RDS tem
  `info`/`neutral`/`primary`/`secondary`, não bate).
- **Sites afetados:** 45 (todos usam pelo menos `label` + `tone`; ~30
  usam `icon`; ~15 usam `source`).
- **Exemplo:** `src/components/parlamentar/perfil-header.tsx` faz
  `<DataBadge label={legislatura} icon={<Calendar/>} source="Câmara
  dos Deputados" tone="default" />`.
- **Esforço sem o gap resolvido:** envolveria reescrever DataBadge
  para wrap `Badge` + texto extra do `source` lateral; ~M por site.
- **Draft de issue:** **Draft E2**.

#### FilterChip

- **brasil-a-vera:** `src/design-system/compositions/filter-chips.tsx`,
  9 arquivos / 40 sites.
- **RDS aproximado:** `Chip` em `./server` (server-safe).
- **Gap exato:** `Chip` aceita `children + variant + size + onRemove +
  selected + disabled + onClick + tabIndex`. Brasil-a-vera tem
  `selected` (✓), mas também `count` (badge numérico em pill ao
  lado do label — "Tramitando · 32") e `asChild` para integrar
  com `<Link href="?tipo=PL">`. RDS `Chip` é interativo (`onClick`)
  mas não é polimórfico — não vira `<a href>` sem wrap externo.
  Faltam: prop `count`, prop `asChild`/`as`.
- **Sites afetados:** 40 (todos usam `selected`; ~25 usam contagem
  inline; todos usam wrap em `<Link>`).
- **Exemplo:** `src/components/proposicao/filtros.tsx` faz
  `<FilterChip asChild selected={tipo === 'PL'} count={32}><Link
  href="?tipo=PL">PL</Link></FilterChip>`.
- **Esforço sem o gap resolvido:** alto — o padrão "chip como link"
  é base de toda a navegação por filtros do app. Sem `asChild`, o
  consumer migra para `onClick + router.push` (perda: pré-carga do
  Next, JS extra, deixa de funcionar com cookies-off).
- **Draft de issue:** **Draft E3**.

#### Accordion (Root + Item + Trigger + Content)

- **brasil-a-vera:** `src/design-system/primitives/accordion.tsx`,
  3 arquivos / 3 sites Root, 3 / 16 cada subcomponente.
- **RDS aproximado:** `Accordion` em `.`.
- **Gap exato:** RDS `Accordion` é **declarativo**, recebe
  `items: AccordionItem[]` (com `id`, `title`, `content` como
  campos de objeto). Brasil-a-vera usa **composicional**
  (`<AccordionItem><AccordionTrigger>...</AccordionTrigger>
  <AccordionContent>...</AccordionContent></AccordionItem>`),
  permitindo JSX rico no trigger (ícones, `<SectionCard>`,
  badges) e no content. O modelo do RDS exige serializar o conteúdo
  em ReactNode embutido em objeto, o que é factível mas trava
  algumas afordâncias (ex.: trigger custom com layout). Falta:
  variante compound (Radix-like).
- **Sites afetados:** os 3 consumers (perfis dos detalhes
  parlamentar/proposicao/votacao no mobile).
- **Exemplo:** `src/app/parlamentares/[id]/page.tsx` faz `<Accordion
  type="single"><AccordionItem value="alinhamento">
  <AccordionTrigger><Activity className="mr-2"/>Alinhamento</
  AccordionTrigger><AccordionContent>...</AccordionContent>
  </AccordionItem></Accordion>`.
- **Esforço sem o gap resolvido:** L — refatorar 3 perfis para o
  modelo declarativo, perdendo a estrutura compound.
- **Draft de issue:** **Draft E4**.

#### Label

- **brasil-a-vera:** `src/design-system/primitives/label.tsx`,
  5 arquivos / 15 sites.
- **RDS aproximado:** `Label` em `.`.
- **Gap exato:** RDS tem `variant: 'default' | 'required' |
  'optional'` — útil. Brasil-a-vera não passa variant; é só wrapper
  de `<label htmlFor>` com classe Tailwind. Substituição direta
  funciona, mas tem efeitos colaterais: (a) RDS pode injetar marca
  visual "*" para `required`, alterando layout; (b) classes de
  cor/peso podem divergir do que o consumer espera. Falta: prop
  `className`-override-friendly compatível com os tokens
  `text-foreground` do brasil-a-vera.
- **Sites afetados:** 15.
- **Exemplo:** `src/components/painel/configuracoes/form-perfil.tsx`
  usa `<Label htmlFor="nome">Nome</Label>`.
- **Esforço sem o gap resolvido:** S por site, mas exige varredura
  visual em todos os formulários do painel.
- **Draft de issue:** **Draft E5**.

#### Separator

- **brasil-a-vera:** `src/design-system/primitives/separator.tsx`,
  1 arquivo / 10 sites.
- **RDS aproximado:** `Separator` em `.`.
- **Gap exato:** o brasil-a-vera é wrapper de Radix Separator
  (`orientation`, `decorative`). RDS tem `orientation` + `variant`
  (`solid | dashed | dotted`) — superior em features. Mas RDS é
  `HTMLAttributes<HTMLHRElement>`, ou seja, vira `<hr>`; o consumer
  do brasil-a-vera usa em layouts de `<nav>` lateral onde `<hr>`
  semanticamente atrapalha (sem `decorative` controlando role).
  Falta: prop `decorative?: boolean` que troque o elemento subjacente
  ou ao menos zere `role`.
- **Sites afetados:** 10 (todos em página de docs).
- **Exemplo:** `src/app/docs/page.tsx` usa `<Separator
  className="my-8" />` entre seções de prosa.
- **Esforço sem o gap resolvido:** S, mas exige auditar a11y.
- **Draft de issue:** **Draft E6**.

#### DialogContent

- **brasil-a-vera:** `src/design-system/primitives/dialog.tsx`,
  8 arquivos / 8 sites.
- **RDS aproximado:** `Dialog.Content` em `.`.
- **Gap exato:** RDS tem `size: 'sm' | 'md' | 'lg' | 'xl' |
  'fullscreen'` e `closeOnOverlayClick`, `closeOnEscape`. Brasil-a-
  vera não tem `size` explícito (usa `className` direto) e o close
  button é **embutido fixo** no `DialogContent` shadcn (não há prop
  para esconder — obs. 7 do inventário documenta esse exato gap como
  motivo para 3 consumers do painel usarem Radix direto). O RDS
  pode estar na mesma situação. Falta: confirmação de que RDS
  `Dialog.Content` aceita `showCloseButton?: boolean` (Popover do
  RDS tem essa prop, então pode existir; checar). Sem essa flag,
  o painel não pode migrar (3 modais não-fecháveis).
- **Sites afetados:** 8 totais; 3 ficam bloqueados (ConsentModal,
  AcoesLgpd, MigracaoLocalStorageModal).
- **Exemplo:** `src/components/painel/consent-gate/consent-modal.tsx`
  usa Radix direto justamente para não ter X automático.
- **Esforço sem o gap resolvido:** M (5 sites diretos) + L (3 sites
  com Radix direto que precisariam reverter para DS).
- **Draft de issue:** **Draft E7**.

#### Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter

- **brasil-a-vera:** `src/design-system/primitives/card.tsx`,
  3–4 arquivos / 3–7 sites cada (6 subcomponentes).
- **RDS aproximado:** `Card` em `.` (sem subcomponentes).
- **Gap exato:** RDS oferece apenas o wrapper `Card` (com `variant:
  'default' | 'hover' | 'selected'`, `padding`, `onClick`). Não
  tem `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
  `CardFooter`. Brasil-a-vera depende dos slots para estruturar
  todos os ParlamentarCard/ProposicaoCard/VotacaoCard/CardKpi
  internos. Sem esses, o consumer reescreve a tipografia interna
  manualmente (perde consistência).
- **Sites afetados:** 7 sites do `Card` raiz + ~16 sites somando os
  subcomponentes em consumers diretos. Indiretamente, ~30+ via
  cards de domínio que herdam o layout.
- **Exemplo:** `src/components/home/card-parlamentares.tsx` faz
  `<Card><CardHeader><CardTitle>Parlamentares</CardTitle>
  <CardDescription>...</CardDescription></CardHeader><CardContent>
  ...</CardContent></Card>`.
- **Esforço sem o gap resolvido:** L — reescreve 23+ sites com
  divs + classes manuais.
- **Draft de issue:** **Draft E8**.

#### Input

- **brasil-a-vera:** `src/design-system/primitives/input.tsx`,
  3 arquivos / 5 sites.
- **RDS aproximado:** `Input` em `.`.
- **Gap exato:** RDS oferece muito mais (`label`, `error`, `success`,
  `helperText`, `size`, `variant`, `leftIcon`, `rightIcon`,
  `showClearButton`, `onClear`). Brasil-a-vera usa input "puro" —
  só `React.ComponentProps<'input'>`. Substituir é OK, mas
  formulários atuais não passam `label` (renderizam `<Label>` ao
  lado); usar a prop `label` do RDS muda a estrutura DOM. Falta:
  modo "bare" sem chrome embutido (label + helperText) para
  preservar o layout atual.
- **Sites afetados:** 5.
- **Exemplo:** `src/components/busca/search-form.tsx` usa `<Input
  name="q" defaultValue={defaultValue} placeholder="Buscar..."/>`.
- **Esforço sem o gap resolvido:** M por site (auditar cada
  formulário e decidir se ganha chrome do RDS ou fica bare).
- **Draft de issue:** **Draft E9**.

#### Combobox / Command family

- **brasil-a-vera:** `src/design-system/compositions/combobox.tsx` +
  `src/design-system/primitives/command.tsx` (cmdk wrapper),
  2 arquivos / 4 sites Combobox.
- **RDS aproximado:** `Autocomplete` ou `CommandPalette` em `.`.
- **Gap exato:** brasil-a-vera Combobox é "select com busca para 1
  valor" (Filtros de parlamentar usam para Partido/UF, Filtros de
  proposição usa para Tema). RDS `Autocomplete` é parecido mas:
  (a) controle de valor selecionado é via `onSelect`, não via
  `form` field hidden — brasil-a-vera depende do `<input
  type="hidden" name={name}>` para integração com form GET nativo
  (SearchForm é form GET sem JS); (b) RDS `CommandPalette` é
  trigger-based (Cmd+K), não inline select. Faltam: hidden input
  para form-GET, prop `allOptionLabel` (atualmente brasil-a-vera
  permite "Todos"), modo inline (não-trigger).
- **Sites afetados:** 4.
- **Exemplo:** `src/components/parlamentar/filtros.tsx` usa
  `<Combobox name="partido" options={partidos} defaultValue={...}
  allOptionLabel="Todos os partidos"/>` dentro de form GET.
- **Esforço sem o gap resolvido:** L — afeta 2 formulários de
  filtro de listagem, base do UX de descoberta.
- **Draft de issue:** **Draft E10**.

#### EmptyState

- **brasil-a-vera:** `src/components/ui/empty-state.tsx`,
  3 arquivos / 3 sites.
- **RDS aproximado:** `EmptyState` em `.`.
- **Gap exato:** brasil-a-vera tem `icon: LucideIcon`, `title:
  string`, `description?: string`, `action?: ReactNode`. RDS tem
  `title: string`, `message: string` (obrigatório, equivale a
  description), `actionLabel?: string`, `onAction?: () => void`,
  `illustration?: ReactNode`, `variant: 'default' | 'withAction' |
  'withIllustration'`. Os gaps:
  1. `message` é **obrigatório** no RDS; brasil-a-vera permite
     vazio.
  2. `action` no brasil-a-vera é ReactNode livre (permite
     `<Button asChild><Link>...</Link></Button>`); RDS exige par
     `actionLabel + onAction`, perdendo `Link` Next nativo.
  3. RDS chama de `illustration` o que brasil-a-vera chama de
     `icon` (LucideIcon); modelo de aceite difere (ReactNode vs
     componente-tipo).
- **Sites afetados:** 3.
- **Exemplo:** `src/app/parlamentares/page.tsx` usa `<EmptyState
  icon={Search} title="Nenhum parlamentar encontrado" description=
  "Ajuste os filtros." action={<Button asChild><Link href="/
  parlamentares">Limpar</Link></Button>}/>`.
- **Esforço sem o gap resolvido:** M por site (perder o `<Link>`
  obriga client navigation com `router.push`).
- **Draft de issue:** **Draft E11**.

#### Toaster / sonner

- **brasil-a-vera:** `src/design-system/primitives/sonner.tsx`,
  2 arquivos / 2 sites.
- **RDS aproximado:** `ToastContainer` + `useToast` em `.`.
- **Gap exato:** Sonner é uma lib completa (`sonner` upstream); o
  RDS expõe API própria (`useToast().success/error/warning/info/
  show/withUndo/dismiss/clearAll`). Migração viável tecnicamente,
  mas o brasil-a-vera tem `theme="dark"` hardcoded e ícones lucide
  customizados (CircleCheck/Info/TriangleAlert/OctagonX/
  LoaderCircle) que precisam ser reaplicados no `ToastContainer`
  do RDS. Falta: confirmação de que `ToastContainer` aceita slot
  para ícones custom e theme override.
- **Sites afetados:** 2 (1 mount no layout + 1 wrapper de uso).
- **Exemplo:** `src/app/layout.tsx` faz `<Toaster theme="dark"/>`.
- **Esforço sem o gap resolvido:** M (reescrita do `<Toaster>` + 1
  refactor onde o brasil-a-vera chama `toast.success` da api do
  sonner direto).
- **Draft de issue:** **Draft E12**.

#### DialogTitle / DialogHeader / DialogDescription

- **brasil-a-vera:** `src/design-system/primitives/dialog.tsx`,
  6 arquivos / 6 sites cada.
- **RDS aproximado:** `Dialog.Title` / `Dialog.Header` /
  `Dialog.Description` (Header/Footer também em `./server`).
- **Gap exato:** **DialogHeader e DialogFooter estão no server entry
  do RDS, mas DialogTitle e DialogDescription só estão no entry `.`
  (client)**. Inconsistência: para usar Header em RSC, o
  Title/Description filho precisa virar string ou via prop, ou
  marcar tudo client. Não é gap intransponível, mas obriga
  consumer-side decisão por arquivo.
- **Sites afetados:** 6 cada.
- **Exemplo:** painel/onboarding-wizard.tsx (client) é OK; mas
  qualquer Dialog que queira RSC para o conteúdo paga preço.
- **Esforço sem o gap resolvido:** S; usar em client onde
  brasil-a-vera já usa client (Dialog inteiro hoje é client).
- **Observação:** não vou abrir issue separada — fica capturada no
  Draft E7 (que pede mais consistência no Dialog family).

#### Popover / PopoverContent / PopoverTrigger

- **brasil-a-vera:** `src/design-system/primitives/popover.tsx`,
  1 arquivo / 1 site cada.
- **RDS aproximado:** `Popover` em `.`.
- **Gap exato:** RDS `Popover` é monolítico (`trigger` como prop +
  `children` como content), não compound. Brasil-a-vera usa compound
  Radix-like. Trocar exige reescrever o único consumer (Combobox)
  para extrair o `trigger` em prop.
- **Sites afetados:** 1 (consumer indireto via Combobox).
- **Observação:** baixa prioridade — não vou abrir issue separada
  porque o uso só existe via Combobox, que já tem Draft E10 com
  escopo mais amplo.

#### Command / CommandInput / CommandList / CommandGroup / CommandEmpty / CommandItem

- **brasil-a-vera:** `src/design-system/primitives/command.tsx`,
  1 arquivo / 1 site cada (CommandItem: 1 / 2).
- **RDS aproximado:** `CommandPalette` em `.`.
- **Gap exato:** brasil-a-vera usa cmdk como **biblioteca compound**
  (`<Command><CommandInput/><CommandList><CommandGroup>
  <CommandItem/></CommandGroup></CommandList></Command>`). RDS
  oferece `CommandPalette` declarativo com `items: CommandItem[]`
  (trigger-based, Cmd+K). API muito divergente. Combobox no
  brasil-a-vera usa cmdk inline (não trigger). Falta: API inline /
  compound no RDS.
- **Sites afetados:** 1 (Combobox).
- **Observação:** capturado em Draft E10.

### Categoria 3 — Falta no RDS (11 componentes)

Componentes do brasil-a-vera que parecem genéricos o suficiente para
viver no RDS (não dependem de tipos do domínio), e que o RDS hoje
não oferece.

#### SectionCard

- **brasil-a-vera:** `src/design-system/compositions/section-card.tsx`,
  8 / 28 sites — composição altamente reutilizada.
- **Justificativa de generalidade:** "Cabeçalho com título +
  subtítulo opcional + ícone opcional + badge opcional, conteúdo
  embaixo, dentro de um card com border + bg-surface". Padrão
  genérico de painel/dashboard que qualquer app cívico ou interno
  usaria. RDS tem `Card` + `PageHeader`, mas falta a composição
  "Card-com-Header-estruturado". `PageHeader` é para o topo da
  página inteira; `Card` é só wrapper.
- **Draft de issue:** **Draft N1**.

#### FilterChips (wrapper de grupo)

- **brasil-a-vera:** `src/design-system/compositions/filter-chips.tsx`
  (`FilterChips`), 9 / 18 sites.
- **Justificativa de generalidade:** wrap de Chips com rótulo de
  grupo opcional (`label` acima/lateral) e suporte a wrap responsivo.
  RDS tem `Chip` mas não o agrupador. Padrão típico de painel de
  filtros (e-commerce, dashboards). Bom complemento do par
  Chip/FilterChip-with-count.
- **Draft de issue:** **Draft N2**.

#### HeroSection

- **brasil-a-vera:** `src/design-system/compositions/hero-section.tsx`,
  7 / 14 sites.
- **Justificativa de generalidade:** hero pattern com slots
  (`kicker`, `title`, `description`, `actions`, `kpis`, `meta`) e
  3 variantes visuais (`plain`/`gradient`/`gradient-glow`) + 2
  alinhamentos. RDS tem `PageHeader` mas é mais simples (title +
  description + breadcrumb + actions, sem kpis nem variant gradient).
  Hero é distinto: pode levar grupo de KPIs e variantes visuais
  pesadas. Brasil-a-vera tem classes utilitárias (`bg-hero`,
  `grid-bg`, `hero-glow`) que poderiam virar tokens no RDS.
- **Draft de issue:** **Draft N3**.

#### KpiStrip

- **brasil-a-vera:** `src/design-system/compositions/kpi-strip.tsx`,
  7 / 9 sites.
- **Justificativa de generalidade:** strip horizontal de KPIs (ícone
  + label + valor + hint + tone) com divisores verticais
  (`divide-border`) e cap em 4 colunas responsivo. Padrão
  ultra-genérico de dashboard. RDS não tem nada equivalente —
  `DataGrid` é tabela, não strip.
- **Draft de issue:** **Draft N4**.

#### KpiCard

- **brasil-a-vera:** `src/design-system/compositions/kpi-card.tsx`,
  3 / 7 sites.
- **Justificativa de generalidade:** lista de KPIs como cards em
  grid (igual KpiStrip, mas em layout de cards independentes com
  variante `floatingBadge`). Genérico. Complemento natural do
  KpiStrip; vale par.
- **Draft de issue:** **Draft N5**.

#### SectionNav (scrollspy)

- **brasil-a-vera:** `src/design-system/compositions/section-nav.tsx`,
  4 / 5 sites.
- **Justificativa de generalidade:** nav lateral/topo sticky com
  IntersectionObserver para destacar a seção visível.
  Padrão clássico de longreads + perfis de detalhe. Genérico (não
  amarrado a domínio). RDS não tem; o mais perto seria `Navigation`
  (estado ativo via prop), mas falta a parte scrollspy.
- **Draft de issue:** **Draft N6**.

#### StatsGrid

- **brasil-a-vera:** `src/design-system/compositions/stats-grid.tsx`,
  4 / 5 sites.
- **Justificativa de generalidade:** grid de stats com truque
  visual `gap-px` em cima de `bg-border` para criar divisores 1px
  consistentes em qualquer largura. Pode parecer KpiStrip duplicado,
  mas é um pattern visual distinto (grid vs strip horizontal). Vale
  ou consolidar (StatsGrid = variant de KpiStrip) ou expor
  separado.
- **Draft de issue:** **Draft N7**.

#### TabBar (painel) + SubTabs (painel × 2)

- **brasil-a-vera:** `src/components/painel/tab-bar.tsx` (1/1) +
  `src/components/painel/parlamentares/sub-tabs.tsx` (1/1) +
  `src/components/painel/alertas/sub-tabs.tsx` (1/1).
- **Justificativa de generalidade:** padrão "tabs como navegação"
  (links com `?tab=` ou `?subtab=`), não como widget interativo
  com state. Distinto do `Tabs` Radix-like do RDS (que assume
  `<TabsTrigger value="x">` controlado por context). O brasil-a-
  vera tem `usePathname/useSearchParams` decidindo qual tab está
  ativa via URL — padrão usual em SPAs server-rendered. RDS poderia
  oferecer `TabsAsLinks` ou similar.
- **Draft de issue:** **Draft N8**.

#### Sparkline12m

- **brasil-a-vera:** componente **interno** em
  `src/components/parlamentar/alinhamento.tsx`, não exportado.
- **Justificativa de generalidade:** SVG sparkline manual (sem
  Recharts) para 12 pontos mensais. Pode ser generalizado para
  qualquer sparkline de N pontos. RDS tem `Progress` mas não
  Sparkline. Genérico para qualquer dashboard com tendência
  numérica. Vale exportar como primitiva server-renderizada.
- **Draft de issue:** **Draft N9**.

### Categoria 4 — Fica no consumidor (94 componentes)

Agrupados por área. Para cada grupo, as primitivas RDS que
provavelmente seriam usadas internamente na implementação migrada.

#### Domain de parlamentar (13 componentes)

`ParlamentarCard`, `PerfilHeader` (parlamentar), `FollowButton`,
`CompartilharButton`, `Filtros` (parlamentar), `Top5Afinidade`,
`AlinhamentoBancada`, `GastosResumoBlock`, `GastosChart`,
`ProposicoesAutor`, `VotosRecentes`, `ParesContraditorios`,
`PerfilParlamentar` (perfil page).
**Primitivas RDS internas prováveis:** `Card`, `Avatar`, `Badge`,
`Progress`, `Button`, `Skeleton`, `Tooltip`, `Chip` (filtros), `Text`,
`Stack`, `Separator`, `Tabs` (perfil), `Timeline` (tramitação),
`useToast` (compartilhar).

#### Domain de proposição (9 componentes)

`ProposicaoCard`, `PerfilProposicaoHeader`,
`BarraProgressoTramitacao`, `AutoresList`, `TemasList`,
`TramitacaoTimeline`, `VotacoesVinculadas`, `Filtros` (proposicao),
`ApoioPartidoChart`, `VotosConsolidadosChart` (prop),
`CompartilharProposicaoButton`, `FooterCrossLinks`.
**Primitivas RDS internas prováveis:** `Card`, `Badge`, `Progress`,
`Chip`, `Timeline`, `Text`, `Stack`, `Separator`, `Tabs`, `Dialog`
(compartilhar).

#### Domain de votação (12 componentes)

`VotacaoCard`, `PerfilVotacaoHeader`, `MargemDecisaoBar`,
`ProposicaoVinculada`, `RebeldesList`, `Filtros` (votacao),
`VotosResumo`, `VotosPorPartido`, `VotosIndividuais` (client),
`VotacoesRelacionadasFooter`, `CompartilharVotacaoButton`,
`VotacaoPorPartidoChart`, `VotacaoVotosConsolidadosChart`,
`DisciplinaPartidariaChart`, `VotacaoHemicicloChart`.
**Primitivas RDS internas prováveis:** `Card`, `Badge`, `Progress`
(margem), `Chip`, `Table` (votos por partido), `Text`, `Stack`,
`Dialog` (compartilhar).

#### Domain de partido (5 componentes)

`PartidoHeader`, `BancadaList`, `FidelidadeMediaBlock`,
`GastoBancadaBlock`, `TopTemasPartido`.
**Primitivas RDS internas prováveis:** `Card`, `Badge`, `Progress`,
`Text`, `Stack`, `Avatar`.

#### Domain de comparar (2 componentes)

`ConcordanciaMatrix`, `ParlamentaresGrid`.
**Primitivas RDS internas prováveis:** `Card`, `Text`, `Stack`,
`Avatar`.

#### Domain de home (3 componentes)

`CardParlamentares`, `CardVotacoesSemana`, `FeaturesGrid`.
**Primitivas RDS internas prováveis:** `Card`, `Badge`, `Text`,
`Stack`, `Button`.

#### Domain de busca + export (2 componentes)

`SearchForm`, `ExportCsvLink`.
**Primitivas RDS internas prováveis:** `Input`/`SearchInput`,
`Button`.

#### Domain de site/shell (7 componentes)

`Navbar`, `Footer`, `AuthSlot`, `AuthIsland`, `AuthIslandLoader`,
`NavLinks`, `NavMobile`.
**Primitivas RDS internas prováveis:** `Header` (compound),
`HeaderLogo`, `HeaderNavigation`, `HeaderActions`,
`HeaderHamburger`, `HeaderMobileMenu`, `Drawer` (nav mobile),
`NavLink`, `Navigation`. Note: a topologia "zero-JS para anônimo"
(ADR-022) tem que ser preservada via split server/client manual
no brasil-a-vera — Header do RDS provavelmente é client por inteiro,
o que tornaria essa migração L em todos esses 7 itens.

#### Domain de painel/área logada (28 componentes)

`PainelHeader`, `TabBar`, `ActiveSlotPicker`, `EstadoNovo`,
`EstadoOnboarding`, `EstadoMaduro`, `OnboardingWizard`,
`ConsentGate`, `ConsentModal`, `MigracaoLocalStorageModal`,
`SubTabs` (parlamentares e alertas), `ListaAcompanhando`,
`ListaDaMinhaUf`, `BannerMudancaUf`, `FormUfInline`,
`ModalRevisarUfAntiga`, `ListaRecebidos`, `ItemRecebido`,
`FormPoliticas`, `FormPerfil`, `ComunicacaoToggles`, `TemasChips`,
`AcoesLgpd`.
**Primitivas RDS internas prováveis:** `Dialog`, `Form`,
`FormField`, `Input`, `Switch`, `Checkbox`, `Chip` (temas),
`Button`, `Card`, `Badge`, `Stack`, `Text`, `EmptyState`,
`Stepper` (onboarding wizard), `useToast`.

#### Showroom + docs (10 componentes)

`Swatch`, `SidebarNav` (docs), `DocsHeader`, `Section` (docs),
`P` (docs), `Ul` (docs), `Li` (docs), `InternalLink` (docs),
`ExternalLink` (docs).
**Primitivas RDS internas prováveis:** `Text`, `Stack`,
`Navigation`/`NavLink`, `Breadcrumb` (DocsHeader poderia usar).
**Observação:** todos os helpers de `_components/typography.tsx`
poderiam ser substituídos por `Text` (variant paragraph/heading/
label) + `Stack`. Mas o ROI é baixo e o doc do arquivo pede
explicitamente não generalizar.

#### Trust + utilitários (4 componentes)

`TrustBadge`, `TrustBanner` (órfão), `EmptyState` (componente do
brasil-a-vera, já em categoria 2), `Sparkline12m` (interno,
em categoria 3 como N9).
**Primitivas RDS internas prováveis:** `Badge`, `Tooltip`, `Info`.

## Drafts de issue (NÃO abrir — só rascunho)

### Enhancement drafts

#### Draft E1 — `Button`: adicionar variante `link` + `asChild` ou polimórfico que aceite Next `Link`

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** O brasil-a-vera tem 72 call sites de `Button`,
  espalhados por 28 arquivos. Cerca de 25 desses usam o padrão
  shadcn-style `<Button asChild><Link href={...}>...</Link></Button>`
  para combinar estilo de botão com navegação Next.js (prefetch,
  scroll restoration, link rel/target). Outros usam variante `link`
  para botões com aparência de link.

  **Gap.** RDS 3.0.0 `Button` aceita `as` (polimórfico) + `href` +
  `target`, mas não há clareza na doc sobre como passar um
  `next/link` como `as` mantendo o `prefetch={false}` etc.
  Adicionalmente, a variante `link` (botão texto que parece link)
  não existe — RDS tem `primary | secondary | error | outline |
  ghost | iconOnly`. Para o consumer, isso obriga:
  1. trocar `<Button asChild><Link>...</Link></Button>` por
     `<Button as={Link} href={...}>...</Button>`, mas só funciona
     se `as` passar `href` para o componente filho corretamente
     (precisa documentar);
  2. recriar a variante `link` no consumer-land.

  **Impacto.** 72 sites totais; 25+ dependem de polimorfismo com
  `next/link`. Sem essa peça, migração desses 25 vira reescrita
  por arquivo.

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera atual:
  <Button asChild variant="ghost" size="sm">
    <Link href={`/parlamentares/${id}`}>Ver perfil</Link>
  </Button>

  // brasil-a-vera variant link:
  <Button variant="link" asChild>
    <Link href="/sobre">Saiba mais</Link>
  </Button>
  ```

  **Pedido.**

  1. Adicionar variant `link` (estilo: text-brand, underline on
     hover, sem chrome de botão).
  2. Documentar (e testar) `as={Link}` passando `href` para o
     componente filho, idealmente compatível com `next/link`.
  3. Alternativamente: adicionar prop `asChild` Radix-like que
     compõe o estilo no filho. Permite preservar APIs nativas do
     filho (`<Link prefetch={false}>`).

  **Critério de aceite.**

  - [ ] Variant `link` existe e tem snapshot visual.
  - [ ] Receita documentada em README mostrando `<Button as={Link}
        href="..." prefetch={false}>...</Button>` funcionando.
  - [ ] Ou `asChild` aceito e testado contra Radix Slot pattern.
  - [ ] Smoke no brasil-a-vera passa em pelo menos 1 site
        representativo (`ExportCsvLink` faz mais sentido como caso
        de teste).

#### Draft E2 — `Badge`: adicionar slots `icon` e `source`, tones `accent` e `brand`

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** `DataBadge` (composição interna do brasil-a-vera)
  é o 2º componente mais usado do codebase (12 arquivos, 45 sites).
  Estende `Badge` com (a) ícone à esquerda, (b) texto "fonte oficial"
  abaixo do label, (c) tones `accent`/`brand` específicos.

  **Gap.** RDS `Badge` aceita `children + variant + size + style`.
  Falta:
  - prop `icon: ReactNode` (renderizada antes do children);
  - prop `source: ReactNode` (renderizada como sub-label abaixo,
    `text-foreground-subtle text-xs`);
  - variants `accent` e `brand` (no design-system do brasil-a-vera
    são tons institucionais, separados de `info`/`primary`).

  **Impacto.** 45 sites diretos. Sem isso, brasil-a-vera mantém
  `DataBadge` como composição própria sobre `Badge` do RDS — não é
  inviável, mas perde-se a oportunidade de unificar.

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera DataBadge atual:
  <DataBadge label="62ª Legislatura" icon={<Calendar />}
             source="Câmara dos Deputados" tone="default" />
  ```

  **Pedido.**

  1. Adicionar `icon?: ReactNode` ao `Badge`.
  2. Adicionar `source?: ReactNode` ao `Badge` (slot opcional de
     sub-label).
  3. Adicionar variants `accent` e `brand` à `BadgeVariant`.

  **Critério de aceite.**

  - [ ] Snapshot/screenshot do Badge com ícone + source visível.
  - [ ] Tipo `BadgeVariant` inclui `'accent' | 'brand'`.
  - [ ] Smoke no brasil-a-vera: 1 site real (`PerfilHeader` do
        parlamentar) renderiza com Badge do RDS.

#### Draft E3 — `Chip`: prop `count` e `asChild`/polimórfico para virar `<a>` Next

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** O brasil-a-vera tem `FilterChip` (composição) com
  40 sites em 9 arquivos. Usado intensivamente em listagens
  (parlamentares, proposições, votações) como navegação por filtros
  via URL.

  **Gap.** RDS `Chip` aceita `children + variant + size + onRemove +
  selected + disabled + onClick + tabIndex`. Faltam:
  1. prop `count?: number` (renderiza pequeno badge numérico ao
     lado do label, ex.: "Tramitando · 32");
  2. polimorfismo (`asChild` ou `as={Link}`) para virar um link
     real, indispensável para navegação por filtros que tem que
     respeitar SSR + prefetch + funcionar sem JS.

  **Impacto.** 40 sites. Brasil-a-vera roda em Cloudflare Workers
  com cache de edge e zero-JS-anônimo (ADR-022); listagens são
  100% server-rendered. Sem `asChild`/`as={Link}`, os filtros
  precisariam de `onClick + router.push`, perdendo a navegação
  estática.

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera FilterChip atual:
  <FilterChip asChild selected={tipo === 'PL'} count={32}>
    <Link href={buildHref({ tipo: 'PL' })}>PL</Link>
  </FilterChip>
  ```

  **Pedido.**

  1. Adicionar `count?: number` ao `Chip`.
  2. Suportar polimorfismo (`as={Link}` + `href`, ou `asChild`
     Radix Slot).

  **Critério de aceite.**

  - [ ] Snapshot do Chip com count visível.
  - [ ] Chip pode ser renderizado como `<a>` ou `next/link`
        preservando estilo + estado `selected`.
  - [ ] Smoke no brasil-a-vera: `src/components/proposicao/
        filtros.tsx` migra para `Chip` do RDS sem perder
        navegação estática.

#### Draft E4 — `Accordion`: API compound (Item/Trigger/Content) além do declarativo

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** Os perfis de detalhe do brasil-a-vera
  (parlamentar/proposicao/votacao) usam `Accordion` no breakpoint
  mobile para envolver `SectionCard`s. Cada item do accordion tem
  trigger custom com ícone lucide + texto + (às vezes) badge,
  e content RSC complexo.

  **Gap.** RDS `Accordion` é declarativo (`items:
  AccordionItem[]`). Cada item é `{ id, title: string, content:
  ReactNode }`. Isso impede:
  - trigger custom com JSX no título (ícone + texto + badge);
  - lazy mount do content quando o item ainda não foi aberto (não
    é claro no tipo);
  - composição com `SectionCard` (precisa serializar tudo em
    `content`).

  **Impacto.** 3 consumers diretos (perfis de detalhe), mas cada
  consumer tem ~6 sections embedded — somam ~16 sites de
  `AccordionItem`/`Trigger`/`Content` no inventário.

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera atual:
  <Accordion type="single" collapsible>
    <AccordionItem value="alinhamento">
      <AccordionTrigger>
        <Activity className="mr-2" /> Alinhamento partidário
      </AccordionTrigger>
      <AccordionContent>
        <AlinhamentoBancada {...} />
      </AccordionContent>
    </AccordionItem>
    {/* ... mais 5 itens */}
  </Accordion>
  ```

  **Pedido.** Expor também a forma compound:

  ```tsx
  <Accordion type="single">
    <Accordion.Item value="x">
      <Accordion.Trigger>JSX aqui</Accordion.Trigger>
      <Accordion.Content>JSX rico aqui</Accordion.Content>
    </Accordion.Item>
  </Accordion>
  ```

  Mantendo retrocompatibilidade com a API declarativa.

  **Critério de aceite.**

  - [ ] `Accordion.Item`, `Accordion.Trigger`, `Accordion.Content`
        exportados.
  - [ ] Trigger aceita ReactNode (não só string).
  - [ ] Smoke: 1 perfil de detalhe do brasil-a-vera renderiza
        com a API compound.

#### Draft E5 — `Label`: modo bare (sem afetar cor/peso) + `decorative`-friendly

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** `Label` do brasil-a-vera é wrapper de
  `<label htmlFor>` com classe Tailwind `text-sm font-medium`,
  sem cor (herda do consumer). RDS `Label` tem variants `default |
  required | optional` que provavelmente injetam marcas visuais
  ("*"), pesos diferentes e talvez cor.

  **Gap.** Falta modo "bare" — variant `none` ou prop
  `unstyled?: boolean` — que não injete cor/peso e deixe o
  consumer controlar tudo via className. Sem isso, formulários do
  brasil-a-vera que dependem da herança de `text-foreground` vão
  pintar incorretamente.

  **Impacto.** 15 sites.

  **Pedido.** Adicionar variant `none` ou prop `unstyled`.

  **Critério de aceite.**

  - [ ] Label com `variant="none"` (ou `unstyled`) só aplica
        `<label htmlFor>` sem cor/peso embutidos.
  - [ ] Smoke: form do painel renderiza sem regressão visual.

#### Draft E6 — `Separator`: prop `decorative` que ajuste role/elemento

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** `Separator` do RDS hoje vira `<hr>`. Em vários
  contextos do brasil-a-vera (divisores dentro de `<nav>`, de
  cards), o `<hr>` adiciona role "separator" semântico que
  atrapalha screen readers.

  **Gap.** Falta prop `decorative?: boolean` que troque para
  `<div role="presentation">` ou similar (padrão Radix Separator).

  **Impacto.** 10 sites diretos. Auditoria visual também afeta
  cards de domínio (PartidoHeader, ParlamentarCard) que usam
  divisores internos.

  **Pedido.** Adicionar `decorative?: boolean` como no Radix
  Separator.

  **Critério de aceite.**

  - [ ] `Separator decorative` não tem role "separator".
  - [ ] Existência de teste a11y validando isso.

#### Draft E7 — `Dialog.Content`: prop `showCloseButton` + Title/Description/Trigger no server entry quando possível

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** O painel (área logada Wave 10) tem 3 modais que
  hoje usam `DialogPrimitive` direto do Radix (`ConsentModal`,
  `AcoesLgpd`, `MigracaoLocalStorageModal`). Os comentários nos
  arquivos explicam: precisam remover o botão X automático do
  `DialogContent` do shadcn — esses modais não devem ser fecháveis
  diretamente (Consent só fecha com aceite; LGPD só com fricção
  crescente).

  **Gap.** RDS `Dialog.Content` aceita `closeOnOverlayClick`,
  `closeOnEscape`, mas (provavelmente) não `showCloseButton?:
  boolean`. Se um botão X é injetado por padrão, esses 3 sítios
  não podem migrar para o DS.

  Adicional: `DialogHeader` e `DialogFooter` estão no server entry
  (`./server`), mas `DialogTitle` e `DialogDescription` estão
  apenas no entry `.`. Inconsistência: quem usa Dialog em RSC fica
  preso a importar tudo de `.`.

  **Impacto.** 8 sites diretos do `DialogContent` do brasil-a-vera;
  3 sites do painel ficam bloqueados sem `showCloseButton`.

  **Repro/exemplo.**

  ```tsx
  // ConsentModal precisa:
  <Dialog open={true} onOpenChange={() => {}}>
    <Dialog.Content showCloseButton={false}
                     closeOnOverlayClick={false}
                     closeOnEscape={false}>
      <Dialog.Header><Dialog.Title>...</Dialog.Title></Dialog.Header>
      {/* ...só fecha por click em "Aceito" */}
    </Dialog.Content>
  </Dialog>
  ```

  **Pedido.**

  1. Adicionar `showCloseButton?: boolean` (default true) ao
     `DialogContent`.
  2. Avaliar mover `DialogTitle` e `DialogDescription` para
     `./server` (Title/Description são apenas `<h2>`/`<p>`
     estilizados, sem hooks). Mesmo se ficar no entry `.`,
     documentar a inconsistência.

  **Critério de aceite.**

  - [ ] `showCloseButton={false}` esconde o X embutido.
  - [ ] Modal não-fechável (sem overlay/escape/X) renderiza.
  - [ ] Smoke: `ConsentModal` migra para Dialog do RDS.

#### Draft E8 — `Card`: subcomponentes `Header`, `Title`, `Description`, `Content`, `Footer`

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** RDS `Card` hoje é apenas o wrapper. O padrão shadcn
  (que o brasil-a-vera usa) tem 6 subcomponentes — `Card`,
  `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
  `CardFooter` — que estruturam tipograficamente o conteúdo do card
  com paddings/spacings consistentes.

  **Gap.** Sem subcomponentes, o consumer precisa replicar
  manualmente `<div className="px-6 pt-6 pb-3"><h3 className="..."
  >...</h3></div>` em cada card de domínio (ParlamentarCard,
  ProposicaoCard, VotacaoCard, etc).

  **Impacto.** ~16 sites em consumers diretos + ~30 indiretos via
  cards de domínio. Sem isso, qualquer card que migrar para `Card`
  RDS perde a hierarquia tipográfica embutida.

  **Pedido.** Expor:
  - `Card.Header` (ou `CardHeader`): wrapper com padding superior
    + bottom space.
  - `Card.Title` (`CardTitle`): `<h3 className="font-semibold
    leading-tight">`.
  - `Card.Description` (`CardDescription`): `<p className="text-
    sm text-foreground-muted">`.
  - `Card.Content` (`CardContent`): wrapper com padding lateral
    + bottom space.
  - `Card.Footer` (`CardFooter`): wrapper com border-t + padding.

  Pode ser via namespace (`Card.Header`) ou exports top level —
  alinha com Dialog/Drawer que já fazem ambos.

  **Critério de aceite.**

  - [ ] 5 subcomponentes exportados.
  - [ ] Smoke: `card-parlamentares.tsx` (brasil-a-vera) migra para
        Card do RDS preservando layout.

#### Draft E9 — `Input`: modo "bare" sem chrome de label/helperText embutidos

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** `Input` do RDS oferece chrome embutido (`label`,
  `error`, `success`, `helperText`, `leftIcon`, `rightIcon`,
  `showClearButton`). Brasil-a-vera usa Inputs em form GET nativo
  (SearchForm) e em forms onde `<Label>` é renderizado
  separadamente para controle de layout (Filtros).

  **Gap.** Falta modo "bare" — input que renderiza só o `<input>`
  estilizado sem container de label/helperText. Hoje, se o
  consumer só quer o input "puro", precisa ainda passar nada nas
  props label/helperText e torcer para não injetar wrapper extra
  no DOM.

  **Impacto.** 5 sites.

  **Pedido.** Documentar que omitir `label`/`helperText` não
  injeta wrapper extra; ou prop `unstyled?: boolean` explícita.

  **Critério de aceite.**

  - [ ] Snapshot ou doc explicitando "Input sem `label` renderiza
        apenas `<input class="...">`".
  - [ ] Smoke: SearchForm do brasil-a-vera renderiza sem wrapper
        adicional.

#### Draft E10 — `Combobox` / `Autocomplete`: modo inline + hidden field para form GET nativo + `allOptionLabel`

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** Brasil-a-vera tem `Combobox` (composição) que
  combina cmdk + Popover para um "select com busca para 1 valor".
  Usado em 4 sites: Filtros de parlamentar (Partido + UF) e
  Filtros de proposição (Tema). Esses formulários são `<form
  method="GET">` sem JS (princípio brasil-a-vera: filtros
  funcionam mesmo com JS desabilitado).

  **Gap.** RDS tem `Autocomplete` (`./client`) e `CommandPalette`
  (trigger-based, Cmd+K). Faltam:
  1. Modo inline (não-trigger) — RDS `CommandPalette` parece
     ser sempre acionado por trigger.
  2. Hidden input — para integrar com form GET nativo, o consumer
     precisa de `<input type="hidden" name={fieldName}
     value={selectedValue}>` automaticamente. Brasil-a-vera
     implementa isso manualmente.
  3. Prop `allOptionLabel?: string | null` — para representar
     "Todos" (sem valor selecionado).
  4. SSR-friendly default state.

  **Impacto.** 4 sites em 2 formulários de filtros (base do UX
  de descoberta da plataforma).

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera Combobox dentro de form GET:
  <form method="GET">
    <Combobox name="partido" options={partidos}
              defaultValue={selecionado.partido}
              allOptionLabel="Todos os partidos" />
    <button type="submit">Aplicar</button>
  </form>
  ```

  **Pedido.**

  1. Em `Autocomplete`, adicionar prop `name?: string` que injeta
     hidden input com o valor selecionado.
  2. Adicionar prop `allOptionLabel?: string | null` (passar `null`
     desabilita).
  3. Documentar uso em form GET nativo.

  **Critério de aceite.**

  - [ ] Autocomplete com `name="foo"` renderiza hidden input
        sincronizado.
  - [ ] Smoke: filtros do brasil-a-vera continuam funcionando com
        JS desabilitado (form GET nativo).

#### Draft E11 — `EmptyState`: `action` como ReactNode + `description` opcional

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** O `EmptyState` do brasil-a-vera usa: `icon:
  LucideIcon`, `title`, `description?`, `action?: ReactNode`. O
  `action` precisa ser ReactNode livre para encaixar `<Button
  asChild><Link>...</Link></Button>` (preservar navegação Next).

  **Gap.** RDS `EmptyState` aceita `actionLabel + onAction` (par
  obrigatório), `message: string` (obrigatório). Faltam:
  1. `message?` opcional (alguns empty states só têm title).
  2. `action?: ReactNode` (alternativa ao par `actionLabel +
     onAction`); permite passar `<Button as={Link}
     href="/...">Limpar filtros</Button>` direto.
  3. Aceitar `icon: ReactNode` em vez de só `illustration`.

  **Impacto.** 3 sites diretos.

  **Repro/exemplo.**

  ```tsx
  // brasil-a-vera:
  <EmptyState
    icon={Search}
    title="Nenhum parlamentar encontrado"
    description="Ajuste os filtros."
    action={
      <Button asChild>
        <Link href="/parlamentares">Limpar filtros</Link>
      </Button>
    }
  />
  ```

  **Pedido.** Aceitar `action?: ReactNode` como alternativa
  ergonômica ao par `actionLabel + onAction`.

  **Critério de aceite.**

  - [ ] `action: ReactNode` aceito.
  - [ ] `message` opcional.
  - [ ] Smoke: empty state do brasil-a-vera mantém o Link Next.

#### Draft E12 — `ToastContainer`: tema dark + slots de ícone custom

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`
- **Body:**

  **Contexto.** Brasil-a-vera usa `sonner` direto (via wrapper
  `Toaster` minimal) com `theme="dark"` hardcoded e ícones lucide
  custom (CircleCheck/Info/TriangleAlert/OctagonX/LoaderCircle)
  injetados via prop `icons={...}` do sonner.

  **Gap.** RDS tem `useToast` + `ToastContainer`. Pode não
  permitir injetar ícones custom nem theme override.

  **Impacto.** 2 sites diretos (mount no layout + 1 chamada
  imperativa de `toast.success`).

  **Pedido.**

  1. Prop `theme?: 'light' | 'dark' | 'system'` no
     `ToastContainer`.
  2. Slot para injeção de ícones por variant (`icons?: { success?:
     ReactNode; ... }`).

  **Critério de aceite.**

  - [ ] Theme dark renderiza.
  - [ ] Ícones lucide passam corretamente.
  - [ ] Smoke: `<Toaster theme="dark">` do brasil-a-vera migra.

### Novo componente drafts

#### Draft N1 — `SectionCard` (Card-com-Header-estruturado)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `SectionCard` (8 arquivos, 28
  sites — 7º componente mais usado). Cartão com cabeçalho
  estruturado (título + subtítulo opcional + ícone opcional +
  badge opcional) e corpo embaixo. Padrão de dashboards.

  **O que falta.** RDS tem `Card` (wrapper plano) e `PageHeader`
  (header de página inteira). Falta a composição intermediária
  "card com cabeçalho semântico embutido", típica de painel /
  perfil de detalhe.

  **Por que é genérico.** Qualquer painel administrativo ou perfil
  de entidade (cliente, projeto, deal, etc.) tem esse padrão. Não
  depende do domínio do brasil-a-vera.

  **Onde o consumer usa.** Perfis de detalhe parlamentar /
  proposição / votação, área logada (`EstadoMaduro`/`Onboarding`),
  configurações.

  **Sketch de API.**

  ```ts
  interface SectionCardProps extends HTMLAttributes<HTMLElement> {
    title: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
    children: ReactNode;
    id?: string; // para scroll-to + section-nav
    headerActions?: ReactNode; // botão "Editar" no canto direito
    bare?: boolean; // sem padding/border (raro)
  }
  ```

  **Critério de aceite.**

  - [ ] Componente exportado em `./server` (é puro
        apresentacional, server-safe).
  - [ ] Aceita 4 slots (title, subtitle, icon, badge,
        headerActions).
  - [ ] Smoke: 1 perfil do brasil-a-vera renderiza com
        SectionCard do RDS.

#### Draft N2 — `FilterChips` (wrapper de grupo de Chips com label opcional)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `FilterChips` (composição), 9
  arquivos / 18 sites. Wrapper que renderiza grupo de Chips com
  rótulo de grupo opcional ("Filtros · ") e wrap responsivo.

  **O que falta.** RDS tem `Chip` mas não o agrupador.

  **Por que é genérico.** Padrão de qualquer painel de filtros
  (e-commerce, busca, dashboards).

  **Onde o consumer usa.** Listagens de parlamentares /
  proposições / votações, filtros gerais.

  **Sketch de API.**

  ```ts
  interface FilterChipsProps extends HTMLAttributes<HTMLDivElement> {
    label?: ReactNode;       // ex.: "Filtros"
    children: ReactNode;     // <Chip>...</Chip> várias vezes
    wrap?: boolean;          // default true
  }
  ```

  **Critério de aceite.**

  - [ ] Disponível em `./server`.
  - [ ] Wrap responsivo.
  - [ ] Smoke: 1 página de listagem do brasil-a-vera renderiza
        com FilterChips do RDS.

#### Draft N3 — `HeroSection` (hero com slots + variantes)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `HeroSection` (7 arquivos / 14
  sites). 3 variants visuais (`plain`/`gradient`/`gradient-glow`)
  e 6 slots (`kicker`, `title`, `description`, `actions`, `kpis`,
  `meta`).

  **O que falta.** RDS tem `PageHeader` (title + description +
  breadcrumb + actions), mais simples. Hero é mais rico (kpis,
  meta, variant visual).

  **Por que é genérico.** Top-of-page hero é padrão de qualquer
  landing/feature page. Variants de gradient são tokens visuais
  (não amarrados a brand).

  **Onde o consumer usa.** Home, listagens, página de comparar,
  /meu-parlamentar, /docs.

  **Sketch de API.**

  ```ts
  interface HeroSectionProps {
    kicker?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    kpis?: ReactNode;       // tipicamente <KpiStrip>
    meta?: ReactNode;
    variant?: "plain" | "gradient" | "gradient-glow";
    align?: "start" | "center";
    className?: string;
  }
  ```

  **Critério de aceite.**

  - [ ] Componente disponível em `./server`.
  - [ ] 3 variants visuais documentados.
  - [ ] Smoke: home do brasil-a-vera renderiza com HeroSection
        do RDS.

#### Draft N4 — `KpiStrip` (strip horizontal de KPIs)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `KpiStrip` (7 arquivos / 9
  sites). Strip horizontal com ícone + label + valor + hint + tone
  por item, divisores verticais, cap responsivo em 4 colunas.

  **O que falta.** RDS não tem nada equivalente. `DataGrid` é
  tabela densa.

  **Por que é genérico.** Padrão clássico de dashboard de KPIs.

  **Onde o consumer usa.** HeroSection / SectionCard internos,
  perfis de parlamentar, votação, área logada.

  **Sketch de API.**

  ```ts
  type Tone = "default" | "success" | "warning" | "error" | "muted";

  interface KpiItem {
    icon?: ReactNode;
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    tone?: Tone;
  }

  interface KpiStripProps {
    items: KpiItem[];
    className?: string;
    maxCols?: 2 | 3 | 4;  // default 4
  }
  ```

  **Critério de aceite.**

  - [ ] Disponível em `./server`.
  - [ ] Suporta 5 tones para hint.
  - [ ] Smoke: HeroSection do brasil-a-vera mostra KpiStrip do
        RDS.

#### Draft N5 — `KpiCard` (lista de KPIs em grid de cards)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `KpiCard` (3 arquivos / 7
  sites). Lista de KPIs em layout de cards independentes (vs strip),
  com variante `floatingBadge`.

  **O que falta.** RDS não tem.

  **Por que é genérico.** Complemento natural ao KpiStrip;
  diferença é layout (cards vs strip).

  **Onde o consumer usa.** Home, painel.

  **Sketch de API.** Similar a `KpiStripProps`, mas o item aceita
  `floatingBadge?: ReactNode`.

  **Critério de aceite.**

  - [ ] Disponível em `./server`.
  - [ ] Compartilhe types com KpiStrip onde fizer sentido.

#### Draft N6 — `SectionNav` (sticky scrollspy nav)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `SectionNav` (4 arquivos / 5
  sites). Nav sticky com IntersectionObserver destacando seção
  visível. Anchors com prefixo `#`.

  **O que falta.** RDS tem `Navigation`/`NavLink` (estado ativo
  via prop), mas falta a parte scrollspy automática.

  **Por que é genérico.** Padrão clássico de longreads, perfis de
  detalhe, settings com seções.

  **Onde o consumer usa.** Perfis de parlamentar / proposição /
  votação.

  **Sketch de API.**

  ```ts
  interface SectionNavItem {
    id: string;       // id do anchor
    label: ReactNode;
    icon?: ReactNode;
  }

  interface SectionNavProps {
    items: SectionNavItem[];
    stickyTop?: string;   // CSS value, ex.: "3.5rem"
    className?: string;
  }
  ```

  **Critério de aceite.**

  - [ ] Componente client-only (precisa de
        IntersectionObserver).
  - [ ] sticky com offset configurável.
  - [ ] Smoke: perfil de parlamentar do brasil-a-vera mostra
        SectionNav do RDS.

#### Draft N7 — `StatsGrid` (grid de stats com divisores 1px via gap-px)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `StatsGrid` (4 arquivos / 5
  sites). Padrão visual: `bg-border` no container + `gap-px` +
  cells `bg-surface` para criar grid 1px divisor independente da
  largura.

  **O que falta.** RDS não tem.

  **Por que é genérico.** Padrão visual de grid com divisores
  consistentes em qualquer largura. Distinto de `KpiStrip`
  (orientação horizontal).

  **Onde o consumer usa.** Home, painel, partido.

  **Sketch de API.**

  ```ts
  interface StatItem {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
  }

  interface StatsGridProps {
    items: StatItem[];
    cols?: 2 | 3 | 4;
    className?: string;
  }
  ```

  **Critério de aceite.**

  - [ ] Disponível em `./server`.
  - [ ] Avaliar se vale consolidar com KpiStrip (pode ser variant).

#### Draft N8 — `TabsAsLinks` / `SubTabs` (tabs como navegação por URL)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `TabBar` (painel, `?tab=`) e
  dois `SubTabs` (parlamentares + alertas, `?subtab=`). Padrão:
  tabs renderizadas como `<Link>` Next, estado ativo determinado
  por URL (não por state interativo).

  **O que falta.** RDS tem `Tabs` (compound interativo) — mas
  para tabs-como-navegação, o pattern é diferente: cada tab é
  um link separado, sem provider/context. Hoje, `TabBar` no
  brasil-a-vera é um custom de ~30 linhas. Centralizar evita
  duplicação.

  **Por que é genérico.** SPAs SSR com Next/Remix/SvelteKit
  recorrem a esse padrão sempre que precisam de tabs que
  funcionam sem JS (cookies-off, share link com tab).

  **Onde o consumer usa.** Painel inteiro.

  **Sketch de API.**

  ```ts
  interface TabAsLink {
    label: ReactNode;
    href: string;          // já pré-computado pelo caller
    active: boolean;       // caller decide via pathname/search
    icon?: ReactNode;
    count?: number;
  }

  interface TabsAsLinksProps {
    items: TabAsLink[];
    className?: string;
    variant?: "default" | "sub";  // hierarquia visual
  }
  ```

  Componente RSC; estado ativo vem do caller (que tem acesso a
  `usePathname`/`searchParams`).

  **Critério de aceite.**

  - [ ] Disponível em `./server`.
  - [ ] Smoke: painel do brasil-a-vera migra TabBar para esse.

#### Draft N9 — `Sparkline` (SVG sparkline server-renderizado)

- **Repo:** FabioCaffarello/react-design-system
- **Labels:** `consumer:brasil-a-vera`, `enhancement`, `new-component`
- **Body:**

  **Contexto.** Brasil-a-vera tem `Sparkline12m` interno em
  `parlamentar/alinhamento.tsx`: SVG manual de 12 pontos mensais.
  Hoje não é exportado.

  **O que falta.** Sparkline genérico server-renderizado (sem
  Recharts) é primitiva útil para dashboards. RDS tem `Progress`
  para barras, mas nada para tendência de série temporal pequena.

  **Por que é genérico.** Não depende do domínio (qualquer série
  numérica curta).

  **Onde o consumer usa.** Internamente em vários componentes de
  trend (alinhamento mensal, gastos mensais, atividade).

  **Sketch de API.**

  ```ts
  interface SparklineProps {
    points: number[];
    width?: number;     // default 100
    height?: number;    // default 24
    stroke?: string;    // CSS color, default currentColor
    fill?: string;      // CSS color, default none
    "aria-label"?: string;
  }
  ```

  **Critério de aceite.**

  - [ ] Server-renderizado (SVG manual, zero JS).
  - [ ] Smoke: alinhamento do brasil-a-vera migra Sparkline12m
        para Sparkline do RDS.

## Ordem sugerida de migração

1. **Skeleton** (categoria 1, 24 sites, S). Maior ganho rápido —
   troca de import, server-safe, baixo risco.
2. **Badge primitivo** (categoria 1, 6 sites, S). Pouco uso direto
   mas serve de base para todas as composições.
3. **Dialog + DialogTrigger + DialogTitle/Header/Description**
   (mix de 1 e 2 — onde o gap é só consistência server-entry, a
   migração é S). Eleva o uso comum.
4. **Tabs primitivos** (categoria 1, baixo uso, baixo risco —
   serve como smoke do compound pattern do RDS).
5. **P (Text variant paragraph)** (categoria 1, 29 sites, S). Vai
   no escopo `/docs` inteiro junto.
6. **Resolver Draft E1 (Button variants + asChild/as=Link)**,
   depois migrar todos os 72 sites de Button (S em ~47, M em ~25).
   Maior alavanca do trabalho. Sem esse gap, segura a migração da
   maioria dos componentes de domínio (categoria 4) que dependem
   de Button.
7. **Resolver Draft E3 (Chip + count + asChild)** e migrar
   FilterChip (40 sites). Sem essa peça, listagens do brasil-a-vera
   ficam em status quo.
8. **Resolver Draft E2 (Badge + icon + source + tones)** e migrar
   DataBadge (45 sites). Liberar PerfilHeader / cards de domínio.
9. **Resolver Draft E8 (Card subcomponentes)** e migrar
   Card+CardHeader+CardTitle+... (consumer base de ~30 cards
   indiretos).
10. **Resolver Draft E7 (Dialog showCloseButton)** e migrar os 3
    sítios do painel que hoje usam Radix direto.
11. **Resolver Draft E11 (EmptyState action ReactNode)** e migrar
    os 3 sítios.
12. **Resolver Draft E12 (ToastContainer dark + ícones)** e migrar
    Toaster.
13. **Resolver Draft E10 (Combobox/Autocomplete inline + hidden
    field)** e migrar Combobox (4 sites em 2 filtros).
14. **Resolver Draft E5 (Label bare)**, **E6 (Separator
    decorative)**, **E9 (Input bare)**: lotes pequenos, S por site,
    aproveitar revisão geral de form chrome.
15. **Resolver Draft E4 (Accordion compound)** e migrar perfis
    mobile.
16. **Aguardar Drafts N1–N9 (componentes novos)** — categoria 3
    só pode ser migrada depois que existir no RDS. SectionCard
    (N1) e KpiStrip (N4) são os de maior impacto (28 e 9 sites).
17. **Categoria 4 espalhada pelo trajeto:** cada componente de
    domínio (parlamentar/proposicao/votacao/partido/painel)
    migra junto com a página que o consome, consumindo as
    primitivas RDS na lista por área acima.
18. **TrustBanner:** remover (órfão, 0 usos).
19. **Componentes Recharts (charts/):** intocáveis nesta
    migração — RDS não cobre charts.

## Observações da varredura

- **Mapeamento 1-para-N (brasil-a-vera → RDS):** `Dialog` do
  brasil-a-vera (compound, 10 subcomponentes) mapeia para `Dialog`,
  `Drawer` ou `Modal` no RDS, dependendo do caso (sheet lateral
  vira `Drawer`; modal centralizado vira `Dialog`; alert simples
  vira `AlertDialog`). Classifiquei pelo cenário mais comum
  (`Dialog`).
- **Mapeamento 1-para-N (RDS → brasil-a-vera):** `Badge` do RDS
  pode substituir `Badge` (primitivo) + parte do `DataBadge`
  (composição). Mas só com Draft E2 resolvido, porque DataBadge
  tem slots adicionais.
- **`Header` / `Navigation` / `NavLink` do RDS poderiam absorver
  `Navbar`+`NavLinks`+`NavMobile`+`AuthSlot`+`AuthIsland`+
  `AuthIslandLoader`** do brasil-a-vera. Mas o brasil-a-vera tem
  arquitetura específica (ADR-022: zero JS para anônimo) que exige
  control fino do split server/client; substituir tudo por `Header`
  do RDS provavelmente quebra esse princípio. Classifiquei os 7
  componentes do shell como categoria 4 com aviso.
- **Sinal de breaking change 3.0.0:** o usuário não passou
  changelog. Sinais visíveis na superfície que sugerem mudanças vs
  versões anteriores: (a) entry `./server` com 21 exports
  cuidadosamente filtrados — alinhado com issue de split conhecida
  no histórico de tasks. (b) `Card` sem subcomponentes — o nome
  shadcn-like sugere que pode ter regredido vs uma versão anterior
  ou nunca ter existido. (c) `Accordion` declarativo (`items: []`)
  em vez de compound — também difere do shadcn/Radix tradicional.
  Confirmar com release notes da 3.0.0 antes de tirar conclusões.
- **`./server` tem `TableCell` mas não `Table`/`TableHeader`/
  `TableBody`:** padrão repetido com Dialog (Header/Footer
  server, Title client). Talvez intencional (cells são puros
  apresentacionais), mas atrito de DX similar.
- **Componentes que aparecem só no exports `.` mas o `.d.ts`
  mostra implementação puramente apresentacional** (sem hooks, sem
  context) — candidatos a futuras issues "promover ao `./server`":
  `Badge`, `Button`, `Input` (este tem chrome interno que pode
  precisar de hooks), `Avatar`, `EmptyState`, `Spinner` (já em
  server), `Tooltip` (provavelmente tem hover state — client).
- **Princípio do brasil-a-vera "zero JS para anônimo" (ADR-022)
  conflita com qualquer componente do entry `.`** consumido em
  rota pública. Isso reforça o valor estratégico de manter
  `./server` o maior possível. Pode ser uma issue separada (não
  vou rascunhar aqui sem confirmação do escopo).
- **Componentes do `_components` de docs (Section/P/Ul/Li/
  InternalLink/ExternalLink/DocsHeader/SidebarNav)** são
  candidatos óbvios para `Text` + `Stack` + `Navigation`/`NavLink`
  do RDS, mas o doc do arquivo pede não generalizar — fica em
  categoria 4 por respeito ao trade-off.
- **Padrão `Compartilhar*Button` triplicado** (parlamentar /
  proposicao / votacao) — discutido no inventário item 4. Vale
  uma issue brasil-a-vera-side (não RDS) para consolidar em
  composição local `<CompartilharDialog>` recebendo
  `buildShareText`. Não vou rascunhar como Draft N porque é
  cleanup do consumer, não do DS.
- **Padrão "3 limiares de cor"** (item 5 do inventário) — também
  é cleanup consumer-side (helper `thresholdClass(pct)`); não é
  componente. Sem draft.
