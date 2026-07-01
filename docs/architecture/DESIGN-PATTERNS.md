# Design Patterns — Brasil a Vera

> Brasil a Vera · Arquitetura · v1.0
> Última atualização: 2026-07-01
> Status: accepted

---

Catálogo dos padrões de design em uso no projeto. Todos os padrões aqui listados
estão ativos no código — não são aspiracionais. Para padrões futuros ou especulativos,
ver `docs/future/`.

---

## Índice

1. [Repository Pattern](#1-repository-pattern)
2. [Pure Domain Functions](#2-pure-domain-functions)
3. [Zod Boundary Validation](#3-zod-boundary-validation)
4. [ETL Registry](#4-etl-registry)
5. [Strangler Fig](#5-strangler-fig)
6. [Trust Pyramid](#6-trust-pyramid)
7. [Edge Cache Wrapper](#7-edge-cache-wrapper)
8. [Split Driver](#8-split-driver)
9. [Aggregate Root](#9-aggregate-root)
10. [Compound Component](#10-compound-component)

---

### 1. Repository Pattern

**Categoria**: Arquitetural
**Intenção**: Centralizar todo acesso a dados em `src/lib/queries/`, mantendo Server Components livres de SQL.

**Onde no código**:
- `src/lib/queries/parlamentares.ts` — listagem, perfil, busca por ID
- `src/lib/queries/votacoes.ts` — votações nominais com votos individuais
- `src/lib/queries/proposicoes.ts` — proposições com tramitação e autoria
- `src/lib/queries/gastos.ts` — CEAP por parlamentar e categoria
- `src/lib/aggregators/` — composições de múltiplas queries para um único server component

**Regras de uso**:
- Todo novo acesso ao banco deve ser uma função exportada de `src/lib/queries/`
- Funções de query devem aceitar parâmetros tipados (nunca strings cruas de URL)
- Toda query de leitura deve usar `cached()` (ver padrão 7)
- Queries de escrita não existem na camada app — escrita é responsabilidade de `ingestion/`

**Anti-patterns conhecidos**:
- Chamar `db.select()` diretamente de um Server Component (`src/app/`)
- Duplicar lógica de query em múltiplos componentes
- Passar `searchParams` brutos para dentro de uma query sem validação Zod

---

### 2. Pure Domain Functions

**Categoria**: Arquitetural / Comportamental
**Intenção**: Garantir que toda lógica de negócio seja testável sem banco, HTTP ou Next.js — apenas entrada e saída.

**Onde no código**:
- `src/modules/parlamentar/domain/alinhamento.ts` — calcula índice de alinhamento (votos × orientação de bloco)
- `src/modules/eleitoral/domain/patrimonio.ts` — `buildEvolucao()`, correção IPCA, `buildCamadas()`
- `src/modules/eleitoral/domain/correcao-monetaria.ts` — cálculo de IPCA entre pleitos
- `src/shared/trust/types.ts` — classificadores de trust level

**Regras de uso**:
- Nenhum import de `drizzle-orm`, `pg`, `next/`, `react` em `src/modules/*/domain/`
- Funções recebem dados já validados (pós-Zod) e retornam tipos puros
- Testar via Vitest sem mocks de banco (`npm run test`)
- Se uma função precisar de IO, ela não pertence ao domain — mover para Application

**Anti-patterns conhecidos**:
- Função de domínio que faz `fetch()` ou chama `db.select()`
- Lógica de negócio inline em um Server Component
- Usar `any` ou `as` dentro da camada de domínio

---

### 3. Zod Boundary Validation

**Categoria**: Estrutural / Defensivo
**Intenção**: Todo dado que vem de fora do sistema (API externa, env vars, CSV do TSE, searchParams) é validado por schema Zod antes de tocar qualquer lógica de domínio.

**Onde no código**:
- `ingestion/camara/*/schema.ts` — schema Zod para cada endpoint da API da Câmara
- `ingestion/senado/*/schema.ts` — schema Zod para cada endpoint do Senado
- `ingestion/tse/*/schema.ts` — schema Zod para CSV bulk do TSE
- `src/shared/env.ts` (ou similar) — validação de `process.env` via Zod
- `ingestion/registry.ts` — o próprio registry é validado por Zod

**Regras de uso**:
- `schema.parse()` para dados que devem ter shape garantido (falha fast se inválido)
- `schema.safeParse()` para dados de API externa onde falha parcial é esperada (APIs instáveis)
- Schemas de ingestão vivem em `ingestion/*/schema.ts`, nunca em `src/`
- Schemas de env vivem em `src/shared/` e são importados no bootstrap da aplicação

**Anti-patterns conhecidos**:
- Fazer `as SomeType` sem ter passado por `.parse()` (violação do princípio 6 do CLAUDE.md)
- Validar no componente ao invés de no boundary
- Reusar schemas de ingestão no app (os dois têm contratos distintos)

---

### 4. ETL Registry

**Categoria**: Criacional / Configuração
**Intenção**: `ingestion/registry.ts` é a única fonte de verdade para todos os jobs de ingestão. Os workflows do GitHub Actions geram a matrix dinamicamente — ninguém edita YAMLs manualmente.

**Onde no código**:
- `ingestion/registry.ts` — array `SOURCES` com tipo `IngestionSource` (Zod-validated)
- `.github/workflows/ingestion-daily.yml` — consome `npm run ingest:print-matrix`
- `.github/workflows/ingestion-weekly.yml` — idem
- `.github/workflows/ingestion-monthly.yml` — idem

**Regras de uso**:
- Para adicionar nova fonte: 1 entrada no array `SOURCES`. Sem mudança de YAML.
- Tiers dentro de uma cadência: tier N+1 só roda após todos os tier N completarem
- Ordem padrão: `deputados/senadores (tier 0) → votacoes/proposicoes (tier 1) → backfills (tier 2)`
- Cada script segue o padrão: `schema.ts` (Zod) + `mapper.ts` (puro) + `main.ts` (IO + upsert)

**Anti-patterns conhecidos**:
- Editar `.github/workflows/ingestion-*.yml` diretamente
- Job de ingestão sem entrada no registry (não apareceria na matrix)
- Script de ingestão com lógica de negócio em `main.ts` (pertence em `mapper.ts`)

---

### 5. Strangler Fig

**Categoria**: Arquitetural / Migração
**Intenção**: Substituir gradualmente um sistema legado (primitivas locais, componentes de domínio reinventados) por uma solução superior (RDS), rota a rota ou componente a componente, sem big-bang rewrite.

**Onde no código** (histórico ativo — migração RDS completa):
- `docs/migration/rds-consolidation-plan.md` — playbook da migração
- `scripts/rds-primitive-guard.ts` — guard anti-regressão pós-migração
- `.context/agents/rds-consolidation-curator.md` — agente especializado para futuras consolidações

**Regras de uso**:
- Identificar o "estrangulador" (nova implementação RDS) e o "estrangulado" (implementação local)
- Fazer coexistir os dois temporariamente com um ponto de controle (import path, feature flag ou A/B de rota)
- Mover consumers um a um; deletar o legado quando o último consumer migrou
- Medir fricção em cada balde para ajustar o playbook

**Quando aplicar novamente**:
- Qualquer migração futura de dependência de UI (substituição de lib de charts, etc.)
- Refatoração de módulo de ingestão que precisa mudar schema sem downtime
- Extração de lógica de domínio de Server Components para `src/modules/*/domain/`

**Anti-patterns conhecidos**:
- Big-bang rewrite (trocar tudo de uma vez)
- Manter fork permanente dos dois sistemas (estrangular até o fim ou não começar)
- Fazer a migração sem guard de anti-regressão

---

### 6. Trust Pyramid

**Categoria**: Domínio / Metadado
**Intenção**: Todo dado persistido carrega um `trust_level` (L1–L4) que reflete a distância da fonte primária, permitindo que o sistema e o usuário saibam o quanto confiar em cada informação.

**Onde no código**:
- `src/shared/trust/types.ts` — enum `TrustLevel`, classificadores, textos de disclaimer
- Coluna `trust_level` em todas as tabelas aggregate root: `parlamentar`, `proposicao`, `votacao`, `gasto`, `tse_candidatura`
- Componentes UI exibem disclaimer automático para L3/L4

**Níveis**:

| Nível | Descrição | Exemplos |
|-------|-----------|---------|
| L1 | Dado factual direto da fonte oficial, sem transformação | Votos nominais, texto de proposição, gastos CEAP |
| L2 | Agregação determinística com fórmula pública | Índice de alinhamento, totais de votação |
| L3 | Inferência heurística com incerteza documentada | Vínculo parlamentar → candidatura por CPF (ADR-063), fidelidade partidária |
| L4 | Análise interpretativa, curadoria especializada | "Brasil a Vera Labs" — correlações socioeconômicas |

**Regras de uso**:
- Tabelas filhas (tema, autor, tramitação, voto_nominal) herdam o trust_level da raiz — não duplicam
- L3 e L4 sempre exibem disclaimer em componentes de UI
- Ao criar nova ingestão, declarar explicitamente o trust_level no ADR da feature
- Nunca elevar o trust_level por conveniência (L3 não vira L2 sem metodologia publicada)

**Anti-patterns conhecidos**:
- Persistir dado derivado sem documentar a fórmula (seria L3 disfarçado de L1)
- Omitir disclaimer para L3/L4 no frontend
- Criar coluna `trust_level` em tabela filha (herança da raiz é suficiente)

---

### 7. Edge Cache Wrapper

**Categoria**: Estrutural / Performance
**Intenção**: Toda query de leitura é envelopada por `cached()` de `src/lib/cache.ts`, garantindo cache de edge (Cloudflare CDN) e de app (Next.js) sem cada query precisar gerenciar isso individualmente.

**Onde no código**:
- `src/lib/cache.ts` — implementação de `cached()` (ADR-018)
- `src/lib/queries/*.ts` — todo arquivo de query usa `cached()` na exportação

**Regras de uso**:
- Toda função nova em `src/lib/queries/` usa `cached()`. Exceção deve ser explicitamente justificada no PR.
- `cache: 'no-store'` somente em rotas genuinamente dinâmicas (busca com filtros do usuário, área logada)
- `/api/health` é dinâmico por design — nunca forçar cache neste endpoint
- `revalidate` period definido por tipo de dado: dados legislativos históricos (1h+), perfis ativos (5–15min)

**Anti-patterns conhecidos**:
- Query sem `cached()` (aumenta custo Neon e latência desnecessariamente)
- Cache muito longo em dados que mudam frequentemente (ex: votações em período de sessão)
- Usar `cache: 'force-cache'` sem `revalidate` (dados ficam stale indefinidamente)

---

### 8. Split Driver

**Categoria**: Infraestrutura / Adaptador
**Intenção**: Dois contextos de execução exigem dois drivers de banco distintos. O app roda em Cloudflare Workers (sem WebSockets, sem TCP); os scripts de ingestão rodam em Node.js (com transações multi-statement). O split é explícito e enforçado em build time.

**Onde no código**:
- `src/shared/db/index.ts` — driver `@neondatabase/serverless` (HTTP)
- `ingestion/shared/db.ts` — driver `node-postgres` (TCP)
- `next.config.ts` — `serverExternalPackages` guard contra `pg` no bundle Workers

**Regras de uso**:
- `db.transaction()` **somente** em `ingestion/` — nunca em código que roda no Workers
- Em dev local: `DB_DRIVER=node-postgres` + `DATABASE_URL` apontando para Docker Postgres
- `NODE_ENV !== 'production'` faz dead-code elimination do branch node-postgres no bundle Workers
- Nunca importar `ingestion/shared/db.ts` de dentro de `src/`

**Anti-patterns conhecidos**:
- `db.transaction()` em `src/lib/queries/` (neon-http não suporta)
- Importar `pg` diretamente de `src/` (vaza para o bundle Workers)
- Tentar usar `@neondatabase/serverless` em scripts de ingestão (sem suporte a transações longas)

---

### 9. Aggregate Root

**Categoria**: DDD / Domínio
**Intenção**: Cada bounded context tem um aggregate root que é o ponto de entrada para leitura e escrita do contexto. Tabelas filhas dependem do root e herdam seu `trust_level`.

**Onde no código**:

| Aggregate Root | Tabela Principal | Bounded Context |
|----------------|-----------------|-----------------|
| `Parlamentar` | `parlamentar` | Parlamentares |
| `Proposicao` | `proposicao` | Proposições |
| `Votacao` | `votacao` | Votações |
| `Gasto` | `gasto` | Gastos |
| `Candidatura` | `tse_candidatura` | Eleitoral |

**Colunas obrigatórias em todo aggregate root**:
- `trust_level` — enum L1–L4
- `source_url` — URL da fonte primária
- `ingested_at` — timestamp de ingestão

**Regras de uso**:
- Tabelas filhas (`tema`, `autor`, `tramitacao`, `voto_nominal`, `orientacao`) referenciam o root por FK — nunca duplicam `trust_level`
- Ingestão sempre upsert no root antes de inserir filhos
- Queries de leitura do app partem sempre do aggregate root (nunca de tabela filha diretamente)

**Anti-patterns conhecidos**:
- Tabela filha sem FK para o root
- Query que JOINa diretamente tabelas filhas de contextos diferentes sem passar pelo root
- Ingestão que insere filhos antes do root existir (viola FK constraint)

---

### 10. Compound Component

**Categoria**: Estrutural / UI
**Intenção**: Componentes complexos de UI são decompostos em sub-componentes relacionados que compartilham estado implícito via React Context, permitindo composição flexível sem prop drilling.

**Onde no código**:
- `@fabio.caffarello/react-design-system` — `Card`, `Card.Header`, `Card.Body`, `Card.Footer`
- `src/components/parlamentar/KpiStrip.tsx` — strip de KPIs construído sobre composições RDS
- `src/components/votacao/DrawerVotacoes.tsx` — drawer com sub-componentes para filtros e lista

**Regras de uso**:
- Compound components vivem no RDS (`@fabio.caffarello/react-design-system`), não em `src/design-system/` (ADR-053)
- Componentes de domínio em `src/components/` são construídos *sobre* compound components do RDS — não recriam estrutura de layout
- Gap de componente genérico (necessidade não coberta pelo RDS) vira issue no repo do RDS, não primitiva nova em `src/`

**Anti-patterns conhecidos**:
- Criar compound component local que duplica o que o RDS já oferece (ex: Card com Header/Body local)
- Prop drilling profundo como alternativa a compound component (use Context via RDS)
- Compound component com lógica de domínio embutida (mistura UI com regra de negócio)

---

## Relação com Outros Documentos

- [CLEAN-ARCHITECTURE.md](CLEAN-ARCHITECTURE.md) — camadas e regras de dependência
- [BOUNDED-CONTEXTS.md](BOUNDED-CONTEXTS.md) — mapa de bounded contexts
- [ADR-019](ADR/019-disciplina-arquitetural-sem-gargalo.md) — padrão de disciplina: gargalo antes de novo padrão
- [ADR-053](ADR/053-adocao-camada-compositiva-rds.md) — regra de uso do RDS (Compound Component)
