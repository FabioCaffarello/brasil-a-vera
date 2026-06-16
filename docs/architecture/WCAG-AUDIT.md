# Auditoria WCAG 2.1 AA — Brasil a Vera

**Data:** 2026-05-15 (atualizado na Sprint 4.0 PR 2 — paleta dark OKLCH)
**Data original:** 2026-05-11
**Escopo:** Todas as rotas públicas da Wave 1 (`/`, `/parlamentares`,
`/parlamentares/[id]`, `/proposicoes`, `/proposicoes/[tipo]/[numero]/[ano]`,
`/votacoes`, `/votacoes/[id]`, `/busca`) + tokens semânticos do
design system introduzidos na Sprint 4.0.
**Critério:** WCAG 2.1 nível AA.

## Filosofia

Brasil a Vera é uma plataforma de transparência política para
*qualquer* cidadão brasileiro. Acessibilidade não é polish — é
requisito. Um leitor de tela, um navegador antigo, uma conexão 3G ou
um motor de busca devem conseguir extrair todo o conteúdo. A interface
existe pra mostrar fatos, não pra impressionar designers.

## Método

Auditoria mista:

1. **Revisão de código estática** — leitura de cada componente em
   `src/components/` e cada page em `src/app/` contra um checklist
   WCAG (landmarks, headings, labels, contraste, foco, alt).
2. **Validação no navegador** — smoke test no dev com leitor de tela
   nativo do macOS (VoiceOver) e navegação só pelo teclado.
3. **Tooling:** Biome a11y rules ativo em CI (regra `recommended`,
   incluindo `useAltText`, `useLandmarks`, `useValidAriaProps`, etc.).

## Resultado

**Zero blockers identificados.** Padrões aplicados consistentemente
ao longo da Wave 1:

- `<html lang="pt-BR">` correto na raiz.
- Um único `<h1>` por página, hierarquia `h2 > h3` em seções.
- Landmarks HTML5: `<header>`, `<nav aria-label="Principal">`,
  `<main id="conteudo">`, `<footer>`, `<section>`, `<search>`.
- Todo `<input>`/`<select>` tem `<label>` associado (explícito via
  `htmlFor` na busca, implícito por wrapper nos filtros).
- Todo `<img>` tem `alt`: descritivo na foto principal do perfil,
  vazio (decorativo) em avatares de listagem onde o nome adjacente
  já é o nome acessível.
- `<button>` para ações, `<a>` para navegação — nenhum
  `<div onClick>`.
- `focus:outline-none focus:ring-2 focus:ring-zinc-400` aplicado
  consistentemente — nunca remove o foco sem substituir.
- Decorativos (`·`, números de ordenação) marcados com
  `aria-hidden="true"`.
- Tabela de votos por partido usa `<thead>`/`<th>` corretamente.
- Listas de dados-chave do parlamentar em `<dl>`/`<dt>`/`<dd>`.

## Correções aplicadas nesta PR

| Item | WCAG | Fix |
|------|------|-----|
| Skip link ausente | 2.4.1 (Bypass Blocks, A) | `<a href="#conteudo">` no topo do `<body>`, visível só no foco. `<main id="conteudo">`. |
| Sem suporte a `prefers-reduced-motion` | 2.3.3 (Animation from Interactions, AAA — boa prática para AA) | `@media (prefers-reduced-motion: reduce)` em `globals.css` zera `animation-duration` e `transition-duration`. |
| Fotos sem `width`/`height` → CLS | 1.4.10 (Reflow, AA) indireto via UX | `width`/`height` adicionados em `perfil-header`, `parlamentar-card`, `afinidade-voto`. |
| Placeholders de foto sem `aria-hidden` | 1.1.1 (Non-text Content, A) — purista | `aria-hidden="true"` nos `<div>` placeholder para o leitor de tela não anunciar o vazio. |

## Contraste — pares Tailwind verificados

Valores calculados sobre tokens default do Tailwind 4. Limite WCAG AA:
4.5:1 para texto normal, 3:1 para texto grande (≥18pt regular ou
14pt bold) e UI.

