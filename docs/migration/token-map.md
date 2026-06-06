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

## Como aplicar — regra de uso na migração

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
