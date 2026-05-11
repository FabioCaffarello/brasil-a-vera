# ADR-011: Escolha do Driver Drizzle para o Banco

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-11
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

O Brasil a Vera roda Next.js no Cloudflare Workers (runtime de Workers) — ver
[ADR-009](009-cloudflare-pages.md) — e scripts de ingestão em GitHub Actions
(Node.js 22). O driver de banco escolhido para uso com o Drizzle ORM precisa
funcionar nos dois ambientes sem fork do código de acesso ao banco.

Restrições do ambiente:

- **Workers runtime** (Cloudflare Workers) é V8 isolate, não Node.js. Não tem
  sockets TCP brutos — drivers baseados em TCP (`postgres-js`, `pg`) não
  funcionam. Funcionam apenas drivers que usam HTTP ou WebSocket.
- **Node.js 22** (ingestão) suporta qualquer driver, mas WebSocket nativo só
  existe a partir do Node 22 (e mesmo assim com algumas limitações que tornam
  o polyfill `ws` mais previsível em alguns cenários).
- **Transactions multi-statement** são desejáveis para ingestão composta (várias
  inserts/updates em uma unidade lógica).

O Neon oferece dois drivers compatíveis via `@neondatabase/serverless`:

| Driver Drizzle | Conexão | Transactions | Edge runtime |
|---|---|---|---|
| `drizzle-orm/postgres-js` | TCP socket | Multi-statement | Não |
| `drizzle-orm/neon-serverless` | WebSocket | Multi-statement | Sim |
| `drizzle-orm/neon-http` | HTTP/1 | Single-statement apenas (`db.transaction` falha) | Sim, mais leve |

## Decisão

**Adotamos `drizzle-orm/neon-serverless` com `@neondatabase/serverless`** como
driver único de banco para app e ingestão.

Em Node, o driver precisa de polyfill de `WebSocket` — usamos o pacote `ws` como
`devDependency`. Em Cloudflare Workers, `WebSocket` é nativo e o bloco de
polyfill é eliminado pelo bundler do adapter `@opennextjs/cloudflare`.

Implementação canônica em `src/shared/db/index.ts`:

```typescript
import { neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema'

if (typeof WebSocket === 'undefined') {
  const ws = await import('ws')
  neonConfig.webSocketConstructor = ws.default
}

const globalForDb = globalThis as unknown as { pool: Pool | undefined }

const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL as string })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}

export const db = drizzle(pool, { schema })
```

O singleton de `Pool` é mantido em `globalThis` durante desenvolvimento para
evitar múltiplas conexões em hot reload.

## Alternativas Consideradas

### `drizzle-orm/postgres-js` (driver TCP via `porsager/postgres`)

- **Prós**: maduro, performante em Node, suporta todas as features do
  PostgreSQL incluindo transactions complexas.
- **Contras**: usa TCP sockets, incompatível com Cloudflare Workers runtime.
  Forçaria fork do código de acesso ao banco entre app e ingestão.
- **Veredicto**: descartado por incompatibilidade com Workers.

### `drizzle-orm/neon-http`

- **Prós**: HTTP/1, sem dependência de WebSocket, bundle size menor em Workers,
  setup ligeiramente mais simples.
- **Contras**: limitação fundamental de **single-statement apenas** —
  `db.transaction()` falha em runtime. Operações compostas de ingestão
  (`INSERT` em várias tabelas relacionadas dentro de uma transação) não
  funcionam, criando armadilha latente que só aparece quando a primeira
  transação multi-statement é introduzida.
- **Veredicto**: descartado por essa limitação. A economia de bundle não
  compensa o risco de operações silenciosamente sem garantia atômica.

### Driver `pg` (node-postgres)

- **Prós**: padrão da indústria em Node.
- **Contras**: mesma limitação do `postgres-js` — TCP, incompatível com
  Workers.
- **Veredicto**: descartado pelo mesmo motivo.

## Consequências

### Positivas

- **Código unificado** — `src/shared/db/index.ts` é o único ponto de
  configuração; mesmo módulo funciona em Node (ingestão) e em Workers (app).
- **Transactions multi-statement preservadas** — ingestão pode usar
  `db.transaction()` sem armadilhas.
- **Latência baixa em ambos os ambientes** — WebSocket persistente reduz
  overhead vs. HTTP por query.
- **Compatível com pooled e direct URLs do Neon** — pooled para o app
  (`DATABASE_URL`), direct para o Drizzle Kit gerar migrations (`DIRECT_URL`).

### Negativas

- **Polyfill `ws` como devDependency** — necessário para o runtime Node.
  Pequeno custo de manutenção (atualizações ocasionais).
- **Bundle do Worker ligeiramente mais pesado** — `neon-serverless` carrega mais
  código que `neon-http`. Em termos absolutos, ainda dentro do limite de 1MB
  do bundle do Workers (free).
- **Dependência de `@neondatabase/serverless`** — específico do Neon. Se o
  banco mudar de provedor (improvável dado o ADR-003), o driver precisa ser
  trocado também.

### Neutras

- Em testes de banco, decidiremos entre subir uma instância Postgres real via
  testcontainers e usar o mesmo driver, ou criar um adapter de teste em
  memória. A decisão fica para quando o primeiro teste de DB for escrito.

## Referências

- [Neon — Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Drizzle ORM — Connect with Neon Serverless](https://orm.drizzle.team/docs/connect-neon-serverless)
- [Drizzle ORM — Connect with Neon HTTP](https://orm.drizzle.team/docs/connect-neon)
- [ADR-003 — Banco no Neon](003-database-neon.md)
- [ADR-009 — Deploy em Cloudflare Workers](009-cloudflare-pages.md)
