# Plano de consolidação RDS — fase pós-migração

> Data: 2026-06-16 · RDS instalado: **4.3.0** · Read-only (planejamento)
>
> Este documento **supersede a classificação** de
> [`component-inventory.md`](component-inventory.md) (snapshot RDS ~3.7) e
> [`migration-matrix.md`](migration-matrix.md) (snapshot RDS 3.0.0) para fins de
> *próximos passos*. O histórico de inventário daqueles continua válido como
> registro; a fila acionável vive aqui.

## Contexto

A migração de **rotas** (ADR‑033/034) está completa: 14 rotas ricas promovidas,
staging `/rds/` removido, 0 pares de consolidação, zero token legacy. O passo
seguinte é a consolidação de **componentes**: o RDS 3.12 já exporta quase toda a
camada `src/design-system/primitives/` e várias `compositions/`, mas os
componentes de domínio ainda importam das cópias locais. O objetivo é tornar o
RDS a fonte única de primitivas/composições genéricas e deixar `src/components/`
como repositório só de domínio.

## Superfície do RDS 3.12 (empírico, `node_modules/.../dist`)

- **Primitivas (`.`/`./server`):** `Button, Input, Textarea, Label, Badge,
  Skeleton, Spinner, Separator, Tooltip, Checkbox, Radio, Switch, Slider,
  Progress, Collapsible, Select, Info, Text`.
- **Componentes:** `Card(+Header/Title/Subtitle/Body/Actions), Stat, StatGroup,
  FilterChips, Breadcrumb, Pagination, EmptyState, Dropdown, SearchInput, Rating,
  FileUpload, TimePicker, ColorPicker, Accordion, Popover, Modal, Dialog(+Trigger/
  Content/Header/Title/Description/Footer/Close), AlertDialog, Toast/ToastContainer/
  useToast, Stepper, Timeline, CommandPalette, DataGrid, HeroSection, TabsAsLinks`,
  + patterns (`DataTablePattern, FormWizardPattern, SearchAndFilterPattern,
  DashboardLayout`).
- **Layouts:** `Container, Stack, PageHeader, HeaderActions, HeaderNavigation`.
- **Hooks (`./hooks`):** `useScrollSpy, useToast, useFocusTrap, useCollapsible…`.
- **Nuance de bundle (varredura 3.9.0):** importar o barrel `/granular` direto de
  um Server Component vaza o entry inteiro (+294KB medidos). Por isso
  `primitives/rds-accordion.ts` é um wrapper `'use client'` que reexporta
  `Accordion` do `/granular`. Qualquer consolidação de primitiva **client** deve
  preservar esse padrão.

## Aderência atual (consumidores por arquivo, 2026-06-16)

**Imports do RDS já vivos:** `Text` (8), `FilterChips` (4), `TabsAsLinks` (3),
`Stat`/`StatGroup` (3), `HeroSection` (3), `Card` (2), `useScrollSpy` (1).

**Primitivas locais** (consumidores, excl. self/tests):
`button 27 · dialog 7 · skeleton 4 · rds-accordion 3 · card 3 · sonner 2 ·
input 2 · badge 1 · command 1 · label 1 · popover 1 · separator 1 · tabs 1 ·
accordion 0 (órfã)`.

**Composições locais:**
`data-badge 9 · filter-chips 9 · section-card 7 · party-badge 4 · section-nav 4 ·
combobox 2 · kpi-card 2 · hero-section 1 (só /dev/design) · kpi-strip 1 ·
stats-grid 1`.

## Baldes

- **(R)** tem equivalente RDS → repointar imports + deletar local.
- **(D)** domínio ou decisão ratificada → fica local.
- **(X)** morto → remover.
- **(G)** equivalente RDS incompleto → fica local + issue upstream documentada.

