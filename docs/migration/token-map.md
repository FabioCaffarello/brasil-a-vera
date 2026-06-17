# Tabela canônica de tradução de tokens — brasil-a-vera × RDS 3.3.1

> Data 2026-06-06 · Branch `feat/migrate-partidos-rds-pilot` · Read-only
>
> Fonte de verdade para toda tradução de classnames Tailwind nas migrações
> rota-a-rota. Toda cópia-rds segue essa tabela; nenhuma tradução ad-hoc.
>
> Tema ATIVO: `dark` (o brasil-a-vera renderiza `<html className="dark">`
> hardcoded; ver `src/app/globals.css` linha 185+). Todos os valores
> comparados abaixo são do tema dark de cada lado.

## Contexto

O brasil-a-vera define seus próprios apelidos de cor em `src/app/globals.css`
(`--foreground`, `--surface`, `--border`, etc), expostos para o Tailwind v4
via `@theme inline`. O RDS 3.3.1 expõe sua hierarquia semântica
(`--color-fg-primary`, `--color-surface-base`, `--color-line-default`, etc).

**Os nomes mudam; a paleta visual de marca é a MESMA** — a escala
azul-marinho `brand-primary-*` do RDS é byte-idêntica à `--color-primary-*`
do brasil-a-vera (entregue na issue RDS #152, paleta default = identidade
do brasil-a-vera). Slate/emerald/rose/amber/sky do RDS são Tailwind
padrão (`#0f172a`, `#34d399`, `#fb7185`, `#fbbf24`, `#38bdf8`) e fornecem
a base neutra/status.

## Tabela canônica

`HEX BaV` = OKLCH do tema dark do brasil-a-vera convertido via culori.
`HEX RDS` = valor calculado dos primitivos slate/brand referenciados pelo
semântico RDS no bloco `.dark`. `Δ` = distância qualitativa
(idêntico / próximo / aceitável / divergente).

### Foreground (texto)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `text-foreground` | `text-fg-primary` | `#f3f5f8` | `#f8fafc` (`slate-50`) | próximo | hierarquia 1/3 BaV → 1/4 RDS |
| `text-foreground-muted` | `text-fg-tertiary` | `#9ea5b0` | `#94a3b8` (`slate-400`) | próximo | **pula `fg-secondary`** por pixel match. RDS tem mais granularidade |
| `text-foreground-subtle` | `text-fg-quaternary` | `#848992` | `#64748b` (`slate-500`) | aceitável | RDS quaternary é levemente mais escuro |

Justificativa de `foreground-muted` → `fg-tertiary` (não `fg-secondary`):

- BaV `foreground-muted` luminance ≈ 0.72 (OKLCH L).
- RDS `fg-secondary` → `slate-300` (`#cbd5e1`) luminance ≈ 0.86 → **muito claro**.
- RDS `fg-tertiary` → `slate-400` (`#94a3b8`) luminance ≈ 0.71 → **bate**.

Mapear para `fg-secondary` clarearia hint/eyebrow em toda migração — mudaria
a hierarquia visual do texto. Pixel match impõe `fg-tertiary`.

### Surface (fundos)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `bg-background` | `bg-surface-canvas` | `#07090e` | `#020617` (`slate-950`) | aceitável | ambos quase-pretos com leve tint frio |
| `bg-surface` | `bg-surface-base` | `#0c1016` | `#0f172a` (`slate-900`) | próximo | BaV é mais escuro/frio |
| `bg-surface-elevated` | `bg-surface-raised` | `#12161d` | `#1e293b` (`slate-800`) | próximo | BaV é mais escuro |
| `bg-surface-overlay` | — | `oklch(... / 0.6)` | n/a | divergente | overlay translúcido, BaV pode manter o `oklch()` cru ou usar `bg-color-overlay-backdrop`; **não aparece na rota piloto** |

