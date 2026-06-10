# ADR-033: Adoção do React Design System (RDS) como pacote externo

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-09
> Status: accepted (supersede parcialmente o [ADR-021](021-design-system-shadcn-curado.md))

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [O que permanece do ADR-021](#o-que-permanece-do-adr-021)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O [ADR-021](021-design-system-shadcn-curado.md) estabeleceu o design system
próprio com shadcn/ui curado: componentes copiados via CLI para
`src/design-system/primitives/`, adaptados aos tokens, **"não como dependência
npm"**. Esse modelo serviu bem às Waves 4–10 (reskin completo, área logada).

Duas coisas mudaram desde então:

1. O owner extraiu e maturou um design system próprio como pacote
   versionado e público — `@fabio.caffarello/react-design-system` (RDS) —
   com tokens OKLCH, split de entries `.` (client) / `./server` (RSC) e
   evolução ativa (3.0.0 → 3.7.0 durante o próprio esforço de migração).
2. Manter duas implementações da mesma linguagem visual (primitivas
   shadcn-curadas no repo + RDS fora dele) passou a custar manutenção em
   dobro para um projeto solo: cada evolução de paleta, contraste AA ou
   variante precisa ser feita duas vezes.

A migração começou **antes** deste ADR — sequência empírica registrada:

- PR #355 — `docs/migration/migration-matrix.md`: 133 componentes
  catalogados em 4 categorias (1 = casa direto: 5; 2 = casa com ajuste: 23;
  3 = falta no RDS: 11; 4 = fica no consumidor: 94).
- PR #357 — `docs/migration/route-readiness.md`: 21 rotas classificadas
  por prontidão (6 alta, 12 média, 3 baixa).
- PR #359 — rota piloto `/rds/partidos/[sigla]` mergeada (strangler fig
  sob `/rds/`, `noindex` em 3 camadas).
- PRs #360/#361/#363 — particionamento de rotas por dependência de token e
  alinhamento de `--primary` à identidade navy com correções AA.
- `docs/migration/route-migration-playbook.md`, `token-map.md` e
  `consolidation-debt.md` — processo destilado, tradução canônica de
  tokens e dívida de espelhamento controlada.

Este ADR formaliza a decisão que esses PRs já vinham executando — pela regra
do `CLAUDE.md` (mudança que contraria ADR aceito exige revisar o ADR), a
formalização é obrigatória, não opcional. A tensão central com o ADR-021:
adotar um pacote externo de UI com escopo amplo é exatamente o que aquele
ADR proibia. O que muda a análise é que o RDS não é dependência opaca de
terceiro — é mantido pelo próprio owner, com código público auditável,
changelog versionado e canal direto para gaps (drafts E1–E12 de
enhancement e N1–N9 de componentes novos, rascunhados na matriz).

## Decisão

### 1. RDS é a fonte-alvo de primitivas e composições genéricas

`@fabio.caffarello/react-design-system` passa a ser a origem padrão de
componentes sem domínio (categorias 1 e 2 da matriz). O pipeline
"shadcn CLI → `src/design-system/primitives/`" do ADR-021 **deixa de ser o
caminho para novas primitivas** — gap de componente genérico vira issue no
repo do RDS (draft N*/E*), não cópia local nova.

### 2. Migração por strangler fig rota-a-rota, conforme playbook

- Rota migrada vive sob `/rds/<caminho>/` em paralelo à original
  (`noindex` em 3 camadas), até promoção por confiança visual +
  comportamental — princípio 13: validação empírica antes de troca em
  produção.
- `docs/migration/token-map.md` é a fonte única de tradução de tokens;
  token não previsto = parar e registrar com prova de valor.
- Componentes de domínio (categoria 4) são duplicados sob `_components/`
  da rota, com política de espelhamento e consolidação registrada em
  `docs/migration/consolidation-debt.md`. Promoção da rota = consolidação
  e remoção do par da tabela.
- Rotas anônimas permanecem zero-JS: apresentacionais importados apenas
  do entry `./server`; interativos sob client boundary explícito.

### 3. Governança da dependência

- Bumps de versão do RDS são justificados no PR (changelog relevante +
  impacto em rotas migradas), como qualquer dependência.
- Range `^` (minor/patch automáticos via lockfile revisado); major exige
  PR dedicado com teste visual das rotas migradas.

### 4. Destino final

Quando todas as rotas estiverem promovidas: primitivas de
`src/design-system/primitives/` duplicadas pelo RDS são removidas;
composições e componentes de domínio que permanecerem no repo seguem as
regras remanescentes do ADR-021. `docs/migration/` é arquivado como
registro histórico do processo.

## O que permanece do ADR-021

O supersede é **parcial**. Continuam valendo:

- **Curadoria com consumer concreto** (princípio 14): componente do RDS só
  entra numa rota quando uma migração/feature real o consome.
