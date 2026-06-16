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

> **Estado WS3/WS4 (2026-06-16):** consolidados — `accordion` (removida),
> `badge`/`label`/`separator` (#440), `skeleton` (#441), `kpi-strip`/`stats-grid`→
> `Stat`/`StatGroup` (#443), `filter-chips`→`Chip` (#445, via **RDS v4** #444).
> **RDS v4.0.0 adotado** (#444): shipou `Dialog.showCloseButton` (#221) e
> `Chip.count` (#222).
>
> O **restante encalha em gap, não em volume** — todos com issue upstream aberta:
> `button`/`input` client-only no RDS ([#224](https://github.com/FabioCaffarello/react-design-system/issues/224));
> `combobox` (+ `command`/`popover` que só o compõem) precisa de `Autocomplete`
> form-native ([#225](https://github.com/FabioCaffarello/react-design-system/issues/225));
> `card` tem modelo de layout diferente (refactor de home com QA); `kpi-card` sem
> slot `floatingBadge`; `data-badge` sem par (source+tone). `dialog` **destravado**
> pelo v4 (`showCloseButton`) → WS2 #420. Sancionados (ficam): `rds-accordion`,
> `section-nav`, `section-card` (já sobre o Card do RDS).

### Primitivas

| Local | Cons. | Balde | Equivalente RDS | Ação | Risco | PR |
| --- | ---: | :---: | --- | --- | --- | --- |
| `accordion` (Radix) | 0 | **X** | `Accordion` (via `rds-accordion`) | ✅ removida (WS1, PR3) | baixo | ✓ |
| `rds-accordion` | 3 | **D** | wrapper sancionado | manter (razão de bundle) | — | — |
| `badge` | 1 | **R** | `Badge` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `label` | 1 | **R** | `Label` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `separator` | 1 | **R** | `Separator` (`./server`) | ✅ consolidado (showroom-only; WS3‑a) | baixo | ✓ |
| `skeleton` | 4 | **R** | `Skeleton` (`./server`) | ✅ consolidado (WS3‑b; RSC-safe, dark via `.dark` do RDS → `slate-800`; delta sutil de shade p/ QA) | baixo-méd | ✓ |
| `input` | 2 | **G** | `Input` (client-only) | BLOQUEADO: RDS Input não tem entry `./server`; quebraria o zero-JS do `search-form` (ADR-022). Fica local até resolver [RDS #224](https://github.com/FabioCaffarello/react-design-system/issues/224) | médio | bloqueado |
| `card` | 3 | **R** | `Card` compound | DIFERIDO p/ PR dedicado: modelo diferente (padding no Card vs por seção; `CardFooter`→`CardActions`; padrão flex equal-height) → refactor de 2 cards da **home** com QA visual do owner | médio | WS3‑c (QA) |
| `popover` | 1 | **G** | `Popover` | só compõe o `Combobox` local → fica com ele ([RDS #225](https://github.com/FabioCaffarello/react-design-system/issues/225)) | médio | bloqueado |
| `button` | 27 | **G** | `Button` (client-only) | BLOQUEADO: RDS Button só no entry client `.`; 13 dos 27 consumidores são Server Components → repointar empurra `"use client"` (regride ADR-022). Fica local até [RDS #224](https://github.com/FabioCaffarello/react-design-system/issues/224) | alto | bloqueado |
| `dialog` | 7 | **R** | `Dialog` | DESTRAVADO no v4 (`showCloseButton` #221) → traduzir 3 modais do painel | médio | WS2 #420 |
| `command` | 1 | **G** | (cmdk; sem par RDS) | só compõe o `Combobox` local → fica com ele ([RDS #225](https://github.com/FabioCaffarello/react-design-system/issues/225)) | alto | bloqueado |
| `tabs` (stateful) | 1 | **G** | só `TabsAsLinks` | gap de tabs com estado → avaliar/issue | baixo | WS4 |
| `sonner` (Toast) | 2 | **R** | `Toast`/`useToast` + provider | precisa provider; avaliar | médio | WS3‑c |

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
| `hero-section` | 1 | **R** | `HeroSection` | repointar `/dev/design` p/ RDS; CUIDADO: showroom demonstra variantes gradient vedadas em produção | baixo | WS4 |
| `combobox` | 2 | **G** | `Autocomplete` (callback-only) | fica local — `Autocomplete` do RDS não integra com form nativo (`name`/GET); regrideria o zero-JS dos filtros ([RDS #225](https://github.com/FabioCaffarello/react-design-system/issues/225)). Carrega `command`+`popover` | alto | bloqueado |
| `data-badge` | 9 | **G** | `Chip`/`Info`/`Badge` | rico (source+tone) sem par RDS → manter ou upstream | médio | local |

### Dual-existência — resolvida

- **`Chip` (ex-`FilterChip`)**: ✅ consolidado no #445 (container `FilterChips` já
  era do RDS; chip singular migrou p/ `Chip` do RDS v4).
- **`HeroSection`**: só falta o showroom `/dev/design` (RDS já em 3 páginas de
  produto). Repoint pendente (cuidado: o showroom demonstra variantes `gradient`
  vedadas em produção que o RDS pode não ter).

## Resíduos ratificados — NÃO migrar (exigem novo ADR)

Paleta de charts `--chart-1..5`, `--accent` roxo (Okabe‑Ito), `text-success-foreground`
(on-color), cores cruas de `PartyBadge`. Documentados em ADR‑034 §5 e D4 Wave 6.

## Issues upstream (WS5)

**Abertas** no repo `FabioCaffarello/react-design-system`:

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

**Candidatas (ainda não abertas, precisam de análise):**

5. `DataBadge`-equivalente (`source` + `tone` semântico) — ou ratificar como
   composição local.
6. Paleta categórica de charts colorblind-safe (sem urgência; resíduo ADR‑034).
7. Par on-color `success-foreground` (RDS tem `fg-success`/`success-bg-emphasis`
   — analisar se já cobre antes de abrir).

## Sequenciamento

`WS0 (este doc)` → `WS6 ADR` → `WS1 morto+dual` → `WS2 #420` → `WS5 issues` →
`WS3-a (skeleton/separator/badge/input/label)` → `WS3-b (card/button)` →
`WS3-c (dialog/sonner, após upstream)` → `WS4 composições+combobox+dedup`.