### Line (bordas)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `border-border` | `border-line-default` | `#2a2e35` | `#334155` (`slate-700`) | próximo | RDS é levemente mais claro |
| `border-border-strong` | `border-line-emphasis` | `#43484f` | `#475569` (`slate-600`) | próximo | **pixel match contra semântica**: RDS `line-strong` (`slate-500 #64748b`) seria semanticamente "strong", mas pixel-wise `line-emphasis` bate melhor. Escolhido pixel match para preservar contraste visual original |

### Ring (foco)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `ring-ring` | `ring-line-focus` | `#438aff` | `#7390ad` (`brand-primary-400`) | divergente | **observação importante**: BaV ainda usa azul vibrante `oklch(0.65 0.19 260)` para focus ring (mais saturado), enquanto RDS focus ring herda da brand navy. Resultado: focus visualmente mais sombrio na cópia-rds. Aceito nesta piloto — alinhamento de focus ring é decisão à parte (a11y |
| `focus-visible:ring-line-focus` | (mesmo) | (mesmo) | (mesmo) | (mesmo) | use `ring-2 ring-line-focus ring-offset-2 ring-offset-surface-canvas` para parametrar offset correto sobre fundo escuro |

### Status (semânticos)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `text-success` | `text-fg-success` | `#32c364` | `#34d399` (`emerald-400`) | próximo | mesmo conceito, tom levemente mais claro/saturado no RDS |
| `text-warning` | `text-fg-warning` | `#f2a618` | `#fbbf24` (`amber-400`) | próximo | idem |
| `text-destructive` | `text-fg-error` | `#cc2827` | `#fb7185` (`rose-400`) | aceitável | BaV usa um vermelho mais saturado/escuro; RDS usa rose-400. **Não aparece na rota piloto** |
| `bg-success` | `bg-surface-success` ou `bg-color-success` | n/a (não aparece na piloto) | n/a | — | — |

### Brand (marca)

