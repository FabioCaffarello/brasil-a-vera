# Estilo de Código

> Brasil a Vera · Contribuição · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Go (Backend)](#go-backend)
- [TypeScript (Frontend)](#typescript-frontend)
- [SQL](#sql)
- [Cypher (Neo4j)](#cypher-neo4j)
- [Geral](#geral)

---

## Go (Backend)

### Formatação

- `gofmt` é obrigatório — código não formatado é rejeitado pelo CI
- `goimports` para organização de imports
- Line length: sem limite rígido, mas manter legibilidade (guia: ~100 caracteres)

### Linting

- **golangci-lint** com configuração do projeto (`.golangci.yml` na raiz)
- Linters habilitados: `errcheck`, `govet`, `staticcheck`, `unused`, `gosimple`, `ineffassign`

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Packages | minúsculas, singular | `parlamentar`, `votacao` |
| Interfaces | sem prefixo `I` | `Repository`, `EventPublisher` |
| Structs | PascalCase | `Parlamentar`, `VotoNominal` |
| Métodos públicos | PascalCase | `FindByID`, `ListByTema` |
| Métodos privados | camelCase | `validateVoto`, `buildQuery` |
| Constantes | PascalCase | `TrustLevelL1`, `CasaCamara` |
| Variáveis | camelCase | `parlamentarID`, `trustLevel` |
| Arquivos | snake_case | `parlamentar_repository.go` |

### Estrutura de bounded context

Seguir estritamente a estrutura hexagonal definida no [ADR-002](../architecture/ADR/002-backend-language-and-framework.md):

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
│       ├── neo4j/    # repositório graph
│       └── messaging/# publisher/subscriber
```

### Regras

- Domínio não importa nada de `adapters/` — nunca
- Use cases recebem interfaces (ports), não implementações concretas
- Erros de domínio são tipos próprios, não `errors.New("string solta")`
- Todo struct que vá para a API carrega `TrustLevel` como campo

## TypeScript (Frontend)

### Formatação

- **Prettier** com configuração do projeto (`.prettierrc`)
- **ESLint** com regras do Next.js + regras customizadas
- Semicolons: sem (Prettier default)
- Quotes: single
- Indentação: 2 espaços

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `TrustBadge`, `ParlamentarCard` |
| Hooks | camelCase com `use` | `useParlamentar`, `useTrustLevel` |
| Utilitários | camelCase | `formatCurrency`, `parseTrustLevel` |
| Tipos/Interfaces | PascalCase | `Parlamentar`, `TrustLevel` |
| Constantes | UPPER_SNAKE_CASE | `TRUST_LEVELS`, `API_BASE_URL` |
| Arquivos de componente | kebab-case | `trust-badge.tsx`, `parlamentar-card.tsx` |
| Arquivos de utilidade | kebab-case | `format-currency.ts` |

### Regras

- TypeScript strict mode obrigatório
- Sem `any` — use `unknown` quando o tipo é realmente desconhecido
- Componentes: prefer function components com React Server Components onde aplicável
- Props tipadas explicitamente (sem `React.FC`)
- Trust level: todo componente que exibe dados deve receber e renderizar `trustLevel`

## SQL

### Convenções

- Palavras-chave em UPPER CASE: `SELECT`, `FROM`, `WHERE`, `JOIN`
- Nomes de tabela e coluna em snake_case: `votos_nominais`, `parlamentar_id`
- Schema por bounded context: `parlamentares.parlamentar`, `votacoes.voto_nominal`
- Migrations nomeadas sequencialmente: `001_create_parlamentares.sql`, `002_create_votacoes.sql`
- Sempre incluir `trust_level` e `source_url` em tabelas L1

## Cypher (Neo4j)

### Convenções

- Labels em PascalCase: `(:Parlamentar)`, `(:Proposicao)`
- Relationship types em UPPER_SNAKE_CASE: `[:CO_VOTACAO]`, `[:MESMO_PARTIDO]`
- Properties em camelCase: `{nome: "...", trustLevel: "L1"}`
- Usar parâmetros (`$paramName`) em vez de interpolação de strings

## Geral

### Commits

Seguir a [Convenção de Commits](COMMIT-CONVENTION.md).

### Documentação no código

- Docstrings em funções públicas (Go: comentário acima da função; TS: JSDoc)
- Sem comentários óbvios — o código deve ser autoexplicativo
- Comentários para "por quê", não para "o quê"
- TODOs com issue number: `// TODO(#123): implementar cache`

### Secrets

- Nunca commite credenciais, API keys ou tokens
- Use variáveis de ambiente
- `.env` está no `.gitignore`
