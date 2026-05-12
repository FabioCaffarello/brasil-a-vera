# ADR-015: Split de driver Neon por runtime

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-12
> Status: accepted (amends [ADR-011](011-database-driver.md))

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Limitações reconhecidas](#limitações-reconhecidas)
- [Referências](#referências)

---

## Contexto

O ADR-011 registrou em 2026-05-11 a escolha de
`drizzle-orm/neon-serverless` (Pool com WebSocket) como driver
**único** de banco para app (Cloudflare Workers) e ingestão (Node
22). A decisão era teoricamente sólida: um único módulo de acesso,
transactions multi-statement preservadas em ambos os runtimes,
polyfill `ws` em Node e WebSocket nativo em Workers.

No primeiro deploy de produção da Wave 1, sob tráfego concorrente,
o app começou a retornar 500 com a mensagem do runtime:

```
Cannot perform I/O on behalf of a different request. I/O objects
(such as streams, request/response bodies, and others) created in
the context of one request handler cannot be accessed from a
different request's context.
```

Diagnóstico empírico (PR #20, fix(db): use neon-http driver no app
Cloudflare Workers):

- O singleton de `Pool` mantido em `globalThis` foi criado durante
  o processamento de uma request específica.
- Workers usa V8 isolates: I/O objects (incluindo o WebSocket
  interno do Pool) ficam **amarrados ao request handler que os
  criou**.
- Toda request subsequente que tentasse reutilizar aquele Pool
  hits o erro acima. Cache de Pool entre requests no Workers, em
  qualquer forma, **viola contrato fundamental do runtime** — é
  configuração proibida, não otimização ausente.

A hipótese original de ADR-011 — "Pool singleton + polyfill `ws`
funciona em Workers" — foi falsificada por comportamento real do
runtime sob carga concorrente. O ADR-011 estava certo sobre
Drizzle, sobre rejeitar `postgres-js`/`pg`, e sobre exigir driver
compatível com Workers. Estava errado sobre Pool persistente.

A correção empírica em produção foi imediata: trocar o app por
`drizzle-orm/neon-http` (fetch sem WebSocket; sem singleton; cada
request abre conexão via fetch e fecha). Ingestão Node ficou em
`drizzle-orm/neon-serverless` + Pool, porque (a) Pool em Node não
viola contrato algum, (b) ingestão usa transactions multi-statement
no padrão DELETE+INSERT (ADR-014), que `neon-http` não suporta.

## Decisão

Driver Neon é dividido por runtime, com dois pontos de
configuração:

- **App (Cloudflare Workers)** — `src/shared/db/index.ts` usa
  `drizzle-orm/neon-http` sobre `neon()` do
  `@neondatabase/serverless`. Cada request abre conexão via fetch
  e fecha; não há objeto de I/O persistente cross-request.
- **Ingestão (Node 22)** — `ingestion/shared/db.ts` usa
  `drizzle-orm/neon-serverless` com `Pool` e polyfill `ws`. Pool
  persistente é seguro em Node e habilita transactions
  multi-statement que ADR-014 exige.

O **schema Drizzle (`src/shared/db/schema.ts`) é compartilhado**
entre os dois drivers; só o módulo de conexão diverge.

## Alternativas Consideradas

### Manter Pool com WebSocket em ambos (decisão original do ADR-011)

- **Prós**: único módulo de acesso; um caminho de código a
  manter; transactions funcionam em ambos.
- **Contras**: **falsificada empiricamente em produção** — Pool
  singleton em Workers viola o contrato de I/O isolation e quebra
  sob concorrência. Não é trade-off; é configuração proibida pelo
  runtime.
- **Veredicto**: descartado pela realidade. ADR-011 carrega nota
  de amendamento explícita registrando a falsificação.

### `neon-http` em ambos os runtimes

- **Prós**: driver único; bundle menor em Workers; sem polyfill
  `ws`.
- **Contras**: `neon-http` é single-statement apenas —
  `db.transaction()` falha em runtime. Quebra o padrão de
  idempotência da ingestão (ADR-014: DELETE+INSERT atômico) e o
  princípio 5 do CLAUDE.md ("DELETE-by-key + INSERT dentro de uma
  transação quando a substituição é em massa").
- **Veredicto**: descartado. Atomicidade na ingestão não é
  negociável — perdê-la abre porta para janelas parcialmente
  apagadas se um INSERT falhar depois de um DELETE.

### Mover ingestão para Workers Cron

- **Prós**: tudo em Workers; um runtime só.
- **Contras**: Workers Cron tem CPU limit de 30s (paid) ou 10ms
  (free) — incompatível com ingestão CEAP (dezenas de milhares
  de rows); ainda preso ao `neon-http`, então perde transactions.
- **Veredicto**: descartado. Nenhum ganho, perda concreta de
  transactions.

### Abandonar Drizzle e voltar a SQL cru

- **Veredicto**: descartado por over-reaction. O problema é o
  driver Neon, não o ORM; jogar fora type-safety de schemas e
  queries para resolver issue de runtime de driver é troca
  perdedora.

## Consequências

### Positivas

- **App Workers funciona sob concorrência real** — sem violação
  de I/O isolation; cada request é independente.
- **Transactions multi-statement preservadas na ingestão** —
  DELETE+INSERT em uma transação continua disponível, mantendo
  ADR-014 viável.
- **Schema Drizzle único** — `src/shared/db/schema.ts` é
  compartilhado; apenas o módulo de conexão diverge.
- **Bundle do Worker mais leve** — `neon-http` é mais enxuto que
  `neon-serverless`, ajuda no limite de 1MB do plano free.

### Negativas

- **Dois drivers para manter** — atualizações de
  `@neondatabase/serverless` afetam dois caminhos; revisões de
  versão checam compatibilidade em duas frentes.
- **Divergência semântica sutil** — pool, timeouts, retry e
  reconexão diferem entre `neon-http` e `neon-serverless`
  (detalhado na seção Limitações reconhecidas).
- **`neon-http` no app é limitado a single-statement** — se
  alguma feature do app precisar de transação composta, é sinal
  para repensar (provavelmente é trabalho de ingestão, não de
  app). Não é problema hoje porque o app é read-only.

### Neutras

- **`@neondatabase/serverless` continua sendo a única dependência
  de driver** — apenas dois caminhos de import
  (`drizzle-orm/neon-http` e `drizzle-orm/neon-serverless`) ambos
  vindos do mesmo pacote base.

## Limitações reconhecidas

**Testcontainers (issue #22, próximo do roadmap Wave 2.0) executa
contra Postgres real via driver `neon-serverless`.** Isso valida
a camada de queries Drizzle e o schema SQL, mas **não exercita o
caminho `neon-http` do Worker no nível de driver**. Diferenças
semânticas sutis entre os dois drivers (comportamento de pool,
retry, timeout, parsing de erros) ficam fora da cobertura de
testes integrados.

Contribuidores que mexerem em `src/shared/db/index.ts` precisam
**validar empiricamente em Worker preview/produção, não apenas em
testes locais**. Princípio 13 do CLAUDE.md (validação empírica
para decisões de cache/performance/runtime behavior) aplica-se
diretamente aqui: o próprio ADR-015 nasce de uma hipótese teórica
de ADR-011 que só foi falsificada quando exercitada em runtime
real.

## Referências

- `src/shared/db/index.ts` (driver app — neon-http)
- `ingestion/shared/db.ts` (driver ingestão — neon-serverless +
  Pool)
- [PR #20 — fix(db): use neon-http driver no app Cloudflare Workers](https://github.com/FabioCaffarello/brasil-a-vera/pull/20)
  (correção empírica)
- [Issue #34 — registro de gerência](https://github.com/FabioCaffarello/brasil-a-vera/issues/34)
- [ADR-011 — Escolha do Driver Drizzle para o Banco](011-database-driver.md)
  (decisão original, amendada por este ADR)
- [ADR-014 — Idempotência sem chave natural única](014-idempotency-without-natural-key.md)
  (depende de transactions multi-statement na ingestão)
- [ADR-009 — Deploy em Cloudflare Workers](009-cloudflare-pages.md)
- [CLAUDE.md princípio 5](../../../CLAUDE.md) (idempotência da
  ingestão — DELETE+INSERT em transação) e princípio 13
  (validação empírica antes de implementação)
- [Cloudflare Workers — I/O isolation](https://developers.cloudflare.com/workers/observability/errors/)
- [Neon — Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
