# Auditoria WCAG 2.1 AA — Brasil a Vera

**Data:** 2026-05-11
**Escopo:** Todas as rotas públicas da Wave 1 (`/`, `/parlamentares`,
`/parlamentares/[id]`, `/proposicoes`, `/proposicoes/[tipo]/[numero]/[ano]`,
`/votacoes`, `/votacoes/[id]`, `/busca`).
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