| classe BaV | classe RDS | HEX BaV (dark) | HEX RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `text-brand` | `text-fg-brand` | `#438aff` (`--primary`) | `#7390ad` (`brand-primary-400`) | divergente | BaV `--primary` ainda NÃO foi atualizado para a navy (paleta default do RDS pós-#152); BaV usa um azul vibrante separado. **Não aparece na rota piloto** — quando aparecer, registrar |
| `bg-brand` | `bg-surface-brand` | (mesmo) | `#486581` (`brand-primary-500`) | divergente | (mesma observação) |

### Tipografia (não-cor)

| classe BaV | classe RDS | nota |
|---|---|---|
| `font-mono` | `font-mono` | ambos mapeiam `--font-mono`; idêntico funcionalmente |
| `font-medium` / `font-semibold` / `font-bold` | mesmo | tokens Tailwind padrão |
| `text-xs` / `text-sm` / `text-2xl` / `text-3xl` | mesmo (RDS oferece `Text` componentizado mas classes Tailwind funcionam idênticas) | em `Text` do RDS, prefira `variant="bodySmall"`/`heading` etc. quando o uso for textual canônico |
| `tracking-{wide,wider}` / `uppercase` / `tabular-nums` | mesmo | utilities Tailwind padrão, idênticas |

### Espaçamento, layout, raio

Idênticos em ambos os lados (utilities Tailwind padrão, não tokens semânticos):
`p-*`, `px-*`, `py-*`, `gap-*`, `space-*`, `mx-*`, `m*-auto`, `max-w-*`,
`flex`, `grid`, `grid-cols-*`, `min-w-0`, `truncate`, `items-*`,
`justify-*`, `rounded-*`, `size-*`, `shrink-0`, `transition`,
`hover:*`, `focus-visible:*`, `outline-none`.

## Extensão piloto-2 (`/rds/parlamentares/[id]`)

Tokens que apareceram na piloto-2 e não estavam previstos na tabela
original. Valores dark comparados (BaV `globals.css` × RDS 3.7.0
`react-design-system.css`).

| classe BaV | classe RDS | valor BaV (dark) | valor RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `bg-success/N` | `bg-success/N` (sem tradução) | `--success` `oklch(0.72 0.18 150)` ≈ `#2fc26b` | `--color-success` → `emerald-400` `#34d399` | próximo | RDS também define `--color-success`; utility homônima. Usos: DistribuicaoBar (`/30`), badges voto (`/20` via lib) |
| `bg-warning/N`, `border-warning/N` | (sem tradução) | `--warning` `oklch(0.78 0.16 75)` | `--color-warning` → `amber-400` `#fbbf24` | próximo | idem; usos: caixas de pares (`/40`, `/5`, `/10`) |
| `bg-destructive/N` | `bg-error/N` | `--destructive` `oklch(0.55 0.2 27)` ≈ `#cc2827` | `--color-error` → `rose-400` `#fb7185` | aceitável | RDS error é rose (mais claro/rosado). Calibragem prevista na tabela original (§Status) confirmada na piloto-2 |
| `text-destructive` | `text-fg-error` | idem acima | `fg-error` → `rose-400` | aceitável | já previsto na tabela original; primeiro uso real |
| `stroke-border` | `stroke-line-default` | `--border` `#2a2e35` | `line-default` → `slate-700` `#334155` | próximo | linha de referência 50% da Sparkline |
| `text-brand` (active state) | `text-fg-brand` | `--primary` → navy-400 `#7390ad` (pós-#358) | `fg-brand` → `brand-primary-400` `#7390ad` | **idêntico** | pós-#358 a marca é byte-idêntica dos dois lados |
| `bg-brand/10` (active state) | `bg-fg-brand/10` | navy-400 @10% | brand-primary-400 @10% | **idêntico** | pixel match contra semântica (mesmo precedente do `line-emphasis`); `surface-brand` seria brand-500, mais escuro |
| `text-accent`, `fill-accent` | **sem equivalente — MANTIDO** | `--accent` `oklch(0.62 0.22 295)` (roxo data-viz) | `brand-accent` → `cyan-400` | **divergente** | roxo de data-viz do BaV não existe no RDS (accent upstream é cyan). Mantido o token BaV na cópia (Sparkline, link drill-down). Candidato a issue upstream futura se o padrão se repetir nos outros perfis |

A tabela canônica acima é a **fonte única de cor**. Sua aplicação na migração
segue duas regras objetivas:

### Regra 1 — cor sempre vem da classe traduzida

A cor de qualquer elemento é expressa pela classe Tailwind traduzida
(`text-fg-tertiary`, `bg-surface-base`, etc.), **nunca** pelas props
`colorRole`/`colorShade` do `<Text>` do RDS — mesmo quando essas props
mapeiam para o mesmo resultado.

Por quê:

- A tabela acima é a fonte única de cor; as props do RDS são um segundo
  sistema paralelo que pode divergir.
- `className="text-fg-tertiary"` é autoexplicativo na revisão (cruza
  direto com a tabela); `colorRole="neutral" colorShade="light"` exige
  conhecer a indireção.
- Menos acoplamento à API de props do RDS: a classe depende só do token
  CSS, que é a camada mais estável.

```tsx
// ❌ NÃO — duas fontes de cor convivendo (props RDS + className traduzido)
<Text variant="bodySmall" colorRole="neutral" colorShade="light">…</Text>

// ✅ SIM — cor única, vinda da tabela
<Text variant="bodySmall" className="text-fg-tertiary">…</Text>
```

### Regra 2 — `<Text>` só quando o variant cobre TODA a typography

`<Text>` do RDS é usado pela typography (tamanho, peso, line-height do
variant), **não pela cor**. Usar `<Text>` faz sentido quando o variant
cobre a typography do elemento sem precisar de override pesado.

Critério objetivo: **quantas propriedades de typography você precisaria
sobrescrever?**

- **Zero ou uma** → `<Text variant="…" className="text-fg-X (+ talvez 1 utility)">`
- **Duas ou mais** → HTML cru (`<p>`, `<h1>`, `<span>`) com classes
  traduzidas

Exemplos da rota piloto:

```tsx
// Eyebrow no original:
// <p className="font-mono text-foreground-muted text-xs uppercase tracking-wider">

// 4 propriedades de typography (font-mono, text-xs, uppercase, tracking-wider).
// variant="caption" cobriria text-xs, mas as 3 outras viram override.
// → HTML cru:
<p className="font-mono text-fg-tertiary text-xs uppercase tracking-wider">
  Partido
</p>

// H1 com tamanho custom (text-3xl):
// variant="heading" forçaria <h2> + tokens próprios de heading,
// conflitando com text-3xl. → HTML cru:
<h1 className="font-bold text-3xl text-fg-primary">{sigla}</h1>

// Subtítulo simples (text-sm):
// variant="bodySmall" cobre text-sm/line-height sem conflito.
// → <Text> com cor via className:
<Text variant="bodySmall" className="text-fg-tertiary">{nomeOficial}</Text>
```

A regra reduz o `<Text>` ao seu valor real (escala tipográfica centralizada)
e mantém a tabela como única fonte de cor.

## Extensão piloto-3 (`/rds/proposicoes/[tipo]/[numero]/[ano]`)

Um token novo e uma classe de pendência:

| classe BaV | classe RDS | valor BaV (dark) | valor RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `text-success-foreground` → `text-fg-on-success` | **`fg-on-success` + `bg-success-solid`** (RDS v4.3, #230) | — (token BaV removido) | `--color-success-solid` emerald-700 `#047857` + `--color-fg-on-success` branco (≈ 5.48:1 AA, estável nos dois temas) | **migrado** | par on-color sólido entregue upstream (#230); badge `TRANSFORMADA_EM_NORMA` migrado em ADR-039. Resíduo encerrado — sobra só o `accent` (RDS #232) |

Pendência (não traduzida, fora do escopo de classe Tailwind): os charts
recharts (`apoio-partido-chart.tsx`, `votos-consolidados-chart.tsx`)
usam `hsl(var(--success))`/`var(--accent)` e `color-mix(in oklch, …)`
inline em props. São client islands compartilhados importados dos
originais (precedente piloto-2) — calibram na promoção, junto com
`getTipoVotoStyle`.

## Extensão piloto-4 (`/rds/votacoes/[id]`)

Dois tokens novos (pill invertido de filtro ativo) e uma generalização.
Valores dark comparados (BaV `globals.css` × RDS `react-design-system.css`),
aprovados pelo owner nos checkpoints da piloto-4:

| classe BaV | classe RDS | valor BaV (dark) | valor RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `bg-foreground` | `bg-fg-primary` | `--foreground` `#f3f5f8` | `fg-primary` → `slate-50` `#f8fafc` | próximo | par invertido do pill ativo (filtro de votos individuais). Mesmo delta já aceito no par direto `text-foreground → text-fg-primary` da tabela canônica, em papel de bg |
| `text-background` | `text-surface-canvas` | `--background` `#07090e` | `surface-canvas` → `slate-950` `#020617` | aceitável | on-color do pill invertido. Mesmo delta já aceito no par direto `bg-background → bg-surface-canvas`, em papel de texto |
| `bg-brand/N` | `bg-fg-brand/N` (qualquer N) | navy-400 `#7390ad` @N% | brand-primary-400 `#7390ad` @N% | **idêntico** | **generaliza** a entrada `bg-brand/10` da extensão piloto-2: a base é byte-idêntica pós-#358 e a opacidade é aritmética — nenhum stop novo por opacidade. Primeiro uso da generalização: `/15` (tag "Mesma proposição" do footer de relacionadas) |

Pendência da mesma classe da piloto-3 (não traduzida — decisão do owner
nos checkpoints CP1/CP2 da piloto-4): `VotacaoHemicicloChart` (SVG
inline com `fill: var(--success)` etc.) e `MargemDecisaoBar` (barra
CSS-only `bg-success`/`bg-destructive`) são importados dos ORIGINAIS
pela rota staging, sem cópia e sem tradução — consistência cross-chart
na seção Resumo (mesmos verdes/vermelhos do donut recharts ao lado).
Calibram na promoção, junto com os charts recharts e `getTipoVotoStyle`.

## Extensão piloto-5 (`/rds/privacidade` + `/rds/feed`)

Uma generalização (sem cor nova): a base brand com opacidade apareceu em
dois papéis utility ainda sem linha literal. Valores dark comparados
(BaV `globals.css` × RDS `react-design-system.css` 3.9.0), aprovados
pelo owner no checkpoint da piloto-5:

| classe BaV | classe RDS | valor BaV (dark) | valor RDS (dark) | Δ | nota |
|---|---|---|---|---|---|
| `text-brand/N`, `border-brand/N` | `text-fg-brand/N`, `border-fg-brand/N` | `--primary` → navy-400 `#7390ad` @N% | `fg-brand` → `brand-primary-400` `#7390ad` @N% | **idêntico** | **generaliza** as entradas piloto-2 (`text-brand`, byte-idêntico) e piloto-4 (`bg-brand/N`, qualquer N) para a base brand em qualquer papel utility: o prefixo (`text-`/`bg-`/`border-`) só escolhe a propriedade CSS que recebe o MESMO valor byte-idêntico pós-#358, e a opacidade é aritmética (princípio CP4 da piloto-4). Nenhum stop futuro por papel utility ou opacidade da base brand. Primeiros usos: `hover:text-brand/80` (links de /privacidade), `hover:border-brand/60` (cards de /feed) |

## Tokens idênticos (sem tradução)

Estes são aliases que **não precisam ser substituídos** porque o nome é o
mesmo dos dois lados ou o utility é puramente Tailwind:

- `font-mono`, `font-medium`, `font-semibold`, `font-bold`
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`,
  `text-3xl`, `text-4xl`
- `tracking-tight`, `tracking-wide`, `tracking-wider`, `uppercase`,
  `tabular-nums`, `truncate`
- `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`
- Toda a malha de layout (`flex`, `grid`, `space-y-*`, `gap-*`,
  `items-*`, `justify-*`, `min-w-0`, `max-w-*`, `mx-auto`, `px-*`,
  `py-*`, `p-*`)
- Estados (`hover:*`, `focus-visible:*`, `outline-none`,
  `disabled:opacity-*`)

## Resumo operacional (cheat-sheet)

Para usar enquanto traduz os 5 componentes da rota piloto:

```
text-foreground         →  text-fg-primary
text-foreground-muted   →  text-fg-tertiary       (não fg-secondary!)
text-foreground-subtle  →  text-fg-quaternary
text-success            →  text-fg-success
text-warning            →  text-fg-warning

bg-background           →  bg-surface-canvas
bg-surface              →  bg-surface-base
bg-surface-elevated     →  bg-surface-raised

border-border           →  border-line-default
border-border-strong    →  border-line-emphasis   (não line-strong)
ring-ring               →  ring-line-focus        (visual mais sombrio — aceito)
```

## Observações para iterações futuras

- **Identidade brand desalinhada localmente.** BaV ainda usa
  `--primary: oklch(0.65 0.19 260)` (`#438aff` — azul vibrante) para
  `--color-brand` e `--color-ring`. RDS adotou a paleta navy do brasil-a-vera
  como brand. Quando uma rota da migração usar `text-brand`/`bg-brand`, vai
  haver mudança visual real. Decidir, à parte, se atualizar o
  `--primary`/`--ring` do BaV para apontar para `var(--color-brand-primary-400)`
  do RDS (alinhamento) ou manter o azul vibrante separado (intencional).
- **Surfaces e borders BaV são levemente mais escuros que os equivalentes
  RDS.** O efeito agregado é uma cópia-rds que parece "um nadinha mais clara"
  que o original. Aceitável — diferença sub-perceptual. Se acumular nas
  migrações futuras e ficar visível em conjunto, considerar atualizar os
  `--surface*`/`--border*` do BaV para apontar para escalas RDS (em vez de
  OKLCH custom).
- **`fg-secondary` do RDS fica não-mapeado.** A hierarquia BaV (3 níveis
  de texto) é menos granular. Migrações que precisem do 4º nível usam
  `fg-secondary` diretamente, mas isso seria adição de hierarquia, não
  tradução.
- **`destructive` do BaV é mais saturado que `fg-error` do RDS.** Não
  aparece na piloto; quando aparecer, calibrar.

Estas observações **não bloqueiam** a piloto — registradas para alinhamento
posterior, sem agir agora.

## Token bridge (Fase B / ADR-034) — pré-requisito para usar estas classes

As classes RDS desta tabela **só resolvem** porque o
[ADR-034](../architecture/ADR/034-token-bridge-rds-e-promocao-fase-b.md)
estabeleceu um *token bridge* em `src/app/globals.css`: import global do CSS do
RDS + `@theme inline` registrando os tokens semânticos (`fg-*`, `surface-*`,
`line-*`, `error*`). Sem o bridge, o RDS só ship as utilities que **seus
componentes** usam — variantes de opacidade (`bg-fg-brand/10`) e bases não
pré-compiladas (`bg-surface-canvas`, `ring-line-focus`) **no-opam**
silenciosamente (build verde, visual quebrado — classe #303/#304).

Regras que a tabela acima passa a pressupor:

- **`text-` e `stroke-` são overloaded** (também `text-<size>`/`stroke-<width>`).
  O bridge gera color-only (`bg`/`border`/`ring`/`fill`/`divide`); `text-`/`stroke-`
  de cor só existem onde o RDS pré-compilou (`text-fg-*`). Portanto:
  - texto sobre superfície clara/invertida → **`text-fg-inverse`** (não
    `text-surface-canvas`). Corrige a entrada piloto-4 abaixo.
  - stroke de SVG → `style={{ stroke: 'var(--color-line-*)' }}` inline (não
    `stroke-line-*`).
- **`bg-success/N` e `bg-warning/N` permanecem nos valores do BaV**
  (neutralizados no `globals.css` para o bridge ser puramente aditivo). Só o
  **texto** migra (`text-success`→`text-fg-success`).
- **`bg-destructive/N`→`bg-error/N`** converge para rose-* do RDS (família `error`
  bridada; sem colisão com o BaV, que usa `destructive`).
- Guard `npm run guard:rds-noop` (CI required, job *Lint & Build*) falha se alguma
  classe RDS usada não tiver regra no CSS gerado — qualquer `text-surface-*`/
  `stroke-<rds>` novo vira CI vermelho.

Mapeamento consolidado na Fase B:

```
text-destructive          →  text-fg-error
bg-destructive/N          →  bg-error/N            (converge p/ rose-* do RDS)
border-destructive/N      →  border-error/N
text-surface-canvas       →  text-fg-inverse       (pill invertido; corrige piloto-4)
stroke-line-default (SVG) →  style stroke var(--color-line-default)
```

## Charts / data-viz (Fase C / ADR-034 §5) — NÃO traduzem

Os charts (recharts + SVG hemiciclo) usam a paleta categórica `--chart-1..5`
(Okabe-Ito colorblind-safe) e `--accent` — **sem equivalente no RDS** (o pacote
não expõe paleta de chart). Por isso os charts **permanecem em tokens BaV por
inteiro** (fills de dado + chrome de tooltip/legenda): resíduo documentado, mesma
categoria do `accent`. O chrome BaV é sub-perceptual vs RDS.

Regra dura herdada do #303/#304 e agora vigiada pelo guard: **nunca**
`hsl(var(--token))` — todo token é OKLCH, então `hsl(oklch())` é CSS inválido
(cor preta). Use `var(--token)` direto ou `color-mix(in oklch, var(--token) N%,
transparent)`. O guard `rds-noop-guard` falha se `hsl(var(` aparecer em `src/**`.