> **✅ PROGRAMA COMPLETO (2026-06-16).** A consolidação de primitivas/composições
> **genéricas terminou**. Todo componente local com equivalente no RDS foi migrado;
> os gaps que dependiam do RDS foram **destravados pelas 5 issues** (entregues nas
> releases v4.0 → v4.2 e consumidas de volta). A camada `primitives/` ficou só com
> `card` + `tabs` (gaps ratificados) + **5 wrappers de bundle sancionados**
> (`rds-accordion`/`-autocomplete`/`-dialog`/`-drawer`/`-toast`). **Zero duplicata local** de
> componente RDS; **zero `@radix-ui/react-dialog` direto** (6 deps radix órfãs
> removidas, #455). Detalhe por PR na §[Encerramento](#encerramento-2026-06-16) no fim.

### Primitivas

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `accordion` (Radix) | 0 | **X** | `Accordion` (via `rds-accordion`) | ✅ removida (WS1, PR3) | baixo | ✓ |
| `rds-accordion` | 3 | **D** | wrapper sancionado | manter (razão de bundle) | — | — |
| `badge` | 1 | **R** | `Badge` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `label` | 1 | **R** | `Label` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `separator` | 1 | **R** | `Separator` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `skeleton` | 4 | **R** | `Skeleton` (`./server`) | ✅ consolidado (WS3‑b; RSC-safe, dark via `.dark` do RDS → `slate-800`; delta sutil de shade p/ QA) | baixo-méd | ✓ |
| `input` | 2 | **R** | `InputBase` (`./server`) | ✅ consolidado (#449; v4.2 `InputBase` server-safe, [#224](https://github.com/FabioCaffarello/react-design-system/issues/224)) | médio | ✓ |
| `button` | 27 | **R** | `Button` (`./server`) | ✅ consolidado (#451; v4.1 server-safe + `asChild`, [#224](https://github.com/FabioCaffarello/react-design-system/issues/224)). `default`→`primary`, `destructive`→`error`, `size="icon"`→`variant="iconOnly"` | alto | ✓ |
| `dialog` | 7 | **R** | `Dialog` (wrapper `rds-dialog`) | ✅ consolidado (#453; `showCloseButton` [#221](https://github.com/FabioCaffarello/react-design-system/issues/221)). + os 3 modais Radix-direto do painel migrados (#455) | médio | ✓ |
| `sonner` (Toast) | 2 | **R** | `useToast` (wrapper `rds-toast`) | ✅ consolidado (#454; `ToastProvider`/`ToastContainer` no root layout; dep `sonner` removida) | médio | ✓ |
| `command` | 1 | **X** | — (cmdk; sem par) | ✅ removido com o `Combobox` (#450) | alto | ✓ |
| `popover` | 1 | **X** | `Popover` | ✅ removido com o `Combobox` (#450) | médio | ✓ |
| `rds-dialog` / `rds-toast` / `rds-autocomplete` | — | **D** | wrappers de bundle | manter — re-export `/granular` (razão de bundle, como `rds-accordion`) | — | — |
| `rds-drawer` | 4 | **D** | wrapper sancionado (ADR-053 Fase 2, 2026-07-01) | manter — `Drawer` é client (estado open/close + portal); importar barrel `/granular` DENTRO do módulo `'use client'` poupa +294KB num RSC. Consumers: `parlamentar/`, `proposicao/`, `votacao/preview-drawer` + `votos-drawer` | — | — |
| `card` | 3 | **R** | `Card` compound (`./server`) | ✅ consolidado (#456-follow; `CardContent`→`CardBody`, `CardDescription`→`CardSubtitle`, `CardFooter`→`CardActions`; spacer vazio da home virou `<div flex-1>` pois `CardBody` exige children) | médio | ✓ |
| `tabs` (stateful) | 0 | **R** | só `TabsAsLinks` | ✅ removido como órfão — o único consumer era o showroom `/dev/design`, eliminado. Levou junto a dep `@radix-ui/react-tabs` (última radix → **zero**). Tabs com estado segue gap do RDS; se surgir necessidade real, abrir issue (guard proíbe recriar local) | baixo | ✓ |

### Composições

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `filter-chips` (`FilterChip`) | 9 | **R** | `Chip` (+ `FilterChips`) | ✅ consolidado (WS4, #445; v4 `Chip.count`) | médio | ✓ |
| `kpi-strip` | 1 | **R** | `Stat`/`StatGroup` | ✅ consolidado (WS4, #443) | médio | ✓ |
| `stats-grid` | 1 | **R** | `Stat`/`StatGroup` | ✅ consolidado (WS4, #443) | médio | ✓ |
| `section-card` | 7 | **D** | `Card` compound | manter — JÁ construído sobre o `Card` do RDS (wrapper sancionado) | — | — |
| `section-nav` | 4 | **D** | wrapper sobre `useScrollSpy` | manter (composição sancionada) | — | — |
| `party-badge` | 4 | **D** | — | manter (cores oficiais, D4 Wave 6) | — | — |
| `kpi-card` | 3 | **R** | `Stat`/`StatGroup` (v4.6, [#245](https://github.com/FabioCaffarello/react-design-system/issues/245)) | ✅ consolidado — `StatGroup` ganhou o slot `floatingBadge` (TrustBadge L1 na home) na RDS 4.6.0. Migrados home + `quem-me-representa/[uf]` + showcase; `<StatGroup layout="grid" cols={4}>` p/ preservar o colapso responsivo | médio | ✓ |
| `hero-section` | 1 | **R** | `HeroSection` (`./server`) | ✅ consolidado (#452; drop-in — mesmas variantes `plain`/`gradient`/`gradient-glow`) | baixo | ✓ |
| `combobox` | 2 | **R** | `Autocomplete` (wrapper `rds-autocomplete`) | ✅ consolidado (#450; v4.1 ganhou `name`/form [#225](https://github.com/FabioCaffarello/react-design-system/issues/225)). Levou junto `command`+`popover` | alto | ✓ |
| `data-badge` | 9 | **R** | RDS `DataBadge` (v4.5, [#228](https://github.com/FabioCaffarello/react-design-system/issues/228) + [#232](https://github.com/FabioCaffarello/react-design-system/issues/232)) | ✅ consolidado — superset RSC-safe; tom data-viz entregue como `dataviz` ([#232](https://github.com/FabioCaffarello/react-design-system/issues/232)). Remapeamento de tom: default→neutral, destructive→error, brand→primary, accent→`dataviz` (roxo data-viz; **não** o `accent` ciano do RDS) | médio | ✓ |

### Dual-existência — resolvida

- **`Chip` (ex-`FilterChip`)**: ✅ consolidado no #445 (container `FilterChips` já
  era do RDS; chip singular migrou p/ `Chip` do RDS v4).
- **`HeroSection`**: ✅ consolidado no #452 (o showroom também — o RDS tem as
  mesmas variantes `gradient`/`gradient-glow`).

## Resíduos de cor — fase ADR-039 (2026-06-16)

Os resíduos antes "ratificados, não migram" foram revisitados: virraram issues
upstream e o [ADR-039](../architecture/ADR/039-migracao-residuos-de-cor-para-o-rds.md)
revogou parte da §Resíduos do ADR-038. Estado:

| Resíduo | Issue RDS | Destino | PR de consumo |
| --- | --- | --- | --- |
| Paleta de charts `--chart-1..5` | [#229](https://github.com/FabioCaffarello/react-design-system/issues/229) ✅ | migrou p/ `--color-chart-1..8` (Okabe‑Ito RDS, v4.3). single-hue→`chart-2` (azul preservado), mediana→`chart-1`, mix→`chart-1..5` | **#460 ✅** |
| Par on-color `success-foreground` | [#230](https://github.com/FabioCaffarello/react-design-system/issues/230) ✅ | migrou p/ par sólido `bg-success-solid`+`text-fg-on-success` (emerald-700/branco, ≈5.48:1 AA) | **#461 ✅** |
| `accent` roxo (DataBadge) | [#232](https://github.com/FabioCaffarello/react-design-system/issues/232) ✅ | RDS expôs o tom data-viz como `dataviz` (v4.5); DataBadge consolidado, `accent`→`dataviz` | **consolidação data-badge ✅** |
| Cores cruas de `PartyBadge` | — | **segue ratificado** (D4 Wave 6, identidade oficial) — fora de escopo | — |

## Issues upstream (WS5) — TODAS resolvidas

As 5 issues abertas no repo `FabioCaffarello/react-design-system` foram entregues
em 3 releases e consumidas de volta: **v4.0.0** (#221, #222), **v4.1.0** (#224
Button/`./server` + #225 Autocomplete `name`/form), **v4.2.0** (#224 `InputBase`
server-safe por composição). Adotadas no BaV em `^4.2.0` (#448).

1. ✅ [RDS #221](https://github.com/FabioCaffarello/react-design-system/issues/221)
   — `showCloseButton?: boolean` no `Dialog`/`DialogContent` (desbloqueia
   `ConsentModal`, `AcoesLgpd`, `MigracaoLocalStorageModal`).
2. ✅ [RDS #222](https://github.com/FabioCaffarello/react-design-system/issues/222)
   — prop `count` (sub-badge) no `Chip` (workaround: `count` em `children`).
3. ✅ [RDS #224](https://github.com/FabioCaffarello/react-design-system/issues/224)
   — entry `./server` para `Button` e `Input` (hoje client-only → bloqueia as 2
   primitivas mais usadas do BaV: Button 27/13-server, Input no form zero-JS).
4. ✅ [RDS #225](https://github.com/FabioCaffarello/react-design-system/issues/225)
   — `Autocomplete` com integração de form nativo (`name` → hidden input); destrava
   o `Combobox` local (+ `command`/`popover`) sem regredir o zero-JS dos filtros.

> #221 e #222 já entregues no **RDS v4.0.0** (adotado no #444).

**Fase de resíduos de cor — abertas e (quase) todas resolvidas na v4.3.0:**

5. ✅ [RDS #228](https://github.com/FabioCaffarello/react-design-system/issues/228)
   — `DataBadge` server-safe (`source` + `tone`). Entregue v4.3; consolidação local
   destravada pelo tom data-viz (#232, v4.5) e concluída.
6. ✅ [RDS #229](https://github.com/FabioCaffarello/react-design-system/issues/229)
   — paleta categórica Okabe‑Ito + `getChartColor`. Entregue v4.3, consumido (#460).
7. ✅ [RDS #230](https://github.com/FabioCaffarello/react-design-system/issues/230)
   — par on-color `fg-on-success` + `success-solid`. Entregue v4.3, consumido (#461).
8. ✅ [RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232)
   — tom `dataviz` (par categórico data-viz, fora da escala de status) no `DataBadge`.
   Entregue v4.5; destravou e concluiu a consolidação do `data-badge` local.

## Encerramento (2026-06-16)

Programa concluído. **21 PRs no BaV + 5 issues no RDS**, em ~30 PRs/issues no total.

**Mapa de PRs (BaV):**

| Fase | PRs |
| --- | --- |
| Fundação (plano, ADR-038, guard `rds-primitive`) | #437, #438 |
| Remoção de órfãos | #439 |
| Primitivas `./server` (badge/label/separator, skeleton) | #440, #441 |
| Composições (KpiStrip/StatsGrid→Stat, FilterChip→Chip) | #443, #445 |
| Painel → tokens RDS (#420) | #447 |
| Bumps RDS (v4.0 → v4.2) | #444, #448 |
| Destravados pelas issues (input/combobox/button) | #449, #450, #451 |
| hero-section, dialog, sonner | #452, #453, #454 |
| Modais Radix-direto → RDS Dialog + limpeza de deps radix | #455 |
| Docs/reframes | #442, #446, este |

**Loop consumidor ↔ design-system:** abrir issue no RDS → owner entrega na release →
BaV consome de volta. Foi o que destravou Button/Input/Combobox/Dialog/Chip
(#221–#225 → v4.0–v4.2). Padrão a repetir.

**Estado final da `src/design-system/`:**

- **Primitivas:** **zero primitiva local** — só os 5 wrappers de bundle sancionados
  `rds-accordion`/`rds-autocomplete`/`rds-dialog`/`rds-drawer`/`rds-toast` (`'use client'`
  re-exportando `/granular` — evita vazar +294KB do barrel num RSC). `card` foi
  consolidado (Card compound do RDS); `tabs` foi removido como órfão (único consumer
  era o showroom `/dev/design`, eliminado).
- **Composições:** `party-badge` (ratificado, cores oficiais) +
  `section-card`/`section-nav` (wrappers sancionados sobre Card/useScrollSpy do RDS).
  `data-badge` consolidado no `DataBadge` do RDS (v4.5, /server) — cópia local removida.
  `kpi-card` consolidado no `Stat`/`StatGroup` do RDS (v4.6, slot `floatingBadge`
  via [#245](https://github.com/FabioCaffarello/react-design-system/issues/245)) — cópia local removida.
- **Zero duplicata local** de componente RDS. **Zero deps `@radix-ui`** diretas
  (de 7 → 0: a última, `react-tabs`, saiu com a remoção do `tabs` local).
- **Resíduos de cor:** revisitados na fase ADR-039 (ver §"Resíduos de cor" acima) —
  charts (#460), on-success (#461) e o data-viz (`dataviz`, RDS #232, v4.5) migraram
  p/ o RDS; só `PartyBadge` segue ratificado.

**Guard anti-regressão** (`scripts/rds-primitive-guard.ts`, CI): trava reintrodução
de qualquer primitiva consolidada. A camada local em deprecação ativa fica honesta.

**Follow-up:** `data-badge` consolidado (RDS #232 entregue na v4.5; `accent`→`dataviz`).
`kpi-card` consolidado no `StatGroup` (RDS #245, v4.6). `tabs` removido como órfão com
a eliminação do showroom `/dev/design` — **camada de primitivos locais zerada**.
