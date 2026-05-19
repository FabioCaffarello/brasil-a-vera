# Design Tokens

> Brasil a Vera · Design · v0.2
> Última atualização: 2026-05-15 (Sprint 4.0 PR 2 — tokens semânticos OKLCH dark-first)
> Status: **accepted**
> Governança: [ADR-021 — Design System & shadcn-curado](../architecture/ADR/021-design-system-shadcn-curado.md)

---

## Sumário

- [Princípios](#princípios)
- [Tokens semânticos — Sprint 4.0 (OKLCH)](#tokens-semânticos--sprint-40-oklch)
- [Paleta neutra (mantida)](#paleta-neutra-mantida)
- [Paleta semântica (Tailwind legacy, mantida)](#paleta-semântica-tailwind-legacy-mantida)
- [Cor primária — Variante 2 (institucional dormente)](#cor-primária--decidida-variante-2-azul-marinho-institucional)
- [Tipografia](#tipografia)
- [Espaçamento](#espaçamento)
- [Borda e Radius](#borda-e-radius)
- [Sombras](#sombras)
- [Estados de interação](#estados-de-interação)

---

## Princípios

1. **Dark-first na Wave 4**. Sprint 4.0 estabelece a paleta OKLCH dark como padrão; light fica dormente (tokens institucionais HEX preservados para retorno futuro).
2. **Tokens semânticos sempre via CSS variables**. Componentes do design system consomem `var(--color-foreground)`, nunca `#fafafa` ou `oklch(...)` inline.
3. **Refinement, não redesign** (princípio herdado da Sprint 3.1). Tokens novos NÃO substituem `zinc-*` em consumers existentes — coexistem.
4. **Acessibilidade preservada**. Todos os pares texto/fundo passam WCAG 2.1 AA (≥4.5:1 corpo, ≥3:1 large/UI). Validação empírica via `.local/wcag-check.ts` (culori) registrada em `WCAG-AUDIT.md`.
5. **Tailwind v4 nativo**. Tokens via `@theme inline` em `globals.css`. Sem `tailwind.config.ts`.

---

## Tokens semânticos — Sprint 4.0 (OKLCH)

Esta camada nova foi introduzida em 2026-05-15 pela Sprint 4.0 PR 2. Define o vocabulário do design system (`src/design-system/`). **Não substitui** os tokens institucionais HEX — coexistem.

### Lista canônica

| Token CSS var | Tailwind class | Função | Light (OKLCH) | Dark (OKLCH) |
|---|---|---|---|---|
| `--background` | `bg-background` | Fundo da página | `0.985 0 0` | `0.14 0.012 260` |
| `--surface` | `bg-surface` | Card padrão | `1 0 0` | `0.17 0.014 260` |
| `--surface-elevated` | `bg-surface-elevated` | Card CTA elevado | `1 0 0` | `0.2 0.016 260` |
| `--surface-overlay` | `bg-surface-overlay` | Backdrop de Dialog/Sheet | `0.205 0.005 260 / 0.5` | `0.07 0.006 260 / 0.6` |
| `--border` | `border-border` | Borda decorativa | `0.9 0.005 250` | `0.3 0.014 260` |
| `--border-strong` | `border-border-strong` | Borda hover/foco | `0.83 0.005 250` | `0.4 0.014 260` |
| `--foreground` | `text-foreground` | Texto principal | `0.205 0.005 260` | `0.97 0.005 250` |
| `--foreground-muted` | `text-foreground-muted` | Texto secundário | `0.37 0.005 260` | `0.72 0.018 260` |
| `--foreground-subtle` | `text-foreground-subtle` | Texto terciário (captions) | `0.55 0.005 260` | `0.63 0.014 260` |
| `--primary` | `bg-brand`/`text-brand` | Marca / CTA principal (semantic) | `0.32 0.06 248` | `0.65 0.19 260` |
| `--primary-foreground` | `text-brand-foreground` | Texto sobre `--primary` | `1 0 0` | `0.14 0.012 260` |
| `--success` | `bg-success` | Estado positivo | `0.5 0.13 150` | `0.72 0.18 150` |
| `--success-foreground` | `text-success-foreground` | Texto sobre `--success` | `1 0 0` | `0.12 0 0` |
| `--warning` | `bg-warning` | Disclaimer / amostra insuficiente | `0.55 0.16 60` | `0.78 0.16 75` |
| `--warning-foreground` | `text-warning-foreground` | Texto sobre `--warning` | `1 0 0` | `0.15 0 0` |
| `--destructive` | `bg-destructive` | Estado negativo | `0.5 0.18 27` | `0.55 0.2 27` |
| `--destructive-foreground` | `text-destructive-foreground` | Texto sobre `--destructive` | `1 0 0` | `0.99 0 0` |
| `--ring` | `ring-ring` | Focus ring (WCAG 2.4.7) | `0.36 0.06 248` | `0.65 0.19 260` |
| `--chart-1..5` | `text-chart-N` / `fill-chart-N` | Paleta Recharts (Sprint 4.3+) | ver `globals.css` | ver `globals.css` |

### Decisão de nomenclatura: `--color-brand` (não `--color-primary`)

A paleta institucional já ocupa `--color-primary-50..950` (HEX). Para evitar conflito, o token semântico do design system aparece em Tailwind como `bg-brand` / `text-brand-foreground`. A CSS variable interna é `--primary` (sem prefixo), mas o `@theme inline` mapeia para `--color-brand`.

### Diferenças vs proposta original do designer

Valores extraídos do `styles.css` do designer parceiro (`usernamette/vera-politica`, linhas 48-95). Re-validação WCAG no `wcag-check.ts` exigiu 5 ajustes:

| Token (dark) | Designer | Nosso (após WCAG) | Razão |
|---|---|---|---|
| `--foreground-muted` | `0.66 0.018 260` | `0.72 0.018 260` | Passa AAA em ambos `--surface` e `--background` |
| `--foreground-subtle` | (não tinha) | `0.63 0.014 260` | Novo token; designer só tinha foreground-muted |
| `--destructive` | `0.66 0.22 25` | `0.55 0.2 27` | Designer dava ratio 3.35 contra fg branco (FAIL AA); escurecido passa 5.22 |
| `--primary-foreground` | `0.99 0 0` (branco) | `0.14 0.012 260` (= `--background`) | Designer dava 3.21 sobre `--primary`; dark text sobre bright primary é estratégia idêntica à de success/warning do próprio designer |
| `--border` / `--border-strong` | alpha 8%/15% white | lightness `0.3` / `0.4` | Decorativos (fora WCAG 1.4.11); mais visíveis no dark |

### Utilitários custom

Em `@layer utilities` (consumir via `className="glass"` etc):

- `.glass` — superfície translúcida com `backdrop-filter: blur(12px)`
- `.grid-bg` — fundo com grid sutil + máscara radial (hero da home)
- `.text-gradient` — gradiente em headings hero (white → cool-gray)
- `.shadow-glow` — elevação com brilho de marca (CTA destacado)
- `.shadow-soft` — sombra suave (cards elevados)

Otimizados para dark. Light theme dormente; consumers em light adaptarão localmente quando 4.1+ trouxer toggle.

---

## Paleta neutra (mantida)

`zinc` da Tailwind, escala completa 50–950. Sem alteração — 95% das ocorrências atuais usam esta escala. Justificativa do projeto: neutralidade puro com hint frio, melhor para texto longo do que `gray` (verdadeiramente neutro) ou `slate` (hint azul mais forte).

## Paleta semântica (mantida)

| Token | Função | Cor base |
|---|---|---|
| `emerald` (700/400 em dark) | Aprovado, alinhamento alto, voto SIM positivo | Tailwind `emerald-700` |
| `rose` (700/400 em dark) | Rejeitado, divergência, contradição | Tailwind `rose-700` |
| `amber` (700/400 em dark) | Warnings, disclaimers, amostra insuficiente | Tailwind `amber-700` |

Sem mudança. Sistema cromático para sinais semânticos é convencional e legível.

---

## Cor primária — **DECIDIDA: Variante 2 (azul-marinho institucional)**

> Decisão do operador em 2026-05-15. Razão: contraste mais alto (10.3:1), referência institucional brasileira (Congresso, Supremo), sem risco de colisão com paleta semântica (`emerald`/`amber`). Variantes 1 e 3 documentadas abaixo para histórico.

Paleta aplicada em `src/app/globals.css`:

```
--color-primary-50:  #f0f4f8
--color-primary-100: #d9e2ec
--color-primary-200: #bcccdc
--color-primary-300: #9fb3c8
--color-primary-400: #7390ad
--color-primary-500: #486581
--color-primary-600: #334e68   ← uso principal (texto / borda ativa)
--color-primary-700: #243b53   ← CTAs primárias (bg)
--color-primary-800: #1a2a3a
--color-primary-900: #102a43
--color-primary-950: #061a35
```

Contraste WCAG: `primary-700` (#243b53) sobre branco = **10.3:1** (AA + AAA). `primary-300` (#9fb3c8) sobre `zinc-950` (#09090b) = **8.7:1** (AA + AAA dark mode).

Aqui o produto adquire identidade. A cor primária aparece em:
- **Focus ring** (acessibilidade)
- **CTAs principais** (botões "Filtrar", "Explorar parlamentares", "Encontrar meus representantes")
- **Links em destaque** (header, navegação principal, cards CTA)
- **Bordas ativas/selecionadas** (filtros aplicados)

A cor primária **não substitui zinc** em texto regular nem em UIs de dados (tabelas, listas). É reservada a interação e identidade.

### Variante 1 — Verde-bandeira sóbrio (não escolhida)

```
--color-primary-50:  #f0f7f1
--color-primary-100: #d8ebda
--color-primary-200: #b5d8b9
--color-primary-300: #87bd8e
--color-primary-400: #5b9d64
--color-primary-500: #3d8048   ← uso principal
--color-primary-600: #2e6638
--color-primary-700: #275230
--color-primary-800: #224128
--color-primary-900: #1d3622
--color-primary-950: #0f1d12
```

Tom verde fosco, sem brilho. Contraste WCAG AA em `#275230` (primary-700) sobre branco: ~8.5:1. Em dark mode, `#87bd8e` (primary-300) sobre `#18181b` (zinc-950): ~8.1:1. **Identidade**: verde da bandeira atenuado para não competir com sinais semânticos (emerald).

Risco: similaridade com `emerald` pode confundir leitor casual. Mitigação: emerald é usado só com badge/contexto semântico explícito (status "aprovado"); primary é estrutura de interação.

### Variante 2 — Azul-marinho institucional (escolhida ✓)

```
--color-primary-50:  #f0f4f8
--color-primary-100: #d9e2ec
--color-primary-200: #bcccdc
--color-primary-300: #9fb3c8
--color-primary-400: #7390ad
--color-primary-500: #486581
--color-primary-600: #334e68   ← uso principal
--color-primary-700: #243b53
--color-primary-800: #1a2a3a
--color-primary-900: #102a43
--color-primary-950: #061a35
```

Azul-marinho próximo do institucional brasileiro (Congresso, Supremo). Mais neutro que verde-bandeira. Contraste `#243b53` sobre branco: ~10.3:1.

Risco: azul é convencional em UIs públicas — pouca diferenciação visual entre Brasil a Vera e outros sites .gov.

### Variante 3 — Âmbar-terra (não escolhida)

```
--color-primary-50:  #fdf8f0
--color-primary-100: #f7ecd1
--color-primary-200: #efd9a3
--color-primary-300: #e3be6c
--color-primary-400: #d09f3e
--color-primary-500: #a87929   ← uso principal
--color-primary-600: #875e1f
--color-primary-700: #6d4b1a
--color-primary-800: #573c17
--color-primary-900: #483115
--color-primary-950: #261805
```

Âmbar/ocre — referência ao amarelo da bandeira atenuado para tom terroso. Contraste `#6d4b1a` sobre branco: ~7.9:1.

Risco: pode colidir visualmente com `amber` semântico (warnings). Mitigação possível mas trabalhosa: amber semântico exigiria badge explícito ou cor levemente diferente (warning fica `yellow-700` em vez de `amber-700`).

---

## Tipografia

### Famílias (mantidas)

- `--font-sans: var(--font-geist-sans)` — Geist Sans, já configurado
- `--font-mono: var(--font-geist-mono)` — Geist Mono, já configurado

Sem adicionar fonte display web. Justificativas: zero impacto em LCP (sem FOUT/FOIT extra), Geist tem peso visual moderno suficiente, princípio mudança mínima.

### Escala (formalizar a já praticada)

Hoje o uso real concentra em `text-xs` (88) + `text-sm` (102), com saltos para `text-2xl/3xl` (8-10 cada). Há **gap em `text-base/lg/xl`** (4-1 ocorrências). A escala vai ser explicitada e usada de forma mais consistente.

| Token | Tamanho | Line-height | Uso |
|---|---|---|---|
| `text-xs` | 12px | 1.5 | Labels secundárias, captions, badges |
| `text-sm` | 14px | 1.5 | Texto auxiliar, hints, body em cards densos |
| `text-base` | 16px | 1.6 | **Body principal de prosa** (pouco usado hoje — usar mais em cards CTA, descrições) |
| `text-lg` | 18px | 1.5 | Subtítulos de seção dentro de card |
| `text-xl` | 20px | 1.4 | Títulos de cards CTA |
| `text-2xl` | 24px | 1.3 | H2 de páginas |
| `text-3xl` | 30px | 1.2 | H1 de páginas de listagem |
| `text-4xl` | 36px | 1.1 | H1 de hero (home) |

Ratio: 1.2× entre níveis adjacentes (modular, não 1.25 — escolha pragmática vs. valores arredondados em px).

### Pesos

- `font-normal` (400) — body, hints
- `font-medium` (500) — labels, badges, navegação
- `font-semibold` (600) — H1/H2, CTAs

Sem `font-bold` (700+) — escala consistente.

---

## Espaçamento

Base **4px** (já é o padrão Tailwind, formalizar). Tokens em uso hoje: `gap-2` (8px), `gap-3` (12px), `p-3` (12px), `p-4` (16px). Tokens recomendados:

| Token | Valor | Uso |
|---|---|---|
| `space-1` (4px) | inline icon + label |
| `space-2` (8px) | gap entre elementos pequenos relacionados |
| `space-3` (12px) | padding interno de cards densos |
| `space-4` (16px) | padding interno de cards normais |
| `space-6` (24px) | gap entre seções no body |
| `space-8` (32px) | gap entre seções principais da página |
| `space-12` (48px) | espaçamento entre hero e conteúdo |

---

## Borda e Radius

| Token | Valor | Uso |
|---|---|---|
| `rounded-md` | 6px | Inputs, badges (raro hoje, manter) |
| `rounded-lg` | 8px | Cards (uso dominante — 31×) |
| `rounded-xl` | 12px | Cards CTA destacados (novo — adicionar) |
| `rounded-full` | 9999px | Avatares (uso atual) |

Bordas: `border-zinc-200` (light) / `border-zinc-700` (dark) — uso atual mantido.

---

## Sombras

Hoje `shadow-sm` (4×) e `shadow-md/lg` (1× cada). Refinement: usar sombra para **elevar cards CTA** apenas (não sobrecarregar com elevação universal).

| Token | Uso |
|---|---|
| (nenhuma sombra) | Cards de listagem, badges, controles de formulário |
| `shadow-sm` | Bordas sutis em hover de cards interativos |
| `shadow-md` | Cards CTA da home (hero) — único nível de elevação destacada |

---

## Estados de interação

| Estado | Tratamento |
|---|---|
| `hover` | Mudança de cor de fundo/borda em ~5-10% mais escuro, transição 150ms |
| `focus-visible` | Ring 2px `primary-500` com offset 2px — sempre visível em navegação por teclado |
| `active` | Cor ligeiramente mais escura que hover |
| `disabled` | Opacity 0.5, cursor `not-allowed`, sem hover effect |

Implementação via Tailwind: `hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`.

---

## Próximos passos

- [x] Operador escolheu Variante 2 (2026-05-15)
- [x] Aplicar tokens via `@theme inline` em `src/app/globals.css` (Sprint 4.0 PR 2)
- [x] Componentes consumem os tokens nas Tarefas 3 (hierarquia perfil) e 4.B (microinterações) — Wave 4

**Sem mudança em componentes nesta fase** — só os tokens. Refactor visual aplicado nas Tarefas seguintes consome esses tokens.

---

## Wave 6 — Acento narrativo `--accent` + utilitários (2026-05-16)

Sprint 6.0 PR 2 introduziu o token `--accent` (roxo) + 3 utilitários CSS,
governados pelo [ADR-024](../architecture/ADR/024-acentos-secundarios-accent-roxo.md).
Coexistem com a paleta semântica Wave 4 — **não substituem** nenhum token.

### Tokens novos

| Token CSS var | Tailwind class | Função | Light (OKLCH) | Dark (OKLCH) |
|---|---|---|---|---|
| `--accent` | `bg-accent` / `text-accent` | Acento narrativo (NÃO estado, NÃO CTA primário) | `0.45 0.18 295` | `0.62 0.22 295` |
| `--accent-foreground` | `text-accent-foreground` | Texto sobre `--accent` | `1 0 0` (branco) | `0.14 0.012 260` (= `--background`) |

Auditoria WCAG: 7 pares novos (3 light + 4 dark), todos passam AA na 1ª
rodada (sem recalibração D10). Output literal em
[`WCAG-AUDIT.md` § Wave 6.0](../architecture/WCAG-AUDIT.md#wave-60---accent-roxo--utilitários-2026-05-16).

### Fronteiras de uso (ADR-024 §3)

**PODE aparecer em:**
- Badge de contexto hero (`DataBadge` com Sparkles + kicker)
- Hover overlay sutil em cards premium (`bg-accent/5` no `:hover`)
- Composição `--gradient-primary` (logo navbar, CTA destacado, overlay)
- Chip narrativo em `StatsGrid` ou selo de feature
- Focus ring de elementos secundários narrativos (não substitui `--ring`)

**NÃO PODE aparecer em:**
- CTAs primários (continua `--brand`)
- Focus ring de input/button primário (continua `--ring` = `--primary`)
- Estados semânticos (`--success`, `--warning`, `--destructive`)
- TrustBadge / pirâmide L1–L4
- Texto longo / corpo de prosa

### Regra mnemônica

> `--brand` é a marca; `--accent` é a inflexão narrativa. Estado tem
> token próprio. Quando em dúvida, escolha `--brand` (default seguro).

### Utilitários CSS novos (em `@layer utilities`)

- `.glass-strong` — backdrop-filter blur(18px), pareado com `.glass` para surfaces sticky mais elevadas (futuro navbar sticky)
- `.bg-hero` — gradient radial composto (primary + accent) com 25%/18% de alpha; consume tokens via `color-mix(in oklch, ...)` para preservar única fonte de verdade
- `.bg-gradient-primary` — gradient linear 135° (`--primary` → `--accent`); logo navbar, CTA premium, hover overlays

Otimizados para dark; light dormente herda automaticamente (valores OKLCH
mudam por tema; as classes utilitárias usam `var(...)` sempre).

### Recalibração ad-hoc (D10, autorizada se necessário)

Se em wave futura algum par fg/bg envolvendo `--accent` reprovar AA
(ex.: novo `--surface-X` brilhante), o Claude Code está autorizado a
recalibrar `L` (lightness) iterativamente até passar, com output
literal `wcag-check.ts` antes/depois no corpo do PR. Sem pausa, sem
pergunta — registro empírico é o gate.

## Padrões de uso em charts (Wave 9 Sprint 9.5 PR5 — fix sintático)

Elaboração do ADR-021 para charts SVG/Recharts. Não introduz tokens
novos; cristaliza o uso correto dos `--chart-*` e tokens semânticos
existentes.

### Sintaxe — CRÍTICO

**Tokens em `globals.css` são OKLCH-completos** (ex: `--chart-1: oklch(0.6 0.13 240)`), não componentes HSL crus.

| Cenário | ❌ ERRADO (produz fill preto) | ✓ CERTO |
|---|---|---|
| Recharts inline `fill` | `fill="hsl(var(--chart-1))"` | `fill="var(--chart-1)"` |
| Recharts `stroke` | `stroke="hsl(var(--chart-3))"` | `stroke="var(--chart-3)"` |
| Tooltip CSS prop | `fill: 'hsl(var(--foreground))'` | `fill: 'var(--foreground)'` |
| Tailwind arbitrary | `bg-[hsl(var(--chart-1))]` | `bg-[var(--chart-1)]` |
| Opacidade transparente | `hsl(var(--accent) / 0.06)` | `color-mix(in oklch, var(--accent) 6%, transparent)` |

**Por que `hsl(var(--X))` quebra:** expande para `hsl(oklch(0.6 0.13 240))` — função aninhada CSS inválida → browser cai em fallback (`#000` para SVG fill, `transparent` para background). Bug histórico em `gastos-chart.tsx` (Wave 7), `apoio-partido-chart.tsx` (Wave 8) e todos os charts da Wave 9 até o fix #304.

### Quando usar `--chart-*` vs tokens semânticos

| Tipo de chart | Token correto | Por quê |
|---|---|---|
| **Ranking de magnitudes** (gastos por categoria, autores por partido, disciplina por bancada) | `--chart-1` único + opacidade decrescente | "Quantos" não tem semântica bom/ruim |
| **Comparativo categórico genuíno** (parlamentar vs mediana da casa) | `--chart-1` (entidade focal) + `--foreground-muted` dashed (referência) | Par Okabe-Ito clássico para bar+line |
| **Decisão semântica** (SIM/NÃO/Abstenção/Ausente em votação) | `--success` / `--destructive` / `--foreground-muted` / `--warning` | SIM é genuinamente "afirmativo", NÃO é "negativo" — semântica real |
| **Tipo/categoria sem semântica polarizada** (em wave futura, se chart-2..5 entrar em uso) | `--chart-2..5` distintos | Okabe-Ito colorblind-safe |

**NÃO usar** em charts: `--primary` (CTA/brand — ADR-021), `--accent` (inflexão narrativa — ADR-024).

### Regra de opacidade decrescente para rankings

Quando o chart mostra ranking de magnitudes (ex: 7 categorias de
gasto ordenadas por R$ decrescente), use **uma cor única** (`--chart-1`)
com **opacidade decrescente por posição**:

```typescript
const RANKING_OPACITY = [1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3] as const

// Cap em 0.3 para o último item; nunca abaixo.
function rankingOpacity(idx: number): number {
  return RANKING_OPACITY[Math.min(idx, RANKING_OPACITY.length - 1)] ?? 0.3
}
```

**Por quê:** reforça hierarquia visual sem virar arco-íris. Manter "uma
cor" preserva a leitura categórica (todos são "categorias de gasto" do
mesmo parlamentar, não competidores de cores diferentes).

**Trade-off WCAG conhecido:** opacidade 0.3 em `--chart-1` light
(`oklch(0.6 0.13 240)`) contra `--background` light (`oklch(0.985 0 0)`)
produz contraste visual `~1.3:1` — **abaixo do WCAG 1.4.11 (3:1)** para
componentes gráficos. Cap maior (0.5+) ainda falha em light theme até
~0.85. Trade-off aceito por 3 motivos:

1. Estado anterior (`hsl(var(--X))` quebrado) era contraste ~1:1
   (preto puro sobre fundo claro — invisível). O fix entrega ≥1.3:1
   no pior caso e ~3.9:1 no melhor — **melhoria significativa mesmo
   abaixo de WCAG no extremo do ranking**.
2. Dark theme funciona melhor (cap 0.3 dá 2.5:1, perto do 3:1).
   Projeto é dark-first; light está dormente.
3. Alternativa "uma cor + lightness ladder via color-mix" perderia a
   regra "uma cor" e adicionaria complexidade ao helper.

**Issue aberta:** reavaliar regra em wave futura se light theme deixar
de ser dormente (ex.: toggler theme público), considerando:
- `color-mix(in oklch, var(--chart-1), var(--foreground) X%)` para
  ladder de lightness em vez de opacity
- Cap mais alto (0.6+) com `--chart-1` calibrado mais escuro em light

### Charts atuais — mapeamento

| Chart | Tokens | Padrão |
|---|---|---|
| `GastosChart` bar (parlamentar) | `--chart-1` | Ranking de magnitudes (7 categorias) + opacidade decrescente |
| `GastosChart` line (parlamentar) | `--chart-1` + `--chart-3` dashed | Comparativo categórico (parlamentar vs mediana casa) |
| `ApoioPartidoChart` (proposicao) | `--chart-1` | Ranking de magnitudes (6 partidos + "Outros") + opacidade decrescente |
| `VotosConsolidadosChart` (proposicao + votação) | `--success`/`--destructive`/`--warning`/`--foreground-muted` | Decisão semântica (Donut SIM/NÃO/Abst/Aus) |
| `VotacaoPorPartidoChart` | tokens semânticos | Decisão semântica (segmentos empilhados) |
| `VotacaoHemicicloChart` | tokens semânticos | Decisão semântica (pontos por tipo de voto) |
| `MargemDecisaoBar` | `--success`/`--destructive`/`--surface-elevated` | Decisão semântica (barra bilateral) |
| `DisciplinaPartidariaChart` | `--chart-1` | Ranking de disciplina + opacidade decrescente. NÃO usa `--success` (P2: % disciplina não é "bom") |
