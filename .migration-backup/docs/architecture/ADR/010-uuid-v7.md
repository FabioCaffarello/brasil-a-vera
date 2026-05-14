# ADR-010: UUID v7 como chave primária

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

Toda tabela de domínio do Brasil a Vera precisa de uma chave
primária estável, gerável sem coordenação central, e que não vaze
informação operacional para clientes externos. O projeto consome
dados de fontes públicas brasileiras (Câmara, Senado, TSE, Portal
da Transparência) em scripts de ingestão paralelos rodando em
GitHub Actions, e expõe parte desses dados em URLs públicas no app
— duas restrições que pressionam a escolha em direções diferentes.

Restrições e forças:

- **Geração distribuída sem coordenação** — scripts de ingestão de
  Câmara e Senado rodam como jobs paralelos no mesmo cron. Não há
  lock global; cada job gera IDs localmente. Sequence centralizado
  no Postgres seria gargalo de I/O em jobs longos.
- **Performance de B-tree no Postgres** — PK aleatória (UUID v4)
  causa page splits frequentes em índices ordenados, degrada
  locality em queries de paginação por inserção, infla o cache de
  páginas.
- **Opacidade pública** — IDs aparecem em URLs (`/parlamentar/<id>`,
  `/proposicao/<id>`). Sequence inteiro revela cardinalidade total
  da tabela e taxa de crescimento — informação operacional
  desnecessária pra cidadão acessar dado público.
- **Ordenação natural por inserção** — queries de "últimas
  proposições", "últimos gastos" são padrão. Se a PK já carrega
  ordenação temporal, evita-se índice secundário em
  `created_at`/`ingested_at`.

UUID v7, especificado pelo RFC 9562 (julho 2024), atende as quatro
forças simultaneamente: 48 bits de timestamp Unix em milissegundos
como prefixo + 74 bits aleatórios. Mantém a semântica opaca do v4,
mas o prefixo temporal o torna k-sortable — registros inseridos em
proximidade temporal ficam adjacentes no B-tree.

O Postgres ainda não tem `gen_random_uuid_v7()` nativo (em
discussão para versões futuras); a extensão `pgcrypto` gera apenas
v4. A geração é portanto feita em userland via pacote `uuidv7`.

## Decisão

Toda tabela de domínio nos bounded contexts (`parlamentares`,
`proposicoes`, `votacoes`, `gastos`) usa UUID v7 como chave
primária, gerado em userland pela função `uuidv7()`:

```typescript
import { uuidv7 } from 'uuidv7'

export const parlamentar = parlamentaresSchema.table('parlamentar', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  // ...
})
```

A função fica no `$defaultFn` do Drizzle, executada client-side
antes do INSERT. Não há fallback em SQL — o ORM é o único produtor
de IDs.

Dependência: `uuidv7@^1.2.1` (registrada em `package.json`).

## Alternativas Consideradas

### UUID v4 (aleatório)

- **Prós**: nativo em Postgres via `gen_random_uuid()` (extensão
  `pgcrypto`); opaco como v7; sem dependência externa em userland.
- **Contras**: distribuição uniforme causa page splits frequentes
  em B-tree; queries de "últimos N registros" precisam de índice
  secundário em `ingested_at`; locality ruim em cache de páginas
  para workloads write-heavy como ingestão CEAP (57k+ rows em
  batch).
- **Veredicto**: descartado. A perda de performance em índices
  ordenados não compensa o ganho de não depender de userland —
  sobretudo porque a lib `uuidv7` é minúscula e seu escopo é
  trivial de reimplementar a partir do RFC.

### BIGSERIAL (sequence inteiro de 8 bytes)

- **Prós**: menor footprint (8 bytes vs 16); nativo do Postgres;
  debug humano trivial (`id=42`); B-tree ideal por ser sequencial.
- **Contras**: vaza cardinalidade total e taxa de crescimento via
  URLs públicas (atacante pode estimar volume da base); requer
  round-trip ou bloco de IDs reservado para geração distribuída;
  cria gargalo lógico nos jobs de ingestão paralelos; conflitos em
  multi-master/replicação futura.
- **Veredicto**: descartado. O vazamento via URL é problema
  operacional permanente e a coordenação distribuída cria
  complexidade desproporcional para o ganho de 8 bytes/PK.

