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
> `card` + `tabs` (gaps ratificados) + **4 wrappers de bundle sancionados**
> (`rds-accordion`/`-autocomplete`/`-dialog`/`-toast`). **Zero duplicata local** de
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
| `card` | 3 | **R** | `Card` compound (`./server`) | ✅ consolidado (#456-follow; `CardContent`→`CardBody`, `CardDescription`→`CardSubtitle`, `CardFooter`→`CardActions`; spacer vazio da home virou `<div flex-1>` pois `CardBody` exige children) | médio | ✓ |
| `tabs` (stateful) | 1 | **G** | só `TabsAsLinks` | FICA LOCAL: RDS só tem `TabsAsLinks` (sem tabs com estado interno) — único primitivo local restante | baixo | local |

### Composições

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `filter-chips` (`FilterChip`) | 9 | **R** | `Chip` (+ `FilterChips`) | ✅ consolidado (WS4, #445; v4 `Chip.count`) | médio | ✓ |
| `kpi-strip` | 1 | **R** | `Stat`/`StatGroup` | ✅ consolidado (WS4, #443) | médio | ✓ |
| `stats-grid` | 1 | **R** | `Stat`/`StatGroup` | ✅ consolidado (WS4, #443) | médio | ✓ |
| `section-card` | 7 | **D** | `Card` compound | manter — JÁ construído sobre o `Card` do RDS (wrapper sancionado) | — | — |
| `section-nav` | 4 | **D** | wrapper sobre `useScrollSpy` | manter (composição sancionada) | — | — |
| `party-badge` | 4 | **D** | — | manter (cores oficiais, D4 Wave 6) | — | — |
| `kpi-card` | 2 | **G** | `Stat` (sem `floatingBadge`) | fica local — `Stat` não tem slot p/ o `floatingBadge` (TrustBadge L1 na home; "opção A") | médio | local |
| `hero-section` | 1 | **R** | `HeroSection` (`./server`) | ✅ consolidado (#452; drop-in — mesmas variantes `plain`/`gradient`/`gradient-glow`) | baixo | ✓ |
| `combobox` | 2 | **R** | `Autocomplete` (wrapper `rds-autocomplete`) | ✅ consolidado (#450; v4.1 ganhou `name`/form [#225](https://github.com/FabioCaffarello/react-design-system/issues/225)). Levou junto `command`+`popover` | alto | ✓ |
| `data-badge` | 9 | **G** | RDS `DataBadge` (v4.3, [#228](https://github.com/FabioCaffarello/react-design-system/issues/228)) | server-safe entregue; consolida quando o tom `accent`/data-viz sair ([#232](https://github.com/FabioCaffarello/react-design-system/issues/232)) — fica local como carrier do `accent` (16×) até lá | médio | local |

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
| `accent` roxo (DataBadge) | [#232](https://github.com/FabioCaffarello/react-design-system/issues/232) ⏳ | **gap-com-issue** — DataBadge fica local como carrier até o RDS expor o tom data-viz | ⏳ aguarda release |
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
   aguarda o tom `accent` (#232).
6. ✅ [RDS #229](https://github.com/FabioCaffarello/react-design-system/issues/229)
   — paleta categórica Okabe‑Ito + `getChartColor`. Entregue v4.3, consumido (#460).
7. ✅ [RDS #230](https://github.com/FabioCaffarello/react-design-system/issues/230)
   — par on-color `fg-on-success` + `success-solid`. Entregue v4.3, consumido (#461).
8. ⏳ [RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232)
   — tom `accent`/data-viz no `DataBadge` (par categórico, fora da escala de status).
   **Aberta** — destrava a consolidação do `data-badge` local.

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

- **Primitivas:** só `tabs` (único gap ratificado — RDS só tem `TabsAsLinks`) +
  4 wrappers de bundle sancionados `rds-accordion`/`rds-autocomplete`/`rds-dialog`/
  `rds-toast` (`'use client'` re-exportando `/granular` — evita vazar +294KB do
  barrel num RSC). `card` também foi consolidado (Card compound do RDS).
- **Composições:** `data-badge`, `kpi-card`, `party-badge` (gaps/ratificados) +
  `section-card`/`section-nav` (wrappers sancionados sobre Card/useScrollSpy do RDS).
- **Zero duplicata local** de componente RDS. **Zero `@radix-ui/react-dialog`**
  direto (deps radix de 7 → 1: só `react-tabs`, #455).
- **Resíduos de cor:** revisitados na fase ADR-039 (ver §"Resíduos de cor" acima) —
  charts (#460) e on-success (#461) migraram p/ o RDS; `accent` aguarda RDS #232;
  só `PartyBadge` segue ratificado.

**Guard anti-regressão** (`scripts/rds-primitive-guard.ts`, CI): trava reintrodução
de qualquer primitiva consolidada. A camada local em deprecação ativa fica honesta.

**Follow-up em aberto:** só a consolidação do `data-badge`, **bloqueada** pela
[RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232) (tom
`accent`/data-viz) — ainda aberta upstream; consome no próximo bump quando sair.
`tabs` segue como único primitivo local por gap legítimo (RDS só tem `TabsAsLinks`).
