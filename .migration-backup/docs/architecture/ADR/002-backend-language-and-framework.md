# ADR-002: Linguagem e Framework do Backend — Estratégia em Duas Fases

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-05-11
> Status: proposed

---

> **Atualização (2026-05):** a migração para Go (Fase 2) é especulativa. Não há
> compromisso de implementação. TypeScript permanente é viável e esta é a
> hipótese de trabalho atual. A decisão será revalidada na Wave 3 com dados
> reais de performance, não antes. Status atual: `proposed`.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Fase 1 — TypeScript / Next.js (Waves 0–2)](#fase-1--typescript--nextjs-waves-02)
- [Fase 2 — Go Microserviços (Wave 3+)](#fase-2--go-microserviços-wave-3)
- [Critérios de Migração TypeScript → Go](#critérios-de-migração-typescript--go)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O backend do Brasil a Vera precisa atender requisitos específicos:

- **Ingestão de dados em lote** — sync periódico com APIs oficiais (Câmara, Senado, TSE, Portal da Transparência) com tratamento robusto de falhas, retries e reconciliação
- **API REST de leitura** — servir dados agregados para o frontend e para a API pública (leitura intensa, escrita eventual)
- **DDD e Clean Architecture** — a linguagem deve suportar modelagem de domínio expressiva com tipos ricos
- **Open-source e vitrine técnica** — o código deve ser referência de qualidade; a linguagem deve ter comunidade ativa e ser acessível a contribuidores
- **Custos de infraestrutura zero** — projeto open-source sem funding inicial; deploy no free tier do Cloudflare Workers + Neon
- **Velocidade de desenvolvimento** — equipe pequena precisa iterar rápido nas Waves 0/1

A tensão principal é entre **velocidade de entrega no curto prazo** (TypeScript + Next.js, free tier) e **performance/escalabilidade no longo prazo** (Go, binários estáticos, concorrência nativa). A solução é uma estratégia em duas fases.

## Decisão

**Adotamos uma estratégia em duas fases**, conforme o padrão Monolith First (ver [ADR-007](007-monolith-first-strategy.md)):

| Fase | Waves | Linguagem | Runtime | Deploy |
|------|-------|-----------|---------|--------|
| 1 | 0–2 | TypeScript | Next.js (monolito modular) | Cloudflare Workers |
| 2 | 3+ | Go | Microserviços extraídos via Strangler Fig | VPS + Caddy |

## Fase 1 — TypeScript / Next.js (Waves 0–2)

O monolito Next.js serve tanto o frontend (SSR/SSG) quanto a API (Route Handlers). Cada bounded context é um módulo isolado em `src/modules/<contexto>/`.

### Stack TypeScript

| Responsabilidade | Biblioteca |
|------------------|------------|
| Framework full-stack | Next.js (App Router, React Server Components) |
| Linguagem | TypeScript (strict mode) |
| Acesso a banco | Drizzle ORM (para queries apenas — migrations em SQL puro) |
| Validação | Zod |
| Estilização | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Testes | Vitest + React Testing Library |
| Linting e formatação | Biome (lint + format unificados) |
| Pre-commit | Husky |

### Estrutura de um bounded context (TypeScript)

```
src/modules/votacoes/
├── domain/
│   ├── types.ts          # Votacao, VotoNominal, TipoVoto (interfaces)
│   ├── events.ts         # VotacaoRegistrada (interface de domain event)
│   └── errors.ts         # erros de domínio tipados
├── repository/
│   ├── interface.ts      # VotacaoRepository (interface / port)
│   └── postgres.ts       # implementação PostgreSQL via Drizzle
├── service/
│   └── votacao-service.ts  # lógica de negócio (use cases)
└── routes/
    └── route.ts          # Next.js Route Handler (/api/votacoes/*)
```

### Justificativa da Fase 1

- **Custo zero** — Cloudflare Workers free tier + Neon free tier = ~R$3,30/mês (só domínio)
- **Velocidade** — uma linguagem para frontend e backend; sem overhead de integração
- **Read-heavy workload** — o Brasil a Vera é majoritariamente leitura; Next.js + PostgreSQL é fit natural
- **SSR/SSG** — SEO e compartilhamento social resolvidos nativamente

## Fase 2 — Go Microserviços (Wave 3+)

Na Wave 3, módulos são extraídos do monolito Next.js para microserviços Go via Strangler Fig. Um API Gateway (Caddy) roteia requests para o serviço correto.

### Stack Go

| Responsabilidade | Biblioteca |
|------------------|------------|
| HTTP routing | `net/http` (stdlib) + router leve (chi ou similar) |
| Serialização JSON | `encoding/json` (stdlib) |
| Acesso a banco relacional | `database/sql` + driver PostgreSQL |
| Mensageria / eventos | NATS client (`nats.go`) — ver [ADR-005](../../future/adr/005-event-driven-communication.md) |
| Configuração | `envconfig` ou similar |
| Logging estruturado | `slog` (stdlib, Go 1.21+) |
| Testes | `testing` (stdlib) + `testify` para assertions |

### Estrutura de um bounded context (Go)

```
services/votacoes/
├── cmd/                # entrypoint (main.go)
├── internal/
│   ├── domain/         # entities, value objects, domain events, repository interfaces
│   ├── application/    # use cases / application services
│   ├── ports/          # interfaces (driven + driving)
│   └── adapters/
│       ├── http/       # handlers REST (driving adapter)
│       ├── postgres/   # repositório PostgreSQL (driven adapter)
│       └── messaging/  # publisher/subscriber NATS (driven adapter)
└── go.mod              # módulo Go independente
```

### Justificativa da Fase 2

- **Performance** — Go compila para binário nativo, startup em milissegundos, footprint de memória baixo
- **Concorrência nativa** — goroutines e channels facilitam ingestão paralela e processamento de eventos
- **Tipagem estática + interfaces** — modelagem de domínio explícita; interfaces implícitas facilitam ports & adapters
- **Binários estáticos** — imagens Docker mínimas (scratch/distroless), deploy simples em VPS

## Critérios de Migração TypeScript → Go

Um módulo só é extraído do monolito para Go quando **ao menos um** dos seguintes critérios é atingido:

1. **Latência mensurável impactando SLA** — o módulo é gargalo de performance comprovado com métricas
2. **Deploy independente necessário** — dois devs precisam deployar o mesmo módulo independentemente
3. **Dependência de runtime diferente** — o módulo precisa de Python (NLP) ou processamento CPU-bound incompatível com serverless

**Sequência recomendada de extração**: Votações (maior volume de dados) → Parlamentares → Proposições → Gastos → Coerência

Antes de atingir esses critérios, **não migrar**. Complexidade prematura é o risco maior.

## Alternativas Consideradas

### TypeScript permanente (sem migração para Go)

- **Prós**: simplicidade, uma única linguagem para sempre, sem custo de migração
- **Contras**: limitações de performance em processamento CPU-bound (NLP, análise de grafo), event loop single-threaded requer cuidado, Node.js runtime maior
- **Veredicto**: viável para Waves 0–2; a decisão de nunca migrar seria prematura — melhor deixar a porta aberta

### Go desde o início (microserviços)

- **Prós**: performance máxima, arquitetura final desde o dia 1
- **Contras**: custo de infraestrutura (VPS necessário, sem free tier), overhead de CI/CD para múltiplos serviços sem usuários, tempo de desenvolvimento maior com equipe pequena
- **Veredicto**: overhead de infra e desenvolvimento desproporcional para Wave 0 sem usuários para validar hipóteses

### Python (FastAPI / Django)

- **Prós**: ecossistema rico para data science e NLP, grande base de contribuidores, prototipagem rápida
- **Contras**: performance inferior para APIs de leitura intensa, tipagem dinâmica dificulta modelagem de domínio DDD rica, GIL limita concorrência real
- **Veredicto**: excelente para pipelines de NLP — pode ser usado pontualmente na Wave 3 — mas não como linguagem principal do backend

### Rust

- **Prós**: performance máxima, segurança de memória, sistema de tipos extremamente expressivo
- **Contras**: curva de aprendizado muito íngreme para contribuidores open-source, ecossistema web menos maduro, tempo de desenvolvimento significativamente maior
- **Veredicto**: excelente linguagem, mas a barreira de contribuição é incompatível com o objetivo open-source

### Java / Kotlin (Spring Boot)

- **Prós**: ecossistema enterprise maduro, Spring suporta DDD nativamente, Kotlin é expressivo
- **Contras**: overhead de runtime (JVM), complexidade de configuração Spring, startup lento, imagens Docker grandes
- **Veredicto**: sobredimensionado para o projeto

## Consequências

### Positivas

- **Custo zero nas Waves 0/1** — Cloudflare Workers + Neon free tier viabiliza o projeto sem funding
- **Velocidade de desenvolvimento** — uma linguagem (TypeScript) para todo o stack nas Waves 0/1
- **Porta aberta para Go** — a estrutura modular do monolito (domain/repository/service/routes) mapeia diretamente para a estrutura hexagonal do Go
- **Migrations compatíveis** — SQL puro (não gerado por ORM) funciona com qualquer linguagem de backend
- **Comunidade** — TypeScript e Go têm comunidades ativas no Brasil

### Negativas

- **Duas linguagens no longo prazo** — durante a migração (Wave 3), o sistema terá módulos TypeScript e Go coexistindo — mitigação: Strangler Fig é incremental, cada módulo é independente
- **NLP limitado em TypeScript** — classificação de direção de proposições pode precisar de Python na Wave 3 — mitigação: pipeline de ingestão pode ter scripts Python, comunicando via banco

### Neutras

- Python pode coexistir no monorepo para pipelines de NLP sem conflito arquitetural (Wave 3+)
- A decisão final sobre Go vs. TypeScript permanente será tomada na Wave 3 com dados reais de performance

## Referências

- [Monolith First — Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
- [Strangler Fig Application — Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Go at Google — Language Design in the Service of Software Engineering](https://go.dev/talks/2012/splash.article)
- [Clean Architecture in Go](https://github.com/bxcodec/go-clean-arch)