### ULID

- **Prós**: também k-sortable com prefixo temporal (48 bits ms + 80
  bits aleatórios); textualmente menor (26 chars Crockford base32
  vs 36 chars UUID); legível em logs.
- **Contras**: não é tipo nativo do Postgres — precisa armazenar
  como `bytea`, `text` ou `uuid` (com mapping manual); ferramentas
  de inspeção (pgAdmin, Drizzle Studio) reconhecem UUID
  nativamente, não ULID; vantagem de "textualmente menor" some
  quando o transporte for JSON e o consumidor trabalhar com
  strings.
- **Veredicto**: descartado por marginalia operacional. UUID v7
  entrega as mesmas garantias k-sortable com tipo nativo `uuid` no
  Postgres e suporte universal nas ferramentas.

## Consequências

### Positivas

- **B-tree saudável em índices de PK** — inserções recentes ficam
  adjacentes; menos page splits; melhor cache locality em
  workloads write-heavy de ingestão.
- **Ordenação natural por inserção** — queries de "últimas N
  proposições", "gastos recentes" podem usar `ORDER BY id DESC`
  sem índice secundário em coluna de tempo.
- **Geração distribuída sem coordenação** — jobs paralelos de
  ingestão (Câmara + Senado simultâneos) geram IDs localmente sem
  risco de colisão.
- **Opacidade pública preservada** — URLs `/parlamentar/<uuid>`
  não revelam cardinalidade nem taxa de crescimento.
- **Compatível com schema por bounded context (ADR-013)** — UUIDs
  são globalmente únicos; FKs cross-schema funcionam sem prefixo
  de namespace na chave.

### Negativas

- **16 bytes por PK vs 8 do BIGSERIAL** — overhead permanente de
  armazenamento. Em escala atual (~57k rows em `gastos.gasto`),
  custo é desprezível; reavaliar se tabelas crescerem para
  dezenas de milhões.
- **Dependência de pacote `uuidv7` em userland** — atualização
  ocasional, risco de abandono. Mitigado por escopo mínimo da lib
  (gera UUID v7, nada mais) e RFC pública que permite
  reimplementar em horas se necessário.
- **Debug humano menos amigável que ID inteiro** —
  `01956e6f-1234-7abc-9def-...` é menos legível que `id=42` em
  logs e dumps. Mitigação: o prefixo temporal do UUID v7 permite
  identificar ordem de inserção visualmente — rows mais recentes
  começam com prefixo lexicograficamente maior. Não é tão
  amigável quanto IDs inteiros pequenos, mas preserva alguma
  legibilidade temporal sem revealing de cardinalidade.

### Neutras

- **Combina naturalmente com schema por bounded context** (ver
  ADR-013): UUIDs são únicos globalmente, então FK
  `votacoes.voto.parlamentar_id` aponta sem ambiguidade para
  `parlamentares.parlamentar.id` mesmo estando em schemas
  distintos.
- **Migração futura para `gen_random_uuid_v7()` nativo do Postgres**
  (caso seja adicionado em versões futuras) seria transparente —
  basta trocar o `$defaultFn` por `DEFAULT gen_random_uuid_v7()`
  na migration; o tipo `uuid` da coluna não muda.

## Referências

- [RFC 9562 — UUIDs (incluindo v7)](https://www.rfc-editor.org/rfc/rfc9562)
- [Pacote `uuidv7` no npm](https://www.npmjs.com/package/uuidv7)
- `package.json` — entrada `"uuidv7": "^1.2.1"`
- Schemas: `src/modules/parlamentares/domain/schema.ts`,
  `src/modules/proposicoes/domain/schema.ts`,
  `src/modules/votacoes/domain/schema.ts`,
  `src/modules/gastos/domain/schema.ts`
- Migration inicial:
  `src/shared/db/migrations/0000_open_doomsday.sql` (PKs `uuid
  PRIMARY KEY NOT NULL`)
- [Issue #23 — registro de gerência](https://github.com/FabioCaffarello/brasil-a-vera/issues/23)
- [ADR-013 — Schema por bounded context no Postgres](013-schema-por-bounded-context.md)