| Par | Contexto | Ratio | Status |
|-----|----------|-------|--------|
| `text-zinc-900` (#18181b) sobre `bg-white` (#fff) | corpo claro | 18.7:1 | AAA |
| `text-zinc-700` (#3f3f46) sobre `bg-white` | secundário claro | 10.3:1 | AAA |
| `text-zinc-500` (#71717a) sobre `bg-white` | metadado claro | 4.83:1 | AA |
| `text-zinc-100` (#f4f4f5) sobre `bg-zinc-950` (#09090b) | corpo escuro | 17.9:1 | AAA |
| `text-zinc-300` (#d4d4d8) sobre `bg-zinc-900` (#18181b) | secundário escuro | 11.6:1 | AAA |
| `text-zinc-400` (#a1a1aa) sobre `bg-zinc-900` | metadado escuro | 6.4:1 | AA |
| `text-emerald-800` (#065f46) sobre `bg-emerald-100` (#d1fae5) | badge SIM | 7.1:1 | AAA |
| `text-rose-800` (#9f1239) sobre `bg-rose-100` (#ffe4e6) | badge NÃO | 7.5:1 | AAA |
| `text-amber-800` (#92400e) sobre `bg-amber-100` (#fef3c7) | badge Abstenção | 7.5:1 | AAA |
| `text-violet-800` (#5b21b6) sobre `bg-violet-100` (#ede9fe) | badge Obstrução | 9.1:1 | AAA |

## Performance — relação direta com acessibilidade

A11y não é só leitor de tela — é também usuários em redes ruins. A
Wave 1 entrega isso "de graça" porque a arquitetura já é a mais leve
possível:

- **Zero `'use client'`** no projeto inteiro — toda página é Server
  Component. O bundle JS enviado para o navegador é só o runtime
  React mínimo para hidratação de Links (sem state, sem handlers).
- **Sem dependências de UI pesadas** — sem Radix, sem MUI, sem
  styled-components.
- **Filtros via `<form action method="get">`** — URL é estado. Sem
  JavaScript necessário.
- **Fontes Geist via `next/font/google`** — auto-host + `font-display: swap`.
- **Imagens com dimensões explícitas** — sem layout shift.

## Lacunas conhecidas (não bloqueantes)

- **Imagens externas sem otimização**: fotos de parlamentares vêm
  diretamente de `camara.leg.br` / `senado.leg.br`. Não passam por
  `next/image`. Tradeoff aceito: configurar `remotePatterns` no Next
  + suportar variação de dimensão das fontes oficiais é trabalho
  desproporcional ao ganho atual de KB. Reavaliar se foto virar LCP
  no perfil (Lighthouse mostrará).
- **Sem Lighthouse CI** ainda. Critério "LCP < 2.5s 3G" do roadmap
  Wave 1 é validado manualmente. Automatizar fica para Wave 2 (ADR
  futuro: GitHub Actions com `@lhci/cli`).
- **VoiceOver não foi exaustivamente testado** em todas as rotas com
  filtros aplicados. A estrutura semântica está correta; um pass
  formal por usuário com leitor de tela é trabalho futuro.

## Como contribuir

Se você usa leitor de tela, navegação por teclado ou tem qualquer
fricção com a interface, abra issue em
[brasil-a-vera/issues](https://github.com/FabioCaffarello/brasil-a-vera/issues)
com o tag `a11y`. A11y bugs têm prioridade sobre features.

---

## Wave 4.0 — Paleta dark OKLCH (2026-05-15)

A Sprint 4.0 PR 2 introduziu tokens semânticos OKLCH em `src/app/globals.css`
para o design system (`src/design-system/`). Esta seção registra os pares
texto/fundo validados.

### Método

Gate versionado `scripts/wcag-check.ts` (`npm run wcag:check`, dev-time only,
**não vai pro bundle**) — desde a issue #362 é **gate de CI** (job
"Contrast / WCAG", roda em todo PR). Usa a lib `culori` (devDep) pra:

1. **Parsear os tokens reais de `src/app/globals.css`** (blocos `:root` light +
   `.dark` + a escala navy do `@theme inline`, resolvendo `var(--color-primary-*)`)
   — sem valores hardcoded, então **não pode driftar** (causa raiz do incidente
   #361, onde a versão antiga `.local/wcag-check.ts` validava cores velhas).
2. Calcular relative luminance (WCAG fórmula) e o ratio de cada par fg/bg.
3. Marcar AA/AAA pass/fail por kind (body ≥ 4.5, ui/large ≥ 3.0). **Falha AA ou
   token ausente → exit 1** (CI vermelho); AAA é advisory.

> Histórico: até a #362 o check era `.local/wcag-check.ts` — gitignored, fora do
> CI e com tokens hardcoded. Foi substituído pelo gate versionado acima.

Output literal abaixo (rodado em 2026-05-15 após calibragem):

### Light theme (institucional, dormente em 4.0)

| Par | fg → bg | Ratio | Kind | Status |
|---|---|---:|---|---|
| foreground / background | `#161719` → `#fafafa` | 17.16 | body | AAA ✅ |
| foreground / surface | `#161719` → `#ffffff` | 17.91 | body | AAA ✅ |
| foreground-muted / background | `#3e4042` → `#fafafa` | 9.99 | body | AAA ✅ |
| foreground-muted / surface | `#3e4042` → `#ffffff` | 10.43 | body | AAA ✅ |
| foreground-subtle / background | `#707274` → `#fafafa` | 4.65 | body | AA ✅ |
| foreground-subtle / surface | `#707274` → `#ffffff` | 4.85 | body | AA ✅ |
| primary-foreground / primary (button) | `#ffffff` → `#173550` | 12.64 | body | AAA ✅ |
| primary / background (link) | `#173550` → `#fafafa` | 12.11 | body | AAA ✅ |
| primary / surface (link em card) | `#173550` → `#ffffff` | 12.64 | body | AAA ✅ |
| success-foreground / success (badge) | `#ffffff` → `#137738` | 5.65 | body | AA ✅ |
| warning-foreground / warning (badge) | `#ffffff` → `#b25400` | 5.11 | body | AA ✅ |
| destructive-foreground / destructive (badge) | `#ffffff` → `#b32322` | 6.59 | body | AA ✅ |
| ring / background (focus ring UI) | `#22405b` → `#fafafa` | 10.36 | ui | AAA ✅ |
| border / background (divisor decorativo) | `#dbdee1` → `#fafafa` | 1.29 | decorative | N/A |
| border-strong / background (divisor decorativo) | `#c5c8ca` → `#fafafa` | 1.62 | decorative | N/A |

### Dark theme (Wave 4 padrão)

| Par | fg → bg | Ratio | Kind | Status |
|---|---|---:|---|---|
| foreground / background | `#f3f5f8` → `#07090e` | 18.26 | body | AAA ✅ |
| foreground / surface | `#f3f5f8` → `#0c1016` | 17.54 | body | AAA ✅ |
| foreground / surface-elevated | `#f3f5f8` → `#12161d` | 16.61 | body | AAA ✅ |
| foreground-muted / background | `#9ea5b0` → `#07090e` | 8.03 | body | AAA ✅ |
| foreground-muted / surface | `#9ea5b0` → `#0c1016` | 7.71 | body | AAA ✅ |
| foreground-subtle / background | `#848992` → `#07090e` | 5.69 | body | AA ✅ |
| foreground-subtle / surface | `#848992` → `#0c1016` | 5.47 | body | AA ✅ |
| primary-foreground / primary (button) | `#07090e` → `#438aff` | 6.03 | body | AA ✅ |
| primary / background (link) | `#438aff` → `#07090e` | 6.03 | body | AA ✅ |
| primary / surface (link em card) | `#438aff` → `#0c1016` | 5.79 | body | AA ✅ |
| success-foreground / success (badge) | `#060606` → `#32c364` | 8.79 | body | AAA ✅ |
| warning-foreground / warning (badge) | `#0b0b0b` → `#f2a618` | 9.60 | body | AAA ✅ |
| destructive-foreground / destructive (badge) | `#fcfcfc` → `#cc2827` | 5.22 | body | AA ✅ |
| ring / background (focus ring UI) | `#438aff` → `#07090e` | 6.03 | ui | AAA ✅ |
| border / background (divisor decorativo) | `#2a2e35` → `#07090e` | 1.46 | decorative | N/A |
| border-strong / background (divisor decorativo) | `#43484f` → `#07090e` | 2.16 | decorative | N/A |

**✅ Todos os pares funcionais passam WCAG AA.**

### Sobre `border` / `border-strong` decorativos

WCAG 1.4.11 (Non-text Contrast, AA, ≥ 3:1) aplica-se a **UI components** —
boundaries que indicam o limite de um componente interativo (input outline,
button outline, focus ring). Borders **decorativos** (divisores entre seções,
linhas entre cards) **não estão no escopo** desse critério.

Nossos tokens `--border` e `--border-strong` são decorativos. Quando uma
primitiva de input ou button precisar de outline próprio para indicar
state, ela usará `--ring` (que passa 6.03 dark, 10.36 light) ou um token
dedicado como `--border-input` a ser introduzido com a primitiva `input`
no PR 6 da Sprint 4.0.

### OKLCH browser support

OKLCH em CSS é nativo nos seguintes navegadores:

- Chromium 111+ (Mar/2023)
- Safari 16.4+ (Mar/2023)
- Firefox 113+ (Mai/2023)

Caniuse global > 95% em 2026-05. **Sem fallback HEX até demanda observada**
(princípio ADR-019 / 14): se cidadão real reportar regressão de
renderização em browser antigo, abrir issue com evidência e adicionar
`@supports (color: oklch(0 0 0))` com fallback no `globals.css`.

### Como re-rodar a auditoria

```bash
# Gate versionado — também roda no CI (job "Contrast / WCAG") em todo PR.
# culori já está em devDependencies desde a Sprint 4.0 PR 2.
npm run wcag:check
```

Output retorna exit code 0 se todos os pares passam AA; exit code 1
listando os pares falhando (ou tokens ausentes). Como roda no CI, uma
regressão AA é barrada no PR automaticamente — não precisa lembrar de rodar.
Ao introduzir token novo, adicione o par correspondente em
`scripts/wcag-check.ts` (`PAIRS`).

---

## Wave 6.0 — `--accent` (roxo) + utilitários (2026-05-16)

A Sprint 6.0 PR 2 introduziu o token `--accent` (roxo, ADR-024) +
utilitários `--gradient-primary`, `.bg-hero`, `.glass-strong`,
`.bg-gradient-primary` em `globals.css`. Esta seção registra os 7
novos pares texto/fundo validados (3 light + 4 dark).

### Valores adotados

| Token | Light (OKLCH) | Dark (OKLCH) |
|---|---|---|
| `--accent` | `0.45 0.18 295` | `0.62 0.22 295` |
| `--accent-foreground` | `1 0 0` (branco) | `0.14 0.012 260` (= `--background`, dark text) |

### Output literal `wcag-check.ts` (1ª rodada, 2026-05-16)

Sem recalibração necessária — todos os pares passaram AA na primeira
rodada com os valores propostos no ADR-024. D10 (recalibração ad-hoc
autorizada) **não foi invocada**.

### Light theme — pares novos

| Par | fg → bg | Ratio | Kind | Status |
|---|---|---:|---|---|
| accent / background (link narrativo) | `#6034ac` → `#fafafa` | 7.77 | body | AAA ✅ |
| accent / surface (chip narrativo) | `#6034ac` → `#ffffff` | 8.12 | body | AAA ✅ |
| accent-foreground / accent (badge) | `#ffffff` → `#6034ac` | 8.12 | body | AAA ✅ |

### Dark theme — pares novos

| Par | fg → bg | Ratio | Kind | Status |
|---|---|---:|---|---|
| accent / background (link narrativo) | `#945ff9` → `#07090e` | 4.97 | body | AA ✅ |
| accent / surface (chip narrativo) | `#945ff9` → `#0c1016` | 4.78 | body | AA ✅ |
| accent / surface-elevated (chip em CTA) | `#945ff9` → `#12161d` | 4.52 | body | AA ✅ |
| accent-foreground / accent (badge) | `#07090e` → `#945ff9` | 4.97 | body | AA ✅ |

**✅ Todos os 7 pares novos passam WCAG AA.** Os 30 pares existentes
(Wave 4.0) continuam passando inalterados.

### Notas

- O par mais apertado é `accent / surface-elevated` no dark (4.52 vs
  threshold 4.5), uma margem de 0.02. Margem segura mas vale monitorar
  se algum consumer futuro empurrar accent contra surface ainda mais
  brilhante — recalibrar L para 0.65 daria folga.
- Light theme: accent roxo escurecido (`0.45 0.18 295`) entrega AAA em
  todos os pares. Reserva confortável para temas light dormentes
  voltarem a ser explicitamente suportados.
- Dark theme: accent roxo claro (`0.62 0.22 295`) entrega AA. Estratégia
  de foreground escolhida (texto escuro `--background` sobre bright
  accent) é o mesmo padrão de `--primary`/`--success`/`--warning` no
  dark — coerência cross-token.

### Utilitários CSS (não tocam WCAG por si)

- `.glass-strong` — backdrop-filter blur(18px); decorativo, sem teste
  de contraste aplicável (overlay translúcido sobre conteúdo abaixo)
- `.bg-hero` — radial gradient com `color-mix(in oklch, var(--primary)/var(--accent), transparent)`; decorativo, conteúdo dentro do hero usa `--foreground` (cobertos pelos pares já auditados)
- `.bg-gradient-primary` — linear gradient primary→accent; decorativo, texto sobre essa superfície DEVE usar `--primary-foreground` (que é o mesmo valor de `--accent-foreground` no dark, então cobertura WCAG aplica)
