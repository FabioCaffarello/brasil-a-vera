# Brasil a Vera

Plataforma de transparência legislativa brasileira — acompanhe parlamentares, votações, proposições e gastos da Câmara e do Senado.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (porta 8080)
- `pnpm --filter @workspace/brasil-a-vera run dev` — frontend Vite (porta dinâmica)
- `pnpm run typecheck` — typecheck em todos os pacotes
- `pnpm run build` — typecheck + build completo
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas Zod a partir da spec OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar mudanças de schema no banco (só dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter (SPA)
- API: Express 5 + pino logger
- DB: PostgreSQL (Neon) + Drizzle ORM
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir de spec OpenAPI)
- Build: esbuild (bundle CJS)

## Where things live

- `artifacts/brasil-a-vera/` — frontend React/Vite SPA
  - `src/App.tsx` — roteador wouter com todas as rotas
  - `src/pages/` — 11 páginas (home, parlamentares, parlamentar, votacoes, votacao, proposicoes, proposicao, busca, partido, comparar, docs)
  - `src/components/` — componentes reutilizáveis por domínio
  - `src/lib/queries/` — type stubs browser-safe (sem IO de banco)
- `artifacts/api-server/` — Express API server
  - `src/routes/` — rotas por domínio (parlamentares, votacoes, proposicoes, partidos, busca)
- `lib/db/` — pacote compartilhado de banco
  - `src/schema/` — schemas Drizzle (parlamentares, votacoes, proposicoes, gastos)
  - `src/index.ts` — instância do pool e db
- `lib/api-client-react/src/generated/api.ts` — hooks React Query gerados por Orval

## Architecture decisions

- Schema do banco usa múltiplos PostgreSQL schemas (`parlamentares`, `votacoes`, `proposicoes`, `gastos`) para separação de domínio
- Frontend usa stubs de tipo em `lib/queries/` para satisfazer imports de componentes sem importar código de servidor
- `NEON_DATABASE_URL` tem prioridade sobre `DATABASE_URL` (Replit Postgres) — permite usar Neon em dev e prod
- Rota `/api/parlamentares/comparar` é remapeada para `/api/parlamentares/comparar/resultado` no router principal

## Product

- Lista e perfil de parlamentares com filtros por casa/partido/UF
- Votações nominais com breakdown por partido e votos individuais
- Proposições com tramitação, autores e temas
- Busca full-text por nome, ementa ou referência (PL 1234/2025)
- Comparativo lado a lado de 2–3 parlamentares
- Alinhamento partidário e afinidade de voto entre parlamentares
- Gastos parlamentares (CEAP) com resumo por categoria

## User preferences

- Usar Neon como banco de dados principal (via `NEON_DATABASE_URL`)
- Manter Cloudflare como CDN/proxy quando disponível

## Gotchas

- `DATABASE_URL` é gerenciado pelo Replit e não pode ser sobrescrito via código — usar `NEON_DATABASE_URL` para apontar ao Neon
- `SELECT DISTINCT` com `ORDER BY` em expressão PostgreSQL exige que a expressão esteja no `SELECT` — usar `GROUP BY` em vez disso
- Todos os imports de `Link` do wouter devem ser named: `import { Link } from 'wouter'` (não default)
- As queries de banco ficam no `api-server`, nunca no frontend

## Pointers

- Ver skill `pnpm-workspace` para estrutura do workspace, TypeScript e detalhes dos pacotes
