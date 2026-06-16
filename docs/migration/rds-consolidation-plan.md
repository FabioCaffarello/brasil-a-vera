# Plano de consolidação RDS — fase pós-migração

> Data: 2026-06-16 · RDS instalado: **3.12.0** · Read-only (planejamento)
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

### Primitivas

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `accordion` (Radix) | 0 | **X** | `Accordion` (via `rds-accordion`) | ✅ removida (WS1, PR3) | baixo | ✓ |
| `rds-accordion` | 3 | **D** | wrapper sancionado | manter (razão de bundle) | — | — |
| `badge` | 1 | **R** | `Badge` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `label` | 1 | **R** | `Label` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `separator` | 1 | **R** | `Separator` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `skeleton` | 4 | **R** | `Skeleton` (`./server`) | ✅ consolidado (WS3‑b; RSC-safe, dark via `.dark` do RDS → `slate-800`; delta sutil de shade p/ QA) | baixo-méd | ✓ |
| `input` | 2 | **G** | `Input` (client-only) | DEFERIDO: RDS Input não tem entry server; repointar quebraria o zero-JS do `search-form` (ADR-022). Fica local até Input server-safe upstream | médio | WS5 |
| `card` | 3 | **R** | `Card` compound | repointar (mapear sub-componentes) | médio | WS3‑b |
| `popover` | 1 | **R** | `Popover` | acoplado ao Combobox | médio | WS4 |
| `button` | 27 | **R** | `Button` | repointar em massa (mecânico) | médio | WS3‑b |
| `dialog` | 7 | **G** | `Dialog` | falta `showCloseButton` p/ 3 modais → upstream | médio | WS3‑c |
| `command` | 1 | **R/G** | `CommandPalette`/`Dropdown` | acoplado ao Combobox | alto | WS4 |
| `tabs` (stateful) | 1 | **G** | só `TabsAsLinks` | gap de tabs com estado → avaliar/issue | baixo | WS4 |
| `sonner` (Toast) | 2 | **R** | `Toast`/`useToast` + provider | precisa provider; avaliar | médio | WS3‑c |

### Composições

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `hero-section` | 1 | **R** | `HeroSection` | repointar `/dev/design` p/ RDS + deletar (precisa QA visual) | baixo | WS4 |
| `section-nav` | 4 | **D** | wrapper sobre `useScrollSpy` | manter (composição sancionada) | — | — |
| `section-card` | 7 | **R** | `Card` compound | repointar | médio | WS4 |
| `kpi-strip` | 1 | **R** | `Stat`/`StatGroup` | substituir | médio | WS4 |
| `stats-grid` | 1 | **R** | `Stat`/`StatGroup` | substituir | médio | WS4 |
| `kpi-card` | 2 | **R** | `Stat`/`StatGroup` | substituir | médio | WS4 |
| `filter-chips` (`FilterChip` singular) | 9 | **R** | `Chip` (+ container `FilterChips`) | repointar p/ `Chip` do RDS (verificar prop `count`); QA visual | médio | WS4 |
| `data-badge` | 9 | **G** | `Chip`/`Info`/`Badge` | rico (source+tone) sem par RDS → upstream ou manter | médio | WS5 |
| `combobox` | 2 | **R** | `Dropdown`/`SearchInput`/`Select` | re-arquitetura; remove `command`+`popover` | alto | WS4 |
| `party-badge` | 4 | **D** | — | manter (cores oficiais, D4 Wave 6) | — | — |

### Dual-existência (reclassificada para WS4 — são repoints, não dead-code)

WS1 (PR3) ficou só com os **órfãos puros** (0 consumidores, deleção sem repoint):
`accordion` local e `trust-banner`. As duas dual-existências abaixo exigem
repoint + QA visual, então vão para a consolidação de composições (WS4):

- **`HeroSection`**: RDS em 3 páginas de produto; local só no showroom
  `/dev/design`. → repointar showroom p/ RDS, deletar local (QA visual).
- **`Chip` (ex-`FilterChip`)**: páginas já usam o container `FilterChips` do RDS
  (4); os 9 consumidores do chip singular usam o `FilterChip` **local**. O RDS
  expõe o chip como **`Chip`** (docs mostram `<Chip asChild selected>`), com
  `selected`/`asChild`. **Verificar a prop `count`** (sub-badge): se o `Chip` do
  RDS a tiver, repoint direto; se não, é o único gap → issue upstream (WS5) e o
  chip local sobrevive com a issue linkada.

## Resíduos ratificados — NÃO migrar (exigem novo ADR)

Paleta de charts `--chart-1..5`, `--accent` roxo (Okabe‑Ito), `text-success-foreground`
(on-color), cores cruas de `PartyBadge`. Documentados em ADR‑034 §5 e D4 Wave 6.

## Issues upstream candidatas (WS5)

1. **`showCloseButton?: boolean`** no `Dialog`/`DialogContent` — desbloqueia
   `ConsentModal`, `AcoesLgpd`, `MigracaoLocalStorageModal` (hoje usam Radix direto).
2. **`FilterChip` singular** com `selected`/`count`/`asChild` (Slot) — se o
   `FilterChips` do RDS não cobrir.
3. **`DataBadge`-equivalente** (`source` + `tone` semântico) — ou ratificar como
   composição local.
4. **Paleta categórica de charts** colorblind-safe (sem urgência; resíduo ADR‑034).
5. **Par on-color `success-foreground`**.

## Sequenciamento

`WS0 (este doc)` → `WS6 ADR` → `WS1 morto+dual` → `WS2 #420` → `WS5 issues` →
`WS3-a (skeleton/separator/badge/input/label)` → `WS3-b (card/button)` →
`WS3-c (dialog/sonner, após upstream)` → `WS4 composições+combobox+dedup`.
