# Estilo de Código

> Brasil a Vera · Contribuição · v0.2
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [TypeScript (Monolito + Ingestão)](#typescript-monolito--ingestão)
- [Import Boundaries (Biome)](#import-boundaries-biome)
- [Pre-commit (Husky)](#pre-commit-husky)
- [Migrations SQL](#migrations-sql)
- [SQL (Queries)](#sql-queries)
- [Wave 3+: Go (Microserviços)](#wave-3-go-microserviços)
- [Wave 3+: Cypher / Graph Database](#wave-3-cypher--graph-database)
- [Geral](#geral)

---

## TypeScript (Monolito + Ingestão)

TypeScript é a linguagem principal nas Waves 0–2 — para o monolito Next.js e para os scripts de ingestão. Ver [ADR-002](../architecture/ADR/002-backend-language-and-framework.md).

### Formatação e Linting

- **Biome** como ferramenta unificada de lint + format (substitui ESLint + Prettier)
- Configuração em `biome.json` na raiz do projeto
- Semicolons: sem (`asNeeded`)
- Quotes: single
- Indentação: 2 espaços
- Rodar localmente: `npm run check` (equivalente a `biome check .`)
- Rodar só lint: `npm run lint`
- Rodar só format: `npm run format`

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `TrustBadge`, `ParlamentarCard` |
| Hooks | camelCase com `use` | `useParlamentar`, `useTrustLevel` |
| Services | PascalCase (classe) | `VotacaoService`, `ParlamentarService` |
| Interfaces de domínio | PascalCase | `Parlamentar`, `Votacao`, `TrustLevel` |
| Interfaces de repositório | PascalCase com sufixo | `VotacaoRepository` |
| Route Handlers | `route.ts` no diretório correspondente | `app/api/votacoes/route.ts` |
| Utilitários | camelCase | `formatCurrency`, `parseTrustLevel` |
| Constantes | UPPER_SNAKE_CASE | `TRUST_LEVELS`, `API_BASE_URL` |
| Arquivos de componente | kebab-case | `trust-badge.tsx`, `parlamentar-card.tsx` |
| Arquivos de domínio | kebab-case | `types.ts`, `errors.ts`, `events.ts` |

### Estrutura de módulo (bounded context)

Seguir estritamente a estrutura definida no [ADR-002](../architecture/ADR/002-backend-language-and-framework.md):

```
src/modules/<contexto>/
├── domain/
│   ├── types.ts          # interfaces de domínio (Votacao, VotoNominal, etc.)
│   ├── events.ts         # interfaces de domain events
│   └── errors.ts         # erros de domínio tipados
├── repository/
│   ├── interface.ts      # interface do repositório (port)
│   └── postgres.ts       # implementação PostgreSQL (Drizzle)
├── service/
│   └── <contexto>-service.ts  # lógica de negócio (use cases)
└── routes/
    └── route.ts          # Next.js Route Handler
```

### Regras

- TypeScript strict mode obrigatório
- Sem `any` — use `unknown` quando o tipo é realmente desconhecido
- Componentes React: prefer function components com React Server Components onde aplicável
- Props tipadas explicitamente (sem `React.FC`)
- Trust level: todo componente que exibe dados deve receber e renderizar `trustLevel`
- Domínio (`domain/`) não importa nada de `repository/` ou `routes/` — nunca
- Services recebem interfaces (ports), não implementações concretas
- Erros de domínio são classes tipadas, não `throw new Error('string solta')`
- Todo tipo que vá para a API inclui `trustLevel: TrustLevel` como campo

### Shared Kernel (Trust Metadata)

```typescript
// src/shared/trust/types.ts — exemplo de referência
export type TrustLevel = 'L1' | 'L2' | 'L3' | 'L4'

export interface TrustMetadata {
  trustLevel: TrustLevel
  sourceUrl?: string
  formulaUrl?: string
  disclaimer?: string
}
```

Todos os módulos importam de `@/shared/trust/` — nunca redefinem tipos de trust level.

## Import Boundaries (Biome)

Biome `noRestrictedImports` é configurado no dia 1 e executado no CI. Bloqueia imports cruzados entre módulos:

```json
// biome.json (trecho)
{
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": [
              {
                "name": "@/modules/votacoes",
                "importNames": [],
                "message": "Bounded contexts não podem importar uns dos outros. Use shared kernel em @/shared/."
              },
              {
                "name": "@/modules/parlamentares",
                "importNames": [],
                "message": "Bounded contexts não podem importar uns dos outros. Use shared kernel em @/shared/."
              }
            ]
          }
        }
      }
    }
  }
}
```

**PRs que violam import boundaries são bloqueados automaticamente pelo CI via `biome ci .`.**

## Pre-commit (Husky)

O projeto usa [Husky](https://typicode.github.io/husky/) para executar verificações automaticamente antes de cada commit. O hook roda `biome check` apenas nos arquivos staged — não no projeto inteiro — mantendo o pre-commit rápido.

O Husky é ativado automaticamente ao rodar `npm install` (via script `prepare`). Nenhum passo adicional de configuração é necessário.

Se o pre-commit falhar, o commit é bloqueado. Corrija os erros reportados pelo Biome e tente novamente.

```bash
# Para verificar manualmente o que o pre-commit checaria:
npx biome check $(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx|json)$' | tr '\n' ' ')
```

## Migrations SQL

Migrations são **SQL puro**, nunca geradas por ORM. Isso garante compatibilidade com Go na migração futura (Wave 3+).

### Convenções

- Localização: `src/shared/db/migrations/`
- Nomeação: `NNN_descricao.sql` (ex: `001_create_parlamentares.sql`, `002_create_votacoes.sql`)
- Cada migration cria tabelas no schema do bounded context: `CREATE TABLE parlamentares.parlamentar (...)`
- Sempre incluir `trust_level` e `source_url` em tabelas L1
- Up e down na mesma file (separados por `-- migrate:down`)
- Executadas via script npm: `npm run db:migrate`

### Exemplo

```sql
-- 001_create_parlamentares.sql

CREATE SCHEMA IF NOT EXISTS parlamentares;

CREATE TABLE parlamentares.parlamentar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       TEXT NOT NULL UNIQUE,
    nome            TEXT NOT NULL,
    partido_sigla   TEXT NOT NULL,
    uf              CHAR(2) NOT NULL,
    casa            TEXT NOT NULL CHECK (casa IN ('CAMARA', 'SENADO')),
    trust_level     TEXT NOT NULL DEFAULT 'L1' CHECK (trust_level IN ('L1','L2','L3','L4')),
    source_url      TEXT NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:down
DROP TABLE IF EXISTS parlamentares.parlamentar;
DROP SCHEMA IF EXISTS parlamentares;
```

## SQL (Queries)

### Convenções

- Palavras-chave em UPPER CASE: `SELECT`, `FROM`, `WHERE`, `JOIN`
- Nomes de tabela e coluna em snake_case: `votos_nominais`, `parlamentar_id`
- Schema por bounded context: `parlamentares.parlamentar`, `votacoes.voto_nominal`
- Sempre incluir `trust_level` e `source_url` em tabelas L1
- Nenhum JOIN cross-schema — se precisar de dados de outro contexto, use a interface de serviço

## Wave 3+: Go (Microserviços)

Quando módulos forem extraídos para Go (ver [ADR-002](../architecture/ADR/002-backend-language-and-framework.md)), aplicam-se as seguintes regras:

### Formatação

- `gofmt` obrigatório — código não formatado é rejeitado pelo CI
- `goimports` para organização de imports

### Linting

- **golangci-lint** com configuração do projeto (`.golangci.yml`)
- Linters: `errcheck`, `govet`, `staticcheck`, `unused`, `gosimple`, `ineffassign`

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Packages | minúsculas, singular | `parlamentar`, `votacao` |
| Interfaces | sem prefixo `I` | `Repository`, `EventPublisher` |
| Structs | PascalCase | `Parlamentar`, `VotoNominal` |
| Arquivos | snake_case | `parlamentar_repository.go` |

### Estrutura

```
services/<contexto>/
├── cmd/main.go
├── internal/
│   ├── domain/       # entities, VOs, eventos, interfaces de repositório
│   ├── application/  # use cases
│   ├── ports/        # interfaces (driving + driven)
│   └── adapters/
│       ├── http/     # handlers REST
│       ├── postgres/ # repositório
│       └── messaging/# publisher/subscriber NATS
```

## Wave 3+: Cypher / Graph Database

Quando o graph database for introduzido (Apache AGE ou Neo4j — ver [ADR-004](../architecture/ADR/004-graph-database-choice.md)):

- Labels em PascalCase: `(:Parlamentar)`, `(:Proposicao)`
- Relationship types em UPPER_SNAKE_CASE: `[:CO_VOTACAO]`, `[:MESMO_PARTIDO]`
- Properties em camelCase: `{nome: "...", trustLevel: "L1"}`
- Usar parâmetros em vez de interpolação de strings

## Geral

### Commits

Seguir a [Convenção de Commits](COMMIT-CONVENTION.md).

### Documentação no código

- JSDoc em funções públicas de services e repositórios
- Sem comentários óbvios — o código deve ser autoexplicativo
- Comentários para "por quê", não para "o quê"
- TODOs com issue number: `// TODO(#123): implementar cache`

### Secrets

- Nunca commite credenciais, API keys ou tokens
- Use variáveis de ambiente
- `.env` está no `.gitignore`
