---
name: visual-qa
description: |
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

## Passo 1 — Primitivos no Storybook do RDS

Os primitivos genéricos vivem no `@fabio.caffarello/react-design-system`
(o BaV não tem mais primitiva local — ADR-038). Variantes de
primitivo se conferem no **Storybook do RDS**, não numa rota do app.

Pergunte ao usuário:

> Se a mudança envolve um primitivo do RDS, confira as variantes no
> Storybook do RDS (repo do design system). Aqui no BaV o foco do QA
> é a **integração** no shell do app — siga para o Passo 2.
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
