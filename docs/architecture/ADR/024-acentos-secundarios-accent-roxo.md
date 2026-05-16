# ADR-024: Acentos secundários — token `--accent` (roxo) e fronteiras de uso

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-16
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Valores OKLCH propostos](#valores-oklch-propostos)
- [Fronteiras de uso](#fronteiras-de-uso)
- [Validação WCAG](#validação-wcag)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 4 (`v0.4-final-public`) estabeleceu uma paleta semântica OKLCH
suficiente para a fase pública do produto: `--background`, `--surface`,
`--foreground` (3 níveis), `--brand`, `--success`, `--warning`,
`--destructive`, `--ring`. Cada par texto-sobre-fundo foi auditado em
`WCAG-AUDIT.md` e passa WCAG 2.1 AA empiricamente via `.local/wcag-check.ts`.

A Wave 6 (reskin diagnóstico-dirigido,
[prompt mestre §2.1](../../product/PROMPT-MESTRE-WAVE-6.md)) introduz um padrão
visual recorrente no protótipo do designer (`usernamette/vera-politica`):
um **badge de contexto** com ícone `Sparkles` + kicker textual logo acima do
H1 dos heros, e pequenos selos narrativos espalhados em cards (badge
"Compromisso", chip de feature, accent em gradient overlay). Esse padrão
consome um token que o designer chamou de `--accent`, valor `oklch(0.62 0.22 295)`
(roxo), tanto isolado quanto compondo o `--gradient-primary`
(`linear-gradient(135deg, --primary, --accent)`).

Hoje nossa paleta não tem essa alavanca. Forçar `--brand` (azul) cobre 80%
dos casos mas perde a hierarquia narrativa que o designer estabelece — todo
elemento narrativo vira igual em peso visual. Forçar um dos `--chart-*` viola
semântica (chart é dataviz, não UI semântica). Forçar `--warning` ou
`--success` cria falsa carga de estado em algo que não é estado.

Este ADR registra a entrada do token `--accent` na paleta dark da Wave 6 com
fronteiras de uso explícitas para evitar o pior cenário: cidadão lendo o
roxo como sinal semântico ("isso é importante?" "isso é alerta?") quando na
verdade é só **gravidade narrativa**.

## Decisão

### 1. Adicionar `--accent` e `--accent-foreground` em `globals.css`

Tokens novos na paleta semântica dark (light dormente — registrar par light
também para coerência quando toggle voltar; não consumir hoje):

```css
.dark {
  /* ... tokens existentes ... */
  --accent: oklch(0.62 0.22 295);            /* roxo */
  --accent-foreground: oklch(0.14 0.012 260); /* = --background, padrão
                                                  shadcn de texto escuro
                                                  sobre cor bright */
}
```

Light dormente:

```css
:root {
  --accent: oklch(0.45 0.18 295);    /* roxo escurecido pra contraste sobre branco */
  --accent-foreground: oklch(1 0 0); /* branco */
}
```

Mapeamento Tailwind v4 via `@theme inline`:

```css
@theme inline {
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
}
```

Consumível como `bg-accent`, `text-accent`, `text-accent-foreground`,
`border-accent`, `ring-accent`, etc.

### 2. Adicionar `--gradient-primary` como utilitário CSS

```css
@layer utilities {
  .bg-gradient-primary {
    background-image: linear-gradient(135deg, var(--primary), var(--accent));
  }
}
```

Consumível como `className="bg-gradient-primary"`. Usado em logo do navbar
(quadradinho com ícone), CTA principal opcional, hover overlay em cards
premium. Não substitui `bg-brand`/`bg-primary` em CTAs padrão — é alavanca
narrativa, opt-in.

### 3. Adicionar `.bg-hero` como utilitário CSS

Gradient radial composto que dá ao hero de cada rota a "gravidade visual"
estabelecida no protótipo:

```css
@layer utilities {
  .bg-hero {
    background-image:
      radial-gradient(ellipse 80% 50% at 50% 0%,
        oklch(from var(--primary) l c h / 0.25),
        transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 100%,
        oklch(from var(--accent) l c h / 0.18),
        transparent 70%);
  }
}
```

Consumível em `<section className="bg-hero grid-bg">`. Combinado com a
classe `grid-bg` já existente (`globals.css:204-214`), produz o efeito de
profundidade do designer sem bitmap ou JS.

### 4. Adicionar `.glass-strong` como utilitário CSS

Variante do `.glass` existente (`globals.css:194-202`) com blur dobrado
para surfaces sticky elevadas (futuro navbar sticky + backdrop):

```css
@layer utilities {
  .glass-strong {
    background: linear-gradient(
      180deg,
      oklch(1 0 0 / 0.06),
      oklch(1 0 0 / 0.02)
    );
    backdrop-filter: blur(18px);
    border: 1px solid oklch(1 0 0 / 0.08);
  }
}
```

### 5. Sem `--info` (token rejeitado)

O designer mapeia `--info` (azul) como token separado. Para nós, **`--brand`
já é azul** (`oklch(0.65 0.19 260)` no dark) e cobre a mesma função
narrativa. Adicionar `--info` criaria ambiguidade (qual azul pra qual caso?).
Token rejeitado nesta decisão.

## Valores OKLCH propostos

| Token | Dark | Light dormente | Função |
|---|---|---|---|
| `--accent` | `oklch(0.62 0.22 295)` | `oklch(0.45 0.18 295)` | Acento narrativo roxo |
| `--accent-foreground` | `oklch(0.14 0.012 260)` | `oklch(1 0 0)` | Texto sobre `--accent` |

Estratégia de foreground escolhida pelo mesmo padrão de `--primary` no dark
(texto escuro sobre cor bright, ratio ~6 com a paleta atual).

## Fronteiras de uso

### Onde `--accent` PODE aparecer

- Badge de contexto hero (`<DataBadge variant="context">` com ícone Sparkles
  + kicker textual) — uso primário (designer's HeroSection pattern)
- Hover overlay sutil em cards premium (`bg-accent/5` no `:hover`)
- Composição `--gradient-primary` (`bg-gradient-primary`) — logo navbar,
  CTA destacado, overlay
- Chip narrativo no `<StatsGrid>` ou em pequenos selos de feature ("Wave 6"
  banner, "Sprint X" pin) — uso secundário
- Focus ring de elementos NÃO-semânticos secundários (não substitui `--ring`)

### Onde `--accent` NÃO PODE aparecer

- **CTAs primários** — continua `--brand` (botão "Encontrar meus
  representantes", "Filtrar", etc.). Mudança de CTA primário muda
  identidade institucional — fora do escopo Wave 6
- **Focus ring de input/button primário** — continua `--ring` (= `--primary`)
- **Estados semânticos** — `--success`, `--warning`, `--destructive` cobrem
  estado; `--accent` cobre narrativa. Mistura confunde
- **TrustBadge / pirâmide L1-L4** — continua paleta semântica existente,
  sem `--accent`
- **Texto longo / corpo de prosa** — leitura confortável exige
  `--foreground`/`--foreground-muted`, não acento

### Regra mnemônica

> `--brand` é a marca; `--accent` é a inflexão narrativa. Estado tem token
> próprio. Quando em dúvida, escolha `--brand` (default seguro).

## Validação WCAG

Pares novos a validar via `.local/wcag-check.ts` antes do PR 2 da Sprint 6.0
(introdução do token em `globals.css`):

| Par | Direção | Ratio esperado | Kind | Critério |
|---|---|---|---|---|
| `--accent` / `--background` (link em hero) | texto roxo sobre fundo | ≥ 4.5 (body) | body | AA |
| `--accent-foreground` / `--accent` (badge) | texto sobre bg roxo | ≥ 4.5 (body) | body | AA |
| `--accent` / `--surface` (chip em card) | texto roxo sobre card | ≥ 4.5 (body) | body | AA |
| `--accent` / `--surface-elevated` (chip em CTA card) | texto roxo sobre CTA | ≥ 4.5 (body) | body | AA |

### Recalibração ad-hoc autorizada (D10 do prompt mestre)

Se qualquer ratio reprovar AA na rodada inicial com `oklch(0.62 0.22 295)`,
Claude Code recalibra o `L` (lightness) iterativamente — geralmente subindo
para 0.65, 0.68, 0.70 — até o pior par passar. Registra:

- Output literal `wcag-check.ts` rodada inicial (com FAIL)
- Tentativas intermediárias (L=0.65 etc) com ratio resultante
- Valor final adotado e output `wcag-check.ts` (com PASS)

Tudo no corpo do PR 2 da Sprint 6.0. Sem pausa, sem pergunta — é parte do
contrato.

Se mesmo após 3 recalibrações o pior par não passar AA, **pausar** e
escalar para owner: pode ser que o hue 295 (roxo puro) seja incompatível
com a meta de contraste sobre `--surface` específico, exigindo aproximar do
`--chart-4` atual (`oklch(0.62 0.22 295)` — mesmo valor, coincidência de uso
dataviz). Esse caso vira issue específica.

## Alternativas Consideradas

### A. Não adicionar `--accent` — usar `--brand` para tudo

- **Prós**: simplicidade, menos token pra manter, sem risco WCAG novo
- **Contras**: HeroSection do designer perde a gravidade narrativa
  estabelecida (kicker + Sparkles indistinguível do botão); cidadão
  perde affordance "isto é contexto, não call to action"
- **Veredicto**: descartado por perda da hierarquia visual já validada
  pelo designer parceiro em iteração com público real

### B. Usar `--chart-4` (que já é roxo `oklch(0.62 0.22 295)`)

- **Prós**: reaproveita token existente, zero adição
- **Contras**: viola semântica (`chart-*` é paleta dataviz, não UI
  semântica); confunde Recharts/visualização futura (Sprint 6.7+) com UI
  narrativa
- **Veredicto**: descartado por colisão semântica. Chart-* fica reservado
  pra dataviz

### C. Adicionar `--info` (azul) em vez de `--accent` (roxo)

- **Prós**: cobre função narrativa similar; mais convencional
- **Contras**: redundante com `--brand` (também azul); designer
  intencionalmente escolheu roxo para diferenciação cromática do azul
  institucional brasileiro; criaria 2 azuis na mesma página com função
  ambígua
- **Veredicto**: descartado por redundância. Token rejeitado neste ADR
  (decisão §5)

### D. Roxo escolhido (matching designer)

- **Prós**: cobre lacuna narrativa sem colisão semântica; diferenciação
  cromática clara (azul = marca, roxo = inflexão narrativa, semânticas
  têm tons quentes)
- **Contras**: mais um par WCAG a validar e manter no audit; risco de
  cidadão ler roxo como semântico (mitigação: fronteiras de uso §3)
- **Veredicto**: **adotado**

## Consequências

### Positivas

- **HeroSection ganha kicker distinto** — gravidade narrativa restaurada
  sem comprometer hierarquia CTA
- **`--gradient-primary` viabilizado** — logo navbar, CTA premium, overlay
  ficam coerentes com o protótipo
- **`bg-hero` e `glass-strong`** entram como utilitários CSS — sem JS, sem
  inflação de bundle
- **Light dormente coerente** — par light registrado pra quando toggle voltar
- **Fronteiras explícitas** — reduzem risco de cidadão ler roxo como sinal
  semântico

### Negativas

- **+2 pares WCAG no audit** — manutenção marginal; recalibração ad-hoc
  cobre risco WCAG inicial
- **Risco de uso indevido em sprints posteriores** — Wave 6.1-6.5 podem
  tentar usar `--accent` em CTA "porque é bonito". Mitigação: revisão por
  `frontend-skin-helper` subagent (Sprint 6.0 PR 8) que conhece as
  fronteiras
- **Tom roxo específico** pode envelhecer mal — escolha visual subjetiva
  do designer. Mitigação: troca de valor é mudança 1-linha em
  `globals.css` sem refactor de consumers (todos usam `bg-accent` etc, não
  `oklch(...)` inline)

### Neutras

- **Institucional HEX paleta inalterada** — `--color-primary-50..950`
  permanece intocado; este ADR só toca a paleta semântica OKLCH
- **`--chart-4` continua válido pra Recharts futuro** — mesmo valor OKLCH,
  contextos diferentes, sem conflito enquanto a fronteira de uso for
  respeitada

## Referências

- [`docs/product/PROMPT-MESTRE-WAVE-6.md`](../../product/PROMPT-MESTRE-WAVE-6.md) §2.1 —
  inventário de tokens que designer tem e nós não
- [ADR-021 — Design system shadcn curado](021-design-system-shadcn-curado.md)
- [ADR-023 — Critérios para animação e revealing](023-criterios-de-animacao-e-revealing.md)
- [`docs/design/DESIGN-TOKENS.md`](../../design/DESIGN-TOKENS.md) — paleta
  semântica atual (será atualizado no PR 2 da Sprint 6.0)
- [`docs/architecture/WCAG-AUDIT.md`](../WCAG-AUDIT.md) — auditoria atual;
  será estendida com pares `--accent` no PR 2
- [`src/app/globals.css`](../../../src/app/globals.css) — tokens dark
  atuais; `--accent`/`--accent-foreground` entram no PR 2
- [`.local/wcag-check.ts`](../../../.local/wcag-check.ts) — re-runner WCAG
  empírico (dev-only, culori)
