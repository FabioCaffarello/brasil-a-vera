# ADR-053: Adoção da camada compositiva do RDS

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-23
> Status: **accepted** (estende o [ADR-038](038-consolidacao-primitivas-no-rds.md);
> decidido pelo owner via aprovação do plano, 2026-06-23)

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Componentes-alvo do RDS](#componentes-alvo-do-rds)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O [ADR-038](038-consolidacao-primitivas-no-rds.md) encerrou a **consolidação de
primitivas**: a camada local `src/design-system/primitives/` foi aposentada, os
imports foram repontados para o `@fabio.caffarello/react-design-system` (RDS) e o
guard `rds-primitive` trava a regressão. Mas aquela fase resolveu a **origem** das
primitivas — não o **nível de composição** em que o produto as consome.

Uma auditoria (2 agentes, 2026-06-23) mediu o resultado e encontrou um gap claro:

- **Consumo estreito e raso.** O BaV importa do RDS sobretudo primitivas, e poucas:
  `Button` (23×), `Text` (9×), `Skeleton` (5×) + uns poucos de composição
  (`HeroSection`, `FilterChips`, `Stat`, `Card` 2×). 73 imports em 53 arquivos,
  concentrados na base da pirâmide de componentes.
- **Camada compositiva do RDS 4.5.0 com consumo zero.** O pacote exporta
  `DataTablePattern`, `SearchAndFilterPattern`, `FormWizardPattern`,
  `DashboardLayout`, `Timeline`, `Breadcrumb`, `Pagination`, `EmptyState`, `Avatar`,
  `Stepper`, `Menu`, `Navigation`, `PageHeader`, `Container`, `Stack`, `Tooltip`,
  `Select`, `MultiSelect`, `Dot` — **nada disso é importado** hoje.
- **Reinvenção com inconsistência.** Ao mesmo tempo, fazemos à mão o que o RDS já
  resolve, e de formas divergentes: os 3 cards de listagem copiam as mesmas classes
  de borda/hover/focus sem usar o `Card` compound; o badge de status tem **3
  implementações** (`situacaoClasses()` helper na proposição, ternário inline na
  votação, `DataBadge` no mandato); as rotas de detalhe navegam de forma
  inconsistente (`/votacoes/[id]` não tem `SectionNav`); `Breadcrumb` é ausente em
  toda a app; a foto do parlamentar é `<img rounded-full>` cru.

Sem uma decisão explícita, a dupla-camada se repete num nível acima: agora não é
"primitiva local vs RDS", é "composição feita à mão vs pattern do RDS". O custo é o
mesmo — dupla manutenção, drift visual, JSX copiado — só que mais caro de desfazer
porque vive espalhado nos componentes de domínio.

O [ADR-038 §3](038-consolidacao-primitivas-no-rds.md) já estabeleceu que
`src/components/` é a camada de domínio (o "repositório de excelência"). O que falta
é a regra de **como** essa camada se relaciona com a camada compositiva do RDS.

## Decisão

1. **Componentes de domínio são construídos *sobre* a camada compositiva do RDS, não
   ao lado dela.** Um componente cujas props referenciam entidades do produto
   (Parlamentar, Proposição, Votação, Partido, Trust) fica local (ADR-038 §3), mas
   seu **layout, estrutura e estados** vêm de composições/patterns do RDS (Card
   compound, Timeline, Breadcrumb, Avatar, Container/Stack, EmptyState…). Reinventar
   layout que o RDS já oferece é uma regressão, não uma escolha.

2. **Adoção faseada e verificável**, herdando o processo do ADR-038: um balde por PR,
   começando pela fatia de maior visibilidade (Cards + `StatusBadge`), seguida por
   rotas de detalhe + navegação, busca/filtros e adoções pontuais. Cada fatia passa
   pelo gate empírico do princípio 13 (CLAUDE.md) com QA visual side-by-side.

3. **Gap genérico → issue no repo do RDS** (reafirma ADR-038 §6 / ADR-033). Quando um
   pattern do RDS quase serve mas falta um slot/variante, abre-se issue upstream e o
   componente local fica como ponte com o nº da issue no cabeçalho — não se cria
   composição genérica nova local.

4. **Patterns de nível de fluxo (`CommandPalette`, `DashboardLayout`/`SideNavbar`,
   `FormWizardPattern`/`Stepper`) ficam fora desta fase.** Eles implicam redesenho de
   fluxo (Tier C), não só recomposição. Entram em wave futura **se** a adoção da
   camada compositiva (Tier B) provar valor — decisão consciente de escopo, não
   esquecimento.

## Componentes-alvo do RDS

Matriz da auditoria — o que o RDS oferece × o BaV usa hoje × destino desta fase:

| Componente RDS | Uso hoje | Destino (esta fase) |
| --- | --- | --- |
| `Card` compound (`CardHeader/Body/Actions`) | 2× | base dos 3 cards de listagem + perfis |
| `Avatar` | 0 | foto de parlamentar (card + `PerfilHeader`) |
| `Breadcrumb` | 0 | rotas de detalhe + `temas/[codigo]` |
| `Timeline` | 0 | tramitação de proposição (detalhe) |
| `Container` / `Stack` | 0 | ritmo/espaçamento das rotas de detalhe |
| `Tooltip` | 0 | camada educativa nos níveis de confiança (L1–L4) |
| `EmptyState` | local (`components/ui`) | repontar p/ RDS + copy unificada |
| `Pagination` | 0 | listagens, se passarem a paginar (custo Neon) |
| `Select` / `MultiSelect` / `FilterChips` | parcial | abstração dos 3 filtros triplicados |
| `SearchAndFilterPattern` | 0 | avaliar p/ `/busca` (só se reduzir código) |
| `DataBadge` (tom `accent`) | local | bloqueado por [RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232) |
| `Stat.floatingBadge` | — | gap → abrir issue upstream (libera `kpi-card`) |

## Alternativas Consideradas

### Alternativa A — Manter no nível de primitiva (status quo pós-ADR-038)

- **Descrição:** declarar a migração "completa" no encerramento do ADR-038 e só
  consumir primitivas; composições continuam feitas à mão no domínio.
- **Prós:** zero trabalho novo; a dívida de consolidação já está quitada.
- **Contras:** a inconsistência medida (3 badges de status, cards copiados, navegação
  divergente, `Breadcrumb` ausente) permanece e cresce; o valor da camada
  compositiva do RDS — testada, acessível, mantida upstream — fica na prateleira; o
  drift visual entre rotas aumenta a cada feature nova.
- **Veredicto:** rejeitada. Consolidar primitivas e ignorar composições deixa o
  ganho de UX na mesa e perpetua a reinvenção.

### Alternativa B — Redesenho de fluxos agora (Tier C)

- **Descrição:** além de recompor, repensar fluxos: `CommandPalette` na busca,
  `DashboardLayout`/`SideNavbar` no `/painel`, `FormWizardPattern`/`Stepper` no
  onboarding/LGPD.
- **Prós:** maior salto de UX num só esforço.
- **Contras:** escopo e risco altos; mistura recomposição (mecânica, verificável)
  com mudança de fluxo (decisão de produto, requer validação de UX); inviabiliza o
  gate empírico por fatia pequena; projeto solo, custo-consciente.
- **Veredicto:** rejeitada **para agora**. Fica deferida como Tier C, condicionada ao
  valor comprovado do Tier B.

### Alternativa C (escolhida) — Adoção faseada da camada compositiva (Tier B)

- **Descrição:** domínio local **sobre** composições/patterns do RDS, balde por PR,
  gap → issue upstream, fluxos fora de escopo.
- **Prós:** ataca a inconsistência medida com risco controlado; aproveita a camada
  compositiva já paga (instalada, testada, mantida); cada PR é pequeno e verificável
  pelo princípio 13; preserva os padrões exemplares do projeto (Preview Drawer,
  progressive enhancement).
- **Contras:** convivência temporária de cards/badges recompostos e legados durante a
  transição; alguns alvos dependem de cadência upstream (`Stat.floatingBadge`,
  `DataBadge` accent).
- **Veredicto:** escolhida.

## Consequências

### Positivas

- Fim da reinvenção de layout: `src/components/` vira domínio fino sobre RDS.
- UX consistente entre rotas (badges de status, navegação de detalhe, wayfinding).
- Componentes RDS de alto valor (`Timeline`, `Breadcrumb`, `Avatar`, `Tooltip`)
  finalmente em uso — acessibilidade e manutenção delegadas ao upstream.
- Menos JSX copiado; menos superfície de manutenção no repo do produto.

### Negativas

- Recompor card/badge **client** pode empurrar a fronteira `'use client'` — exige a
  mesma atenção a RSC do ADR-038 (preservar wrappers `rds-*` `/granular`).
- Trabalho distribuído em vários PRs; alguns alvos bloqueados por cadência upstream.
- Risco de drift visual durante a transição (mitigado pelo QA visual por fatia).

### Neutras

- Mais um passo na trajetória ADR-033 → ADR-038 → ADR-053: origem das primitivas →
  consolidação da camada local → nível de composição. Não cria mecanismo novo de CI;
  reusa `guard:rds-primitive`, `visual-qa` e o gate do princípio 13.
- O agent `rds-route-migrator` e a skill `add-primitive` permanecem RDS-first; esta
  fase opera no nível de domínio, fora do escopo do guard de primitivas.

## Referências

- [ADR-033 — Adoção do RDS como pacote externo](033-adocao-react-design-system-externo.md)
- [ADR-038 — Consolidação de primitivas no RDS](038-consolidacao-primitivas-no-rds.md)
- [ADR-039 — Migração de resíduos de cor para o RDS](039-migracao-residuos-de-cor-para-o-rds.md)
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
- [Plano de consolidação RDS (fila acionável)](../../migration/rds-consolidation-plan.md)
- [RDS #232 — tom `accent`/data-viz no DataBadge](https://github.com/FabioCaffarello/react-design-system/issues/232)
- Princípio 13 (CLAUDE.md): validação empírica antes de mergear.
