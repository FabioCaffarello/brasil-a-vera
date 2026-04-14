# Diagramas C4

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Nível 1 — Contexto do Sistema](#nível-1--contexto-do-sistema)
- [Nível 2 — Containers (Waves 0–2)](#nível-2--containers-waves-02)
- [Nível 3 — Componentes (Módulo Backend)](#nível-3--componentes-módulo-backend)
- [Nível 3 — Componentes (Ingestão)](#nível-3--componentes-ingestão)
- [Nível 2 — Containers (Wave 3+)](#nível-2--containers-wave-3)

---

## Nível 1 — Contexto do Sistema

Visão de alto nível: quem usa o Brasil a Vera e com que sistemas externos ele se integra.

```mermaid
graph TB
    subgraph Usuários
        CID["Cidadão Consciente<br/>(mobile-first, busca simples)"]
        JOR["Jornalista Investigativo<br/>(cruzamento de dados, export)"]
        ATI["Ativista / ONG<br/>(monitoramento temático)"]
        DEV["Desenvolvedor Cívico<br/>(API REST, webhooks)"]
        PES["Pesquisador Acadêmico<br/>(bulk download, séries)"]
    end

    BAV["Brasil a Vera<br/>Plataforma de Transparência Legislativa"]

    subgraph Fontes Oficiais
        CAM["Câmara dos Deputados<br/>API v2 (REST JSON)"]
        SEN["Senado Federal<br/>API (REST JSON/XML)"]
        TSE["TSE<br/>Dados Abertos (CSV)"]
        CGU["Portal da Transparência<br/>API (REST JSON)"]
    end

    subgraph "Fontes Complementares (L3/L4)"
        IBGE["IBGE"]
        IPEA["IPEA Data"]
    end

    CID --> BAV
    JOR --> BAV
    ATI --> BAV
    DEV --> BAV
    PES --> BAV

    BAV --> CAM
    BAV --> SEN
    BAV --> TSE
    BAV --> CGU
    BAV -.-> IBGE
    BAV -.-> IPEA
```

## Nível 2 — Containers (Waves 0–2)

Componentes de deploy do sistema durante as Waves 0–2 (monolito Next.js).

```mermaid
graph TB
    subgraph "Usuários"
        BROWSER["Browser / Mobile"]
        API_CLIENT["API Client<br/>(desenvolvedores)"]
    end

    subgraph "Vercel"
        NEXT["Next.js Monolito<br/>(TypeScript)<br/>Frontend SSR/SSG +<br/>API Route Handlers"]
    end

    subgraph "Supabase"
        PG["PostgreSQL<br/>(schema por bounded context)"]
    end

    subgraph "GitHub Actions"
        ING["Scripts de Ingestão<br/>(TypeScript)"]
    end

    subgraph "Cloudflare"
        CF["CDN / Proxy<br/>(cache, DDoS)"]
        R2["R2 Object Storage<br/>(backups, bulk downloads)"]
    end

    subgraph "Fontes Externas"
        EXT["APIs Oficiais<br/>(Câmara, Senado, TSE, CGU)"]
    end

    BROWSER --> CF
    API_CLIENT --> CF
    CF --> NEXT
    NEXT --> PG
    ING --> PG
    EXT --> ING
```

### Descrição dos containers (Waves 0–2)

| Container | Tecnologia | Responsabilidade |
|-----------|-----------|-----------------|
| Next.js Monolito | TypeScript, Vercel | Frontend SSR/SSG + API Route Handlers. Módulos internos por bounded context em `src/modules/` |
| PostgreSQL | Supabase (free tier) | Core transacional — schema por bounded context. Trust level em todas as tabelas |
| Scripts de Ingestão | TypeScript (`tsx`), GitHub Actions | Sync periódico com APIs oficiais. Executados via cron workflows, nunca na Vercel |
| CDN / Proxy | Cloudflare (free) | Cache, DDoS protection, SSL |
| Object Storage | Cloudflare R2 (free) | Backups, bulk downloads (Wave 2) |

> **Wave 3+**: módulos Go são extraídos do monolito via Strangler Fig. Um API Gateway (Caddy) na frente roteia requests entre Next.js e os microserviços Go. NATS JetStream é introduzido para domain events. Ver diagrama abaixo.

## Nível 3 — Componentes (Módulo Backend)

Detalhamento interno de um bounded context representativo (Votações) no monolito Next.js. Todos os bounded contexts seguem a mesma estrutura (ver [ADR-002](ADR/002-backend-language-and-framework.md)).

```mermaid
graph TB
    subgraph "Módulo Votações (src/modules/votacoes/)"
        subgraph "Routes (entrada)"
            HTTP["Route Handler<br/>(app/api/votacoes/route.ts)"]
        end

        subgraph "Service Layer"
            UC1["registrarVotacao()"]
            UC2["consultarVotos()"]
            UC3["listarVotacoes()"]
        end

        subgraph "Domain Layer"
            AGG["Votacao<br/>(domain types)"]
            VO["VotoNominal<br/>(domain types)"]
            EVT["VotacaoRegistrada<br/>(domain event interface)"]
            REPO_IF["VotacaoRepository<br/>(interface / port)"]
        end

        subgraph "Repository (saída)"
            PG_REPO["PostgreSQL<br/>Repository (Drizzle)"]
        end
    end

    HTTP --> UC2
    HTTP --> UC3

    UC1 --> AGG
    UC1 --> EVT
    UC2 --> REPO_IF
    UC3 --> REPO_IF

    AGG --> VO

    REPO_IF -.->|implementa| PG_REPO
```

### Fluxo de dados

1. **Ingestão** → Script TypeScript no GitHub Actions extrai votações da API da Câmara/Senado e persiste no PostgreSQL
2. **Service** → Módulo Coerência chama `VotacaoService.consultarVotos()` via interface de serviço (chamada de função síncrona no monolito)
3. **API Query** → Route Handler recebe request, aciona service `consultarVotos()`, retorna com `trust_level: L1`
4. **Wave 3+** → O service publica `VotacaoRegistrada` no NATS em vez de ser chamado diretamente

## Nível 3 — Componentes (Ingestão)

```mermaid
graph LR
    subgraph "GitHub Actions Workflow"
        subgraph "Pipeline Câmara (TypeScript)"
            EXT["Extractor<br/>fetch + paginação"]
            TRANS["Transformer<br/>Normalização + validação"]
            LOAD["Loader<br/>Upsert PostgreSQL"]
        end
    end

    API["Câmara API v2"] --> EXT
    EXT --> TRANS
    TRANS --> LOAD

    LOAD --> PG[(PostgreSQL<br/>Supabase)]
```

Cada pipeline segue o padrão ETL:

| Fase | Responsabilidade |
|------|-----------------|
| **Extract** | Chamada HTTP à API externa com retry, paginação, rate limiting |
| **Transform** | Normalização de encoding (UTF-8), datas (ISO 8601), IDs; validação com Zod; enriquecimento com `trust_level: L1` e `source_url` |
| **Load** | Upsert idempotente no PostgreSQL via ID da fonte |

Scripts executados via `tsx` (TypeScript runner). Schedules configurados no GitHub Actions workflow (ver [Fontes de Dados](DATA-SOURCES.md)).

## Nível 2 — Containers (Wave 3+)

Visão futura quando os primeiros módulos Go são extraídos via Strangler Fig.

```mermaid
graph TB
    subgraph "Usuários"
        BROWSER["Browser / Mobile"]
        API_CLIENT["API Client"]
    end

    subgraph "VPS (Hostinger)"
        CADDY["Caddy<br/>(API Gateway)"]
        GO_SVC["Go Services<br/>(módulos extraídos)"]
        NATS["NATS JetStream<br/>(domain events)"]
    end

    subgraph "Vercel"
        NEXT["Next.js<br/>(frontend + módulos restantes)"]
    end

    subgraph "Supabase"
        PG["PostgreSQL"]
    end

    BROWSER --> CADDY
    API_CLIENT --> CADDY
    CADDY -->|"módulos migrados"| GO_SVC
    CADDY -->|"restante"| NEXT
    GO_SVC --> PG
    GO_SVC <--> NATS
    NEXT --> PG
```

Detalhes da estratégia de migração no [ADR-007](ADR/007-monolith-first-strategy.md).