- **Tokens semânticos como contrato**: a paleta do app continua exposta
  via CSS vars semânticas; o token-map traduz, não substitui o contrato.
- **Import boundary**: `src/design-system/**` (residual) e os componentes
  que consomem RDS não importam de `lib/queries/`, `modules/`,
  `shared/db/` — design system segue folha do grafo interno.
- **Justificativa de bundle no PR** para componentes client (`.` entry).
- **Divisão primitiva × composição × componente de domínio** — categorias
  da matriz mapeiam 1:1 nessa divisão.

O que é superseded: a proibição de dependência npm de UI e o pipeline
shadcn-CLI como caminho padrão para novas primitivas.

## Alternativas Consideradas

### A. Continuar no ADR-021 puro (shadcn curado in-repo, sem RDS)

- **Prós**: zero dependência externa de UI; nada a migrar; auditabilidade
  máxima dentro do repo.
- **Contras**: o owner mantém o RDS de qualquer forma — cada evolução
  visual (paleta, AA, variantes) é paga duas vezes; em projeto solo
  mantido por doação, manutenção duplicada é o custo que o projeto
  explicitamente otimiza para não ter.
- **Veredicto**: descartado por custo de manutenção em dobro.

### B. Vendoring/fork do RDS dentro do repo

- **Prós**: código no repo, sem dependência de registry.
- **Contras**: perde upgrades automáticos e recria o problema da
  alternativa A com passo extra; o RDS já é público e versionado —
  auditável sem vendoring.
- **Veredicto**: descartado; vendoring só se o pacote deixar de ser
  público ou mantido.

### C. Migração big-bang (trocar imports direto nas rotas de produção)

- **Prós**: sem dívida de espelhamento, sem rotas duplicadas sob `/rds/`.
- **Contras**: regressão visual ampla sem comparação lado a lado; viola o
  princípio 13 (validação empírica antes de mudança de comportamento);
  80 componentes RSC × entry client do RDS criam risco real de empurrar
  `"use client"` para a raiz e quebrar o zero-JS anônimo.
- **Veredicto**: descartado; o strangler fig por rota dá o A/B empírico.

### D. Pausar a migração até decisão formal

- **Prós**: ortodoxia processual máxima.
- **Contras**: a piloto já validou o padrão (#359) e o custo da pausa é
  manter o drift de cópias por mais tempo. A decisão de fato já foi
  tomada nos PRs; pausar agora só atrasaria a formalização.
- **Veredicto**: descartado; este ADR é a formalização retroativa, com a
  lição registrada (ver Consequências Negativas).

## Consequências

### Positivas

- Linguagem visual evolui em **um** lugar; correções AA e de paleta
  chegam ao app por bump de versão revisado.
- Menos código de UI próprio para manter no repo a longo prazo.
- Processo repetível e auditável: matriz + playbook + token-map fazem
  cada migração de rota ser PR mecânico, não redescoberta.
- Zero-JS anônimo preservado por construção (entry `./server`).

### Negativas

- **Dependência externa em path crítico de UI.** Mitigação: pacote do
  próprio owner, público; major pinado por PR dedicado.
- **Dívida de espelhamento durante a migração** (cópias-rds × originais).
  Mitigação: tabela viva em `consolidation-debt.md` com risco por par;
  candidata a guard automatizado (hook/CI) enquanto a dívida existir.
- **Fronteira RSC**: o entry client do RDS cobre componentes que aqui são
  RSC (Button, Badge, Card, Dialog…), o que reclassifica migrações
  aparentemente diretas como categoria 2. Cada rota precisa vigiar o
  bundle anônimo no PR.
- **Processo iniciado antes do ADR.** A migração rodou 5 PRs sem registro
  arquitetural — desvio da própria regra do projeto. Registrado aqui como
  lição: iniciativa que tensiona ADR aceito abre o ADR novo **antes** do
  piloto, não depois.

### Neutras

- ADR-021 não é revogado — status anotado como parcialmente superseded;
  suas regras de curadoria, boundary e tokens permanecem.
- `CLAUDE.md` ganha pointer para este ADR na regra do design system.
- Rotas sob `/rds/*` seguem `noindex` até promoção.

## Referências

- [ADR-006 — Stack Frontend](006-frontend-stack.md)
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-020 — Permanência do monolito TypeScript](020-permanencia-monolito-typescript.md)
- [ADR-021 — Design System próprio com shadcn/ui curado](021-design-system-shadcn-curado.md)
- [Matriz de migração](../../migration/migration-matrix.md) · [Prontidão por rota](../../migration/route-readiness.md) · [Playbook](../../migration/route-migration-playbook.md) · [Token map](../../migration/token-map.md) · [Dívida de consolidação](../../migration/consolidation-debt.md)
- PRs #355, #357, #359 (piloto), #360, #361, #363
- Pacote: `@fabio.caffarello/react-design-system` (em `package.json`: `^3.7.0`)
