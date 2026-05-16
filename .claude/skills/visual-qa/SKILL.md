---
name: visual-qa
description: |
  Roteiro interativo de QA visual antes de abrir um PR com mudanças
  de UI. Caminha pelo /dev/design e por rotas-amostra em diferentes
  viewports e media features. Use quando o usuário tiver acabado de
  alterar componentes em src/design-system/** ou src/components/**.
---

Execute o roteiro abaixo passo a passo. A cada etapa, **espere
confirmação do usuário** (✓ ok / ✗ encontrei problema) antes de
prosseguir.

## Pré-requisitos

Confirme que:

- `npm run check` passou local.
- `npm run test` passou local.
- `npm run dev` está rodando (porta 3000 por padrão).

Se algum falhar, pare e peça correção antes do QA visual.

## Passo 1 — `/dev/design`

Pergunte ao usuário:

> Abra http://localhost:3000/dev/design no navegador. A página tem
> índice de todas as primitivas do design system. Confirme:
>
> 1. Página renderiza sem erros no console
> 2. Cada primitiva mostra suas variantes (default, secondary,
>    destructive etc. para Button; Tier 1 + Tier 2 que existirem)
> 3. Focus ring aparece em Tab navigation (use Tab para percorrer)
>
> ✓ ok / ✗ problema?

Se ✗, peça screenshot ou trecho do erro.

## Passo 2 — Rotas-amostra principais

Pergunte ao usuário para abrir, uma de cada vez:

1. `/` (home)
2. `/parlamentares`
3. `/parlamentares/<id-real>` (qualquer parlamentar real)

Em cada uma, confirme:

> 1. Layout não quebra
> 2. Texto legível (contraste WCAG aparente)
> 3. Cards/listagens renderizam sem warning
> 4. Se a página tem TrustBadge, cores L1/L2/L3/L4 estão consistentes
>    com o resto do site

## Passo 3 — Mobile 360px

> Abra DevTools (F12), modo responsivo, defina viewport 360x800.
> Recarregue qualquer uma das rotas do Passo 2.
>
> 1. Layout passa sem overflow horizontal?
> 2. Navbar usa hamburger ou compactação correta?
> 3. Botões mantêm tamanho mínimo de toque (44px+)?

## Passo 4 — `prefers-reduced-motion`

> Em DevTools → Rendering tab → Emulate CSS media feature
> `prefers-reduced-motion: reduce`.
>
> 1. Animações reduzem ou desaparecem?
> 2. Nenhuma animação fica em loop infinito?
> 3. Conteúdo permanece acessível?

## Passo 5 — Dark mode (default)

> Confirma que o site continua em modo dark (ADR-021 §dark-first).
> Sem toggle light por enquanto.

## Passo 6 — Screenshot antes/depois

Sugira ao usuário:

> Tire um screenshot da rota afetada antes/depois (compare com a
> versão em `main` se necessário, ou descreva o que mudou). Anexe os
> dois screenshots ao corpo do PR.

## Veredito final

Se todos os passos passaram, recomende:

> QA visual concluído. Pode abrir o PR com confiança visual.

Se algum falhou:

> QA visual encontrou problemas em: <passos>. Sugiro corrigir antes
> de abrir o PR. Quer ajuda em algum desses?
