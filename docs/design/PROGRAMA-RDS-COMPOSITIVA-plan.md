# Plano — Programa RDS Camada Compositiva (Cards, Detalhe & Patterns)

> Brasil a Vera · Programa de frontend · vP1
> Data: 2026-06-23
> Status: draft (aguardando aprovação do owner)

Programa multi-PR análogo ao de consolidação de primitivas (ADR-038), agora um
nível acima: adotar a **camada compositiva** do RDS nos componentes de domínio.
Ratificado pelo [ADR-053](../architecture/ADR/053-adocao-camada-compositiva-rds.md).
Não é uma sprint numerada de wave — encaixa na wave que o owner preferir (ver D1).

## Progresso (2026-06-23)

- **PR #1** (#570, ✅ merged) — fonte única do badge de status sobre RDS `DataBadge`.
- **PR #2** (#571, ✅ merged) — cards de listagem sobre o `Card` compound + `<article>`/`aria-label`.
- **PR #3** (#572, ✅ merged) — **Breadcrumb** puxado da Fase 2 para a Fase 1: o
  `Avatar` (PR #3 original) foi **adiado** por dois gaps do RDS — sem
  `loading="lazy"` ([RDS #247](https://github.com/FabioCaffarello/react-design-system/issues/247))
  e escala tampando em 64px vs. 96-112px do PerfilHeader
  ([RDS #248](https://github.com/FabioCaffarello/react-design-system/issues/248)).
- **PR #4** (#575, ✅ merged) — **Avatar retomado**: RDS v4.7 entregou as duas
  issues (#247 `loading` + #248 sizes `2xl`/`3xl`). `ParlamentarAvatar` (wrapper
  de domínio sobre `Avatar` via `/granular`, padrão `rds-*`) no card (lazy) e no
  PerfilHeader (96→112px). Loop consumidor↔RDS fechado em ~12h.
- **PR #5** (#576, ✅ merged) — **Timeline** do RDS na tramitação de proposição:
  o `<ol>` hand-rolled (rail + dots) de `tramitacao-timeline.tsx` vira
  `<Timeline orientation="vertical">`; filtros, paginação por cursor e empty
  states honestos preservados em volta.
- **PR #6** (este) — **DetailLayout** (piloto em proposições). Dois ajustes de
  rota vs. o plano original, validados na exploração:
  1. A premissa "votação não tem SectionNav" era **FALSA** — as 3 rotas já têm
     SectionNav. O valor real do DetailLayout é eliminar a **tríplice declaração
     por seção** (SectionNav + Accordion mobile + SectionCard desktop, com o
     conteúdo duplicado) via um array `sections` único.
  2. `Container`/`Stack` do RDS usam `max-w-screen-*` (≠ `max-w-4xl` do projeto)
     → **não adotados** (mudariam dimensões); a casca fica em divs. Adoção fica
     como issue futura (RDS precisa de `max-w-4xl` ou tamanho custom).
  Piloto em proposições (4 seções, conteúdo desktop==mobile); votação (grid
  2-col em resumo+proposição) e parlamentar (~20 seções condicionais) seguem em
  follow-ups.

> Achado empírico (PR #4): `/parlamentares` renderiza ~726 cards sem paginação
> → `Pagination` do RDS é candidato forte, mas é a decisão **D3** (UX + custo de
> query Neon, princípio 12) — aguarda chamada do owner.

## Pré-leitura confirmada

- [x] `docs/architecture/ADR/038-consolidacao-primitivas-no-rds.md` (fase anterior)
- [x] `docs/architecture/ADR/053-adocao-camada-compositiva-rds.md` (este programa)
- [x] `docs/migration/rds-consolidation-plan.md` (§Encerramento — superfície RDS)
- [x] `CLAUDE.md` (princípios 8–13, regras de design-system)
- [x] Auditoria 2026-06-23 (2 agentes: consumo RDS 4.5.0 + padrões de frontend)
- [x] `src/components/{proposicao,votacao,parlamentar}/*-card.tsx`,
      `src/components/proposicao/situacao.ts`,
      `src/design-system/compositions/data-badge.tsx`

## Decisões já tomadas (não revisitar)

1. **Ambição Tier B** — endurecer consistência *e* adotar patterns RDS ignorados;
   sem redesenho de fluxos (Tier C deferido, ADR-053 §Decisão.4).
2. **Começar por Cards + StatusBadge** (maior visibilidade; aparece em todas as
   listagens).
3. **Domínio local *sobre* RDS** — `src/components/` é construído sobre as
   composições/patterns do RDS, não reinventa layout (ADR-053 §Decisão.1).
4. **Gap genérico → issue upstream**, não composição local nova (ADR-038 §6).
5. **Processo por PR** com gate empírico do princípio 13 (QA visual side-by-side,
   output literal no PR). Owner mergeia; Claude Code nunca faz `gh pr merge`.
6. **Preservar padrões exemplares** — Preview Drawer
   (`src/components/preview/create-preview.tsx`) e progressive enhancement dos
   filtros não regridem.

## Decisões pendentes

- **D1** — Encaixe em wave: este programa entra na Wave vigente, vira wave própria,
  ou roda como programa transversal (como o de consolidação)? Define a numeração e
  o release-notes de destino.
- **D2** — `StatusBadge` constrói sobre o `DataBadge` local
  (`design-system/compositions/data-badge.tsx`, já com `tone`) ou direto sobre
  `Badge`/`Dot` do RDS? Recomendação: `DataBadge` (já é a ponte do `accent` e
  server-safe), reavaliar quando RDS #232 fechar.
- **D3** — Paginação (Fase 4): as listagens hoje listam tudo ou já paginam? Adotar
  `Pagination` do RDS implica decidir UX + custo de query Neon (princípio 12). Medir
  antes.
- **D4** — `SearchAndFilterPattern` na `/busca`: só adotar se reduzir código sem
  regredir o progressive enhancement — validar empiricamente antes de comprometer.

## PRs propostos

| # | Conteúdo | Tipo | Fase |
|---|---|---|---|
| 1 | `StatusBadge` de domínio (absorve `situacaoClasses` + ternário inline de votação numa fonte única) sobre `DataBadge`/RDS | feat | 1 |
| 2 | `ProposicaoCard`/`VotacaoCard`/`ParlamentarCard` reconstruídos sobre `Card` compound do RDS; raiz `<article>` unificada + `aria-label` por card; `home/card-votacoes-semana` adota `StatusBadge` | refactor | 1 |
| 3 | `Avatar` do RDS no card + `PerfilHeader` (placeholder/alt padronizados) | refactor | 1 |
| 4 | `DetailLayout` de domínio (header + KPIs + SectionNav/Accordion) sobre `Container`/`Stack`/`PageHeader`; aplica nas 3 rotas de detalhe; resolve `/votacoes/[id]` sem `SectionNav` | feat | 2 |
| 5 | `Breadcrumb` do RDS nas rotas de detalhe + `temas/[codigo]` | feat | 2 |
| 6 | `Timeline` do RDS na tramitação de proposição (detalhe); `TramitacaoStrip` permanece no card | feat | 2 |
| 7 | Abstração dos 3 filtros (`FiltrosAtivos`/`buildHref`) sobre `FilterChips`+`Select`/`MultiSelect`; preserva URL-state e zero-JS | refactor | 3 |
| 8 | (condicional D4) `SearchAndFilterPattern`/`SearchInput` na `/busca` | feat | 3 |
| 9 | Consolidar `EmptyState` local → RDS + copy unificada; `error.tsx` global; `Tooltip` educativo nos níveis de confiança | chore/feat | 4 |
| — | Issues upstream: `Stat.floatingBadge` (libera `kpi-card`); consumir RDS #232 quando sair (libera `data-badge`) | issue | — |

> Cada PR é um balde; ordem respeita dependência (StatusBadge antes dos cards;
> DetailLayout antes de Breadcrumb/Timeline no detalhe).

## Dependências novas (com justificativa ADR-019)

- **Nenhuma.** Todos os alvos (`Card`, `Avatar`, `Breadcrumb`, `Timeline`,
  `Container`, `Stack`, `Tooltip`, `EmptyState`, `Pagination`, `Select`,
  `MultiSelect`, `FilterChips`, `SearchAndFilterPattern`) já são exportados pelo
  RDS 4.5.0 instalado. Issues upstream não são deps — são pedidos de feature ao RDS.

## Riscos identificados

1. **Fronteira `'use client'`** — recompor card/badge client pode empurrar a fronteira
   para a raiz. Mitigação: preservar wrappers `rds-*` `/granular`; medir build
   (canário ~975ms; salto a 5s+ = vazamento de `ingestion/`).
2. **Bug #416 (`layer(rds)`)** — utilities responsivas do BaV colapsando sob o CSS do
   RDS. Mitigação: QA visual desktop+mobile, light+dark, por fatia.
3. **Drift visual durante a transição** — cards recompostos convivendo com legados.
   Mitigação: Fase 1 num bloco curto de PRs; QA side-by-side com `/dev/design`.
4. **Cadência upstream** — `Stat.floatingBadge` e `DataBadge` accent (#232) bloqueiam
   2 consolidações; não bloqueiam o programa (ficam locais como ponte).
5. **Preview Drawer / progressive enhancement** — regressão silenciosa ao trocar a
   estrutura do card. Mitigação: teste vitest co-localizado + QA com JS desabilitado.

## Critério de sucesso do programa

- Badge de status com **fonte única** (`StatusBadge`); zero hardcode inline.
- 3 cards de listagem sobre `Card` compound do RDS; raiz semântica e `aria-label`
  consistentes.
- Rotas de detalhe com navegação consistente (todas com `SectionNav` quando ≥4
  âncoras) + `Breadcrumb`.
- `Timeline`, `Avatar`, `Breadcrumb` do RDS em uso real (saem do consumo zero).
- `guard:rds-primitive` verde; build dentro do canário; QA visual sem regressão #416.
- `src/components/` mensurável como domínio fino sobre RDS (menos JSX de layout
  copiado).
