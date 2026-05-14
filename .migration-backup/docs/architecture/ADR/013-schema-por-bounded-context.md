# ADR-013: Schema por bounded context no Postgres

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-12
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O Brasil a Vera é um modular monolith (ADR-001) executado como
processo único (ADR-007). O domínio se divide em bounded contexts
correspondendo às fontes públicas e aos agregados de transparência:
**parlamentares**, **proposicoes**, **votacoes**, **gastos**. Cada
contexto tem suas próprias tabelas raiz e tabelas filhas, suas
próprias regras de idempotência (ADR-014), e seus próprios scripts
de ingestão.

Sem isolamento físico no banco, o ambiente fica como o seguinte:

- Todas as tabelas convivem em `public` — `parlamentar`,
  `proposicao`, `votacao`, `gasto`, mais filhas como `voto_nominal`,
  `tramitacao`, `autor_proposicao`. Conflito de nomes obriga
  prefixar (`votacao_voto_nominal`) ou aceitar ambiguidade
  (`autor` é da proposição? do voto?).
- Inspeção em `psql` lista dezenas de tabelas misturadas (`\dt`
  retorna ruído sem agrupamento conceitual).
- Archive parcial (ADR-016, mover legislaturas antigas para R2)
  fica trabalhoso — não há recorte natural por contexto.
- Permissões de banco granulares (futuro RLS, ou contas read-only
  por área) precisam mapear tabela a tabela em vez de contexto a
  contexto.

A primeira tabela criada na Wave 0 (`parlamentares.parlamentar`) já
foi declarada em schema dedicado via `pgSchema('parlamentares')`,
estabelecendo o padrão de facto. As tabelas subsequentes
(`proposicoes.*`, `votacoes.*`, `gastos.*`) seguiram o mesmo
modelo sem ADR explícito — este documento registra a decisão
retroativamente.

## Decisão

Cada bounded context tem **schema dedicado no Postgres**, declarado
via `pgSchema('<nome>')` do Drizzle no respectivo
`src/modules/<contexto>/domain/schema.ts`.

Convenções:

- **Nome do schema = nome do diretório do módulo** (plural,
  caixa-baixa): `parlamentares`, `proposicoes`, `votacoes`,
  `gastos`.
- **Cada `domain/schema.ts` declara seu próprio
  `pgSchema(...)` e todas as tabelas do contexto.** Não há
  arquivo único de schema agregado.
- **FKs cross-schema são explícitas e permitidas.** Importam o
  symbol da tabela alvo e usam `references(() => outroModulo.id)`.
  Exemplo real em `src/modules/votacoes/domain/schema.ts`: importa
  `parlamentar` de `parlamentares` e `proposicao` de `proposicoes`.
- **Enums permanecem em `public`.** Enums (`casa`, `trust_level`,
  `situacao_mandato`, `tipo_participacao`, `orientacao_bancada`,
  `tipo_voto`) são usados cross-schema; centralizá-los em
  `src/shared/db/enums.ts` evita duplicação e mantém um único
  ponto de mudança quando um valor for adicionado.
- **Migrations criam o schema antes da primeira tabela.** Drizzle
  Kit gera `CREATE SCHEMA "<nome>";` automaticamente na primeira
  migration que toca tabelas do contexto (ver
  `0000_open_doomsday.sql`).

## Alternativas Consideradas

### Schema único `public`

- **Prós**: padrão histórico do Postgres; zero qualificação em
  queries; ferramentas genéricas funcionam sem ajuste; menor
  overhead conceitual.
- **Contras**: força prefixação manual de nomes (`votacao_voto`,
  `proposicao_autor`); inspeção em `psql` mistura contextos;
  archive por contexto vira recorte por prefixo de tabela, frágil;
  permissões granulares precisam ser por tabela.
- **Veredicto**: descartado. O custo de prefixar nomes
  manualmente compõe com o tempo conforme o número de tabelas
  cresce, e perde o agrupamento natural que `pgSchema` já
  oferece de graça.

### Schema por aggregate root

- **Prós**: isolamento máximo; cada tabela raiz com suas filhas
  em schema próprio (`parlamentar`, `filiacao`, `comissao` em
  schemas separados).
- **Contras**: explosão de schemas (10+ no estado atual, dezenas
  no longo prazo); FKs cross-schema viram regra, não exceção;
  archive ganha granularidade que ninguém pediu; complexidade
  de migration multiplicada.
