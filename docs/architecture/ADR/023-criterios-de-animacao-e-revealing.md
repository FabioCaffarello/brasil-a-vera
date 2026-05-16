# ADR-023: Critérios para introdução de animação e revealing na Wave 6

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-16
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Critérios concorrentes para promover uma lib de animação](#critérios-concorrentes-para-promover-uma-lib-de-animação)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 6 (`docs/wave-6/PROMPT-MESTRE.md`) inicia o reskin diagnóstico-dirigido
do produto, portando a linguagem visual madura do protótipo do designer parceiro
(`usernamette/vera-politica`) para a nossa stack RSC + tokens próprios.

O protótipo usa `framer-motion` liberalmente em revealing/fade/reveal-on-scroll
trivial: `<motion.div initial={{opacity:0}} animate={{opacity:1}} transition=...>`
salpicado em todas as páginas. Em RSC isso quebra duplamente:

1. `framer-motion` força o componente a virar client (`'use client'`) por causa
   do `useState`/`useEffect` interno — perdemos zero-JS no path anônimo
2. Bundle ~50 kB gzip soma a todo path que renderizar uma animação trivial

A maior parte dos casos de reveal hoje (mount, scroll-into-view) é coberto por
CSS nativo:

- **`@starting-style`** (Chromium 117+ / Safari 17.5+ / Firefox 129+, caniuse
  ~92% em 2026-05) — anima propriedades do `:first-paint` para o estado final
  sem JS
- **`@keyframes` + `animation`** — entry animations clássicas, respeita
  `prefers-reduced-motion` automaticamente (já temos override em
  `globals.css:240`)
- **CSS `transition`** com state changes via `data-*` attribute (radix patterns)
- **View Transitions API** (`startViewTransition`) — route transitions e
  layout swaps com fallback gracioso (Chromium 111+ / Safari 18+)

Ainda assim, existem cenários onde CSS não chega: drag gesture, layout
animation com FLIP em rotas dinâmicas, parallax controlado por scroll
contínuo, complex sequenced choreography. Para esses, uma library JS é
inevitável — mas exige decisão informada por evidência empírica, não por
preferência ou por "o designer usou".

Este ADR é o gate: define **quando** (não se) uma library de animação pode
entrar. Modelo de critério, não de decisão fechada (D9 do prompt mestre Wave 6).
ADR-019 aplica-se em espírito; este ADR opera no eixo "biblioteca de UI" do
ADR-021 §Princípio 14, mas com critério mais rígido por causa do custo
combinado bundle + hydration + a11y.

## Decisão

### 1. Default da Wave 6: CSS animation + `@starting-style` + View Transitions

Toda animação introduzida durante a Wave 6 (Sprints 6.0–6.6) DEVE ser
implementada em CSS puro, salvo se atender os três critérios concorrentes
abaixo. Default explícito:

- **Mount/unmount reveal**: `@starting-style` + `transition` ou `@keyframes`
  + `animation`
- **Scroll-into-view reveal**: CSS `animation` com `animation-timeline:
  view()` (Chromium 115+) ou `IntersectionObserver` em client component
  pequeno (< 1 kB) ativando classe CSS
- **Hover/focus state**: `transition` em `:hover`/`:focus-visible`
- **Route transition**: View Transitions API com `view-transition-name`
- **Modal/popover overlay**: `data-state` attribute pattern (já em uso pelo
  Radix nas primitivas existentes; ver `src/design-system/primitives/dialog.tsx`)

Todas essas opções respeitam `@media (prefers-reduced-motion)` automaticamente
através do override global em `globals.css:240-253`, sem código adicional por
animação.

### 2. Libs JS de animação bloqueadas por default

`framer-motion`, `motion` (motion.dev), `react-spring`, `auto-animate`,
`gsap`, `lottie-react` e similares **NÃO entram** durante a Wave 6 a não ser
que um PR específico:

1. Apresente o caso de uso concreto que CSS + `@starting-style` + View
   Transitions provadamente não cobre
2. Anexe benchmark empírico (output literal de `npm run build` antes/depois +
   medição de FPS/jank em DevTools Performance) demonstrando o gap
3. Inclua ADR específico (não este — um número subsequente) registrando
   bundle delta gzip, peer deps, alternativa rejeitada, plano de saída

Sem os três simultaneamente, o PR é fechado com link para este ADR.

### 3. Princípio 13 aplicado a animação

Hipótese teórica sobre "designer quer animação X" não conta. O eixo de
decisão é evidência empírica do gap entre CSS e JS, validado pelo PR
proponente. ADRs anteriores (017, 018, 019) cristalizaram o mesmo princípio
para outros eixos (banco, cache, infraestrutura); este ADR só aplica ao eixo
"animação no frontend".

## Critérios concorrentes para promover uma lib de animação

| # | Critério | Como provar no PR |
|---|---|---|
| 1 | Caso de uso CSS-irresolúvel | Spike branch em CSS puro com 3 tentativas honestas registradas no PR — falham todas |
| 2 | Bundle delta proporcional | `npm run build` antes/depois mostrando o ganho de UX justifica o custo de KB |
| 3 | ADR dedicado | Número subsequente, com formato ADR padrão (`000-adr-template.md`), referenciando este como critério atendido |

Casos típicos onde os 3 critérios PODEM concorrer:

- Drag-to-reorder lists (não temos hoje; futuro `/minha-area`)
- FLIP animation cross-route (não trivial em Next App Router)
- Choreography sequenced (>3 elementos com timing dependente)
- Parallax controlado por scroll contínuo (não scroll-into-view de uma vez)

Casos onde os 3 critérios EXPLICITAMENTE não concorrem (rejeitar de pronto):

- Fade-in on mount
- Slide-in on scroll-into-view
- Hover lift card
- Reveal on accordion expand (Radix Tabs / dialog já cobre via `data-state`)
- Logo subtle pulse
- Underline animation em link
- Stagger sequence linear (CSS `animation-delay` resolve)

## Alternativas Consideradas

### A. Framer-motion como default (escolha do protótipo designer)

- **Prós**: ecossistema enorme, API ergonômica, designer já conhece
- **Contras**: ~50 kB gzip por path que renderiza qualquer animação trivial;
  força `'use client'` em ilhas que poderiam permanecer RSC; quebra zero-JS
  anônimo (lição PR #57 / #149 — incidentes documentados); 95% dos casos de
  uso do protótipo cabem em CSS
- **Veredicto**: descartado como default. Pode entrar via critério concorrente
  se um PR provar gap

### B. Motion (motion.dev, "framer-motion successor")

- **Prós**: ~4 kB gzip se importar `animate()` standalone, API similar
- **Contras**: ainda em consolidação como sucessor; mesma fricção RSC do
  framer-motion (precisa client component); custo de adoção sem ganho
  proporcional sobre CSS para os casos comuns
- **Veredicto**: descartado por default; reabrir se um PR provar gap E
  `framer-motion` for considerado primeiro (motion é otimização do mesmo
  paradigma, não solução diferente)

### C. React-spring

- **Prós**: physics-based, animação fluida em gestures
- **Contras**: ~25 kB gzip, paradigma diferente (springs vs tweens) que
  exige rewrite mental, sem ganho para os casos comuns
- **Veredicto**: descartado por default; específico a casos de física

### D. CSS-only com keyframes (estado atual)

- **Prós**: zero JS, zero bundle, respeita reduced-motion sem código extra,
  funciona em RSC sem fricção
- **Contras**: limitado a mount/unmount/state-change; sem control granular
  de progress; sem FLIP layout animation
- **Veredicto**: **escolhido como default** da Wave 6, com `@starting-style`
  cobrindo o gap mais doloroso do CSS clássico (revealing on mount)

### E. View Transitions API

- **Prós**: API web nativa para route/layout transitions com fallback
  gracioso; integra com Next App Router (experimental no canary,
  caminhando para estável)
- **Contras**: cross-browser desigual (Safari 18+); ainda exploratório em
  Next 16
- **Veredicto**: **complementar ao CSS-only** quando aplicável (route
  transitions, layout swaps); não default mas estimulado quando o caso
  combina

## Consequências

### Positivas

- **Bundle Wave 6 mantém Wave 5 baseline** — composições novas não inflacionam
  path anônimo
- **Zero-JS anônimo preservado** — animações em CSS não forçam `'use client'`
- **Reduced-motion automático** — override global em `globals.css` cobre toda
  animação CSS sem código por animação
- **Reabertura controlada** — critério ADR-de-critério (não decisão fechada)
  permite que evidência empírica futura promova uma lib sem reescrever este ADR
- **Princípio 14 aplicado** — UI lib segue critério leve quando provada útil,
  pesado quando não

### Negativas

- **Cenários gesture/drag** (futuro `/minha-area` ou interações complexas) vão
  exigir custom JS ou aceitar limitação até critério ser atendido
- **Curva de aprendizado `@starting-style`** — recente, menos referência online
  que framer-motion. Mitigação: registrar padrões aplicados em
  `src/design-system/compositions/` com comentários minimais

### Neutras

- **Protótipo designer permanece referência visual** — animação dele não vira
  código direto, mas o que ele anima informa quais cenários a Wave 6 precisa
  reproduzir em CSS
- **ADR-019** (sem gargalo empírico) e este ADR vivem em camadas diferentes:
  ADR-019 governa infraestrutura (banco, broker, runtime); este governa
  dependency-class de animação no frontend. Não duplicam — complementam

## Referências

- [`docs/wave-6/PROMPT-MESTRE.md`](../../wave-6/PROMPT-MESTRE.md) §1, §5, §6 —
  prompt mestre Wave 6
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-021 — Design system shadcn curado](021-design-system-shadcn-curado.md) §Princípio 14
- [ADR-024 — Acentos secundários (`--accent` roxo)](024-acentos-secundarios-accent-roxo.md)
- [MDN — `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)
- [MDN — View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Caniuse — `@starting-style`](https://caniuse.com/mdn-css_at-rules_starting-style)
- [`globals.css:240-253`](../../../src/app/globals.css) — override
  `prefers-reduced-motion`
