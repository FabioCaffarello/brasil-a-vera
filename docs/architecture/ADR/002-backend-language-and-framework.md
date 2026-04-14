# ADR-002: Linguagem e Framework do Backend

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-04-14
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

O backend do Brasil a Vera precisa atender requisitos específicos:

- **Ingestão de dados em lote** — sync periódico com APIs oficiais (Câmara, Senado, TSE, Portal da Transparência) com tratamento robusto de falhas, retries e reconciliação
- **API REST de leitura** — servir dados agregados para o frontend e para a API pública (leitura intensa, escrita eventual)
- **Event-driven** — bounded contexts comunicam via domain events (ver [ADR-005](005-event-driven-communication.md))
- **Graph database** — integração nativa com graph database para o Grafo Legislativo (ver [ADR-004](004-graph-database-choice.md))
- **DDD e Clean Architecture** — a linguagem deve suportar modelagem de domínio expressiva com tipos ricos
- **Open-source e vitrine técnica** — o código deve ser referência de qualidade; a linguagem deve ter comunidade ativa e ser acessível a contribuidores
- **Custos de infraestrutura baixos** — projeto open-source sem funding inicial; runtime eficiente é importante

## Decisão

**Adotamos Go (Golang) como linguagem principal do backend**, sem framework monolítico — utilizando bibliotecas compostas:

| Responsabilidade | Biblioteca |
|------------------|------------|
| HTTP routing | `net/http` (stdlib) + router leve (chi ou similar) |
| Serialização JSON | `encoding/json` (stdlib) |
| Acesso a banco relacional | `database/sql` + driver PostgreSQL |
| Acesso a graph database | Driver oficial Neo4j para Go |
| Mensageria / eventos | Client library do broker escolhido (ver [ADR-005](005-event-driven-communication.md)) |
| Configuração | `envconfig` ou similar |
| Logging estruturado | `slog` (stdlib, Go 1.21+) |
| Testes | `testing` (stdlib) + `testify` para assertions |

Organização por bounded context conforme [ADR-001](001-monorepo-strategy.md), cada serviço seguindo:

```
services/parlamentares/
├── cmd/                # entrypoint (main.go)
├── internal/
│   ├── domain/         # entities, value objects, domain events, repository interfaces
│   ├── application/    # use cases / application services
│   ├── ports/          # interfaces (driven + driving)
│   └── adapters/
│       ├── http/       # handlers REST (driving adapter)
│       ├── postgres/   # repositório PostgreSQL (driven adapter)
│       ├── neo4j/      # repositório graph (driven adapter, onde aplicável)
│       └── messaging/  # publisher/subscriber de eventos (driven adapter)
└── go.mod              # módulo Go independente (workspace)
```

## Alternativas Consideradas

### Python (FastAPI / Django)

- **Prós**: ecossistema rico para data science e NLP (útil para Motor de Coerência), grande base de contribuidores, prototipagem rápida
- **Contras**: performance inferior para APIs de leitura intensa, tipagem dinâmica dificulta modelagem de domínio DDD rica, GIL limita concorrência real, custos de runtime maiores
- **Veredicto**: excelente para pipelines de NLP — pode ser usado pontualmente em ingestion pipelines — mas não como linguagem principal do backend

### TypeScript (Node.js / NestJS)

- **Prós**: mesma linguagem no frontend e backend, ecossistema npm vasto, NestJS suporta DDD
- **Contras**: event loop single-threaded requer cuidado com operações CPU-bound, modelagem de domínio menos expressiva que Go (interfaces nominais), overhead de runtime maior
- **Veredicto**: viável, mas Go oferece melhor performance e modelagem mais explícita para o padrão arquitetural escolhido

### Rust

- **Prós**: performance máxima, segurança de memória, sistema de tipos extremamente expressivo
- **Contras**: curva de aprendizado muito íngreme para contribuidores open-source, ecossistema web menos maduro, tempo de desenvolvimento significativamente maior
- **Veredicto**: excelente linguagem, mas a barreira de contribuição é incompatível com o objetivo open-source

### Java / Kotlin (Spring Boot)

- **Prós**: ecossistema enterprise maduro, Spring suporta DDD nativamente, Kotlin é expressivo
- **Contras**: overhead de runtime (JVM), complexidade de configuração Spring, startup lento, imagens Docker grandes
- **Veredicto**: sobredimensionado para o projeto; Go atinge os mesmos objetivos com menos overhead

## Consequências

### Positivas

- **Performance** — Go compila para binário nativo, startup em milissegundos, footprint de memória baixo — ideal para infraestrutura de baixo custo
- **Concorrência nativa** — goroutines e channels facilitam ingestão paralela de múltiplas APIs
- **Tipagem estática + interfaces** — modelagem de domínio explícita; interfaces implícitas facilitam ports & adapters
- **Compilação rápida** — CI builds rápidos mesmo em monorepo
- **Comunidade Go ativa no Brasil** — contribuidores potenciais familiarizados
- **Binários estáticos** — imagens Docker mínimas (scratch/distroless), deploy simples

### Negativas

- **NLP limitado em Go** — o Motor de Coerência pode precisar de componentes Python para classificação de direção de proposições — mitigação: pipeline de ingestão pode ter adapters em Python, comunicando via eventos
- **Generics recentes** — generics em Go são mais limitados que em outras linguagens — mitigação: usar generics onde faz sentido, não forçar abstrações
- **Menos "mágica"** — Go é verboso comparado com frameworks como Spring — mitigação: a verbosidade é intencional e alinhada com explicitação

### Neutras

- Go workspaces (`go.work`) gerenciam o monorepo de forma nativa a partir de Go 1.18
- Python pode coexistir no monorepo para pipelines de NLP sem conflito arquitetural

## Referências

- [Go at Google — Language Design in the Service of Software Engineering](https://go.dev/talks/2012/splash.article)
- [Standard Go Project Layout](https://github.com/golang-standards/project-layout)
- [Clean Architecture in Go](https://github.com/bxcodec/go-clean-arch)