- **Veredicto**: descartado por excesso de granularidade. Bounded
  context é o recorte certo — corresponde ao módulo do código,
  à fonte de dados e ao ciclo de ingestão.

### Databases Postgres separadas (uma por contexto)

- **Prós**: isolamento físico completo; políticas de backup
  independentes; quotas separadas.
- **Contras**: FKs cross-database são impossíveis no Postgres
  (sem FDW + complexidade séria); transactions multi-database
  não existem; quadruplica o número de conexões e custo
  operacional (4× scale-to-zero ainda é 4× se houver tráfego
  desbalanceado); contraria diretamente o ADR-007 (monolith-first)
  e o ADR-003 (banco único no Neon).
- **Veredicto**: descartado. Adequado a SaaS multi-tenant, não
  a projeto solo com banco único e ingestão cross-contexto.

## Consequências

### Positivas

- **Namespacing claro** — `parlamentares.parlamentar` vs
  `gastos.gasto` sem prefixo de gambiarra; nome do schema carrega
  o contexto.
- **Inspeção em `psql` por contexto** — `\dn` lista os 4 schemas;
  `\dt parlamentares.*` mostra apenas as tabelas de parlamentares;
  reduz ruído quando o número de tabelas cresce.
- **Archive por schema fica trivial (ADR-016)** — mover uma
  legislatura completa de votações para R2 vira `pg_dump --schema
  votacoes_archive`; o recorte é natural.
- **Reflete a arquitetura modular do código** — quem entende
  `src/modules/<contexto>/` entende a divisão das tabelas sem
  precisar de mapa adicional.
- **Permissões granulares futuras** (read-only para uma área
  externa, RLS por contexto) ficam disponíveis sem refatoração.

### Negativas

- **Queries cross-schema exigem qualificação completa** — tabelas
  e índices precisam ser referidos por `schema.tabela`. Em SQL
  cru: levemente mais verboso. Em Drizzle: invisível, o ORM já
  qualifica automaticamente.
- **Alguns clientes/tools genéricos assumem schema único** —
  alguns dashboards e linters de SQL filtram apenas `public` por
  padrão; precisam ser configurados para ver os outros schemas.
  Drizzle Studio agrupa por schema (positivo, mas exige um
  drill-down a mais).
- **Testcontainers precisa rodar todas as migrations
  ordenadamente** — não basta criar tabelas isoladas; o setup de
  teste tem que aplicar `CREATE SCHEMA` antes do `CREATE TABLE`
  dependente, na ordem das migrations do projeto.
- **FK cross-schema requer disciplina** — adicionar coluna
  `parlamentar_id` em `votacoes.voto_nominal` cria acoplamento
  explícito entre módulos. Boa documentação, mas obriga ler dois
  arquivos para entender a relação completa.

### Neutras

- **Enums em `public`** — decisão pragmática, não conceitualmente
  pura. Mover `casa` para `parlamentares.casa` quebraria seu uso
  em `votacao.casa` cross-schema sem ganho real. Aceitamos a
  exceção como custo de ergonomia.
- **Nome dos schemas no plural** segue o nome do diretório do
  módulo. Não tem virtude técnica sobre singular, é só
  consistência interna.

## Referências

- Schemas em uso: `src/modules/parlamentares/domain/schema.ts:25`
  (`pgSchema('parlamentares')`),
  `src/modules/proposicoes/domain/schema.ts`,
  `src/modules/votacoes/domain/schema.ts:32`,
  `src/modules/gastos/domain/schema.ts:23`
- Enums centralizados: `src/shared/db/enums.ts`
- Migration inicial:
  `src/shared/db/migrations/0000_open_doomsday.sql` linha 1
  (`CREATE SCHEMA "parlamentares";`)
- Exemplo de FK cross-schema:
  `src/modules/votacoes/domain/schema.ts:15-16` (importa
  `parlamentar` e `proposicao`)
- [Issue #24 — registro de gerência](https://github.com/FabioCaffarello/brasil-a-vera/issues/24)
- [ADR-001 — Estratégia de monorepo / modular monolith](001-monorepo-strategy.md)
- [ADR-007 — Monolith-first strategy](007-monolith-first-strategy.md)
- [ADR-010 — UUID v7 como chave primária](010-uuid-v7.md)
- [ADR-016 — Cobertura temporal e arquivamento para R2](016-cobertura-temporal-arquivamento.md)
