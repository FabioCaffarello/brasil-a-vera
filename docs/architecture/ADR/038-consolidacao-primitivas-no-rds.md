# ADR-038: Fase de consolidação de primitivas no RDS

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-16
> Status: **accepted · implementada** (estende o
> [ADR-033](033-adocao-react-design-system-externo.md); decidido pelo owner via
> aprovação do plano, 2026-06-16). **Consolidação concluída** no mesmo dia — ver
> [`docs/migration/rds-consolidation-plan.md`](../../migration/rds-consolidation-plan.md)
> §Encerramento: camada local de genéricos zerada (só `card`/`tabs` + 4 wrappers
> de bundle sancionados); zero duplicata local / zero `@radix-ui/react-dialog`
> direto. As 5 issues upstream (#221–#225) foram entregues no RDS v4.0–v4.2.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Resíduos ratificados que NÃO migram](#resíduos-ratificados-que-não-migram)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O [ADR-033](033-adocao-react-design-system-externo.md) adotou o
`@fabio.caffarello/react-design-system` (RDS) como fonte‑alvo de primitivas e
composições genéricas, e declarou que **novas** primitivas viram issue no repo do
RDS — não cópia local nova. O [ADR-034](034-token-bridge-rds-e-promocao-fase-b.md)
fechou a ponte de tokens. A migração de **rotas** terminou (14 rotas promovidas,
staging `/rds/` removido, 0 pares de consolidação).

Mas o ADR-033 tratou do *fluxo de novos componentes* e da *migração de rotas* —
não da **camada local pré‑existente**. Hoje (RDS 3.12.0) o pacote já exporta
quase toda a `src/design-system/primitives/` (Button, Input, Label, Badge,
Skeleton, Separator, Card, Dialog, Accordion, Popover, Tooltip, Select, Checkbox,
Radio, Switch, Progress, Spinner, Toast…) e várias `compositions/`. O resultado é
uma **dupla‑camada**: componentes de domínio importam de
`@/design-system/primitives/*` enquanto as páginas já consomem o RDS direto —
inclusive casos de **dupla‑existência literal** (RDS `HeroSection`/`FilterChips`
em produção, cópia local ainda viva). Sintomas medidos
(`docs/migration/rds-consolidation-plan.md`, 2026-06-16): `accordion` local órfã
(0 consumidores; perfis já no wrapper `rds-accordion`), `hero-section` local só no
showroom, `kpi-strip`/`stats-grid` em 1 consumidor cada.

Sem um contrato explícito, a dupla‑camada apodrece: dupla manutenção, ambiguidade
de origem ("crio em `primitives/` ou puxo do RDS?"), e bundle redundante. É
preciso uma decisão que **aposente a camada local de forma faseada e
verificável**, sem cair no big‑bang.

## Decisão

1. **`src/design-system/primitives/` entra em deprecação ativa.** Nenhuma
   primitiva genérica nova nasce local — origem é o RDS (ou issue upstream, regra
   herdada do ADR-033). As primitivas locais existentes são **consolidadas**
   (imports repontados para o RDS + arquivo local removido) seguindo a fila
   ranqueada de [`rds-consolidation-plan.md`](../../migration/rds-consolidation-plan.md),
   **um balde/grupo por PR**.

2. **Sobrevivência condicional.** Uma primitiva/composição local só permanece se:
   (a) houver **gap do RDS documentado** com issue upstream linkada no cabeçalho
   do arquivo; ou (b) houver **razão técnica ratificada** — p.ex.
   `primitives/rds-accordion.ts`, wrapper `'use client'` que evita vazar o barrel
   `/granular` (+294KB medidos) num Server Component; ou
   `compositions/section-nav.tsx`, composição fina sobre o `useScrollSpy` do RDS.

3. **`src/components/` = só domínio.** Componentes cujas props referenciam
   entidades do produto (Parlamentar, Proposicao, Votacao, Partido, Trust,
   AlertPolicy…) ficam locais — são o "repositório de excelência" do projeto, não
   candidatos ao RDS. Composições genéricas seguem a regra dos itens 1–2.

4. **Guard anti‑regressão** (`scripts/rds-primitive-guard.ts`, `npm run
   guard:rds-primitive`): estático, sem build, falha o CI (exit 1) se qualquer
   arquivo em `src/**` importar de um caminho de primitiva marcado como
   consolidado/removido. A lista declarativa cresce **no mesmo PR** que deleta
   cada primitiva. Fecha o modo de falha "dupla‑camada reintroduzida por engano".

5. **Processo por PR** (princípio 13 + ADR-033): cada fatia roda `npm run ci` +
   `npm run build` + `vitest run` + `guard:rds-noop` + `guard:rds-primitive`, com
   QA visual side‑by‑side (`/dev/design` + rota‑amostra, desktop+mobile, atento ao
   bug #416 do `layer(rds)`) e output literal no corpo do PR. O **owner mergeia**;
   o Claude Code nunca faz `gh pr merge`.

6. **Gap genérico → issue no repo do RDS**, reafirmando o ADR-033. O número da
   issue é registrado no cabeçalho do componente local que fica como ponte (item 2a).

## Resíduos ratificados que NÃO migram

> **Atualização (2026-06-16):** o [ADR-039](039-migracao-residuos-de-cor-para-o-rds.md)
> é o "novo ADR" previsto abaixo e **revoga parte desta lista**: charts e
> `success-foreground` migram para o RDS (v4.3, issues #229/#230); `accent` vira
> gap‑com‑issue upstream (RDS #232). Só `PartyBadge` segue ratificado.

Estes permanecem em tokens/código BaV e **exigem novo ADR** para mudar — não são
dívida desta fase:

- **Paleta categórica de charts** `--chart-1..5` e `--accent` roxo (Okabe‑Ito,
  colorblind‑safe) — [ADR-024](024-acentos-secundarios-accent-roxo.md),
  [ADR-034 §5](034-token-bridge-rds-e-promocao-fase-b.md). O RDS não expõe paleta
  categórica equivalente.
- **`text-success-foreground`** (on‑color sobre `bg-success` sólido) — sem par no RDS.
- **Cores cruas de `PartyBadge`** (22 siglas) — decisão D4 da Wave 6 (espelhar
  identidade oficial dos partidos, não tokenizar).

Issues upstream candidatas para fechar parte destes gaps estão em
[`rds-consolidation-plan.md`](../../migration/rds-consolidation-plan.md) §"Issues
upstream".

## Alternativas Consideradas

### Alternativa A — Manter a dupla‑camada indefinidamente (status quo)
- Zero trabalho imediato.
- **Contra:** dupla manutenção, ambiguidade de origem, bundle redundante e drift
  visual entre a cópia local e o RDS. O problema só cresce a cada componente novo.

### Alternativa B — Big‑bang: remover toda a camada local de uma vez
- Resolve a dupla‑camada num PR.
- **Contra:** risco alto (Button sozinho tem 27 consumidores; Dialog depende de gap
  upstream), QA visual inviável de revisar, viola o padrão faseado que funcionou na
  migração de rotas. Rejeitada.

### Alternativa C (escolhida) — Deprecação ativa faseada com guard
- Consolidação balde‑por‑balde, cada PR pequeno e verificável; guard trava a
  regressão; gaps viram issue upstream em vez de bloquear.
- **Contra:** convivência temporária das duas camadas durante a transição; depende
  da cadência upstream para alguns casos (Dialog `showCloseButton`).

## Consequências

### Positivas
- Fonte única de primitivas/composições genéricas — fim da ambiguidade de origem.
- Menos código e bundle redundante; menos superfície de manutenção no repo do produto.
- `src/components/` fica nítido como camada de domínio (repositório de excelência).
- O guard torna a deprecação **executável**, não só documental.

### Negativas
- Consolidar primitiva **client** pode empurrar a fronteira `"use client"` para mais
  perto da raiz (a regra de desempate do ADR-033/matriz) — exige atenção a RSC.
- Trabalho mecânico em massa (ex.: 27 consumidores de Button) distribuído em vários PRs.
- Acoplamento à cadência do repo do RDS para os baldes (G) — Dialog, FilterChip singular.

### Neutras
- Mais um passo na aposentadoria gradual do [ADR-021](021-design-system-shadcn-curado.md)
  (já parcialmente superado pelo ADR-033): o pipeline shadcn‑CLI → `primitives/`
  fica formalmente fechado também para os componentes legados, não só os novos.
- Novo guard no CI (`guard:rds-primitive`), análogo ao `guard:rds-noop` e ao `wcag:check`.
- A skill `add-primitive` e o agent `rds-route-migrator` passam a refletir RDS‑first.

## Referências

- [ADR-033 — Adoção do RDS como pacote externo](033-adocao-react-design-system-externo.md)
- [ADR-034 — Token bridge do RDS e Fase B](034-token-bridge-rds-e-promocao-fase-b.md)
- [ADR-021 — Design system com shadcn curado](021-design-system-shadcn-curado.md)
- [ADR-024 — Acentos secundários / accent roxo](024-acentos-secundarios-accent-roxo.md)
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
- [Plano de consolidação RDS (fila acionável)](../../migration/rds-consolidation-plan.md)
- Princípio 13 (CLAUDE.md): validação empírica antes de mergear.
