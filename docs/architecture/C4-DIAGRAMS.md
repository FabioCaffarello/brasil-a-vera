# Diagramas C4

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Nível 1 — Contexto do Sistema](#nível-1--contexto-do-sistema)
- [Nível 2 — Containers](#nível-2--containers)
- [Nível 3 — Componentes (Backend)](#nível-3--componentes-backend)
- [Nível 3 — Componentes (Ingestão)](#nível-3--componentes-ingestão)

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

## Nível 2 — Containers

Componentes de deploy do sistema e como se comunicam.

```mermaid
graph TB
    subgraph "Usuários"
        BROWSER["Browser / Mobile"]
        API_CLIENT["API Client<br/>(desenvolvedores)"]
    end

    subgraph "Brasil a Vera"
        WEB["Web App<br/>(Next.js)<br/>SSR / SSG"]
        
        subgraph "Backend Services (Go)"
            SVC_PARL["Parlamentares<br/>Service"]
            SVC_PROP["Proposições<br/>Service"]
            SVC_VOTA["Votações<br/>Service"]
            SVC_GAST["Gastos<br/>Service"]
            SVC_ELEI["Eleitoral<br/>Service"]
            SVC_COER["Coerência<br/>Service"]
            SVC_GRAF["Grafo<br/>Service"]
        end

        subgraph "API Gateway"
            GW["API Gateway / BFF<br/>Roteamento, auth, rate limit"]
        end

        subgraph "Mensageria"
            NATS["NATS JetStream<br/>Domain Events"]
        end

        subgraph "Persistência"
            PG["PostgreSQL<br/>(core transacional)"]
            NEO["Neo4j<br/>(analytical twin)"]
        end

        subgraph "Ingestão"
            ING["Pipelines de Ingestão<br/>(Go + Python para NLP)"]
        end
    end

    subgraph "Fontes Externas"
        EXT["APIs Oficiais<br/>(Câmara, Senado, TSE, CGU)"]
    end

    BROWSER --> WEB
    WEB --> GW
    API_CLIENT --> GW

    GW --> SVC_PARL
    GW --> SVC_PROP
    GW --> SVC_VOTA
    GW --> SVC_GAST
    GW --> SVC_ELEI
    GW --> SVC_COER
    GW --> SVC_GRAF

    SVC_PARL --> PG
    SVC_PROP --> PG
    SVC_VOTA --> PG
    SVC_GAST --> PG
    SVC_ELEI --> PG
    SVC_COER --> PG
    SVC_GRAF --> NEO

    SVC_PARL --> NATS
    SVC_PROP --> NATS
    SVC_VOTA --> NATS
    NATS --> SVC_COER
    NATS --> SVC_GRAF

    ING --> PG
    EXT --> ING
```

### Descrição dos containers

| Container | Tecnologia | Responsabilidade |
|-----------|-----------|-----------------|
| Web App | Next.js (TypeScript) | Interface web com SSR/SSG, SEO, compartilhamento social |
| API Gateway / BFF | Go (ou NGINX + config) | Roteamento, autenticação de API keys, rate limiting, CORS |
| Backend Services | Go | Um serviço por bounded context, Clean Architecture |
| NATS JetStream | NATS | Message broker para domain events entre bounded contexts |
| PostgreSQL | PostgreSQL 16+ | Core transacional — schema por bounded context |
| Neo4j | Neo4j CE | Grafo legislativo — analytical twin alimentado por eventos |
| Pipelines de Ingestão | Go + Python | Sync com APIs oficiais, normalização, persistência |

## Nível 3 — Componentes (Backend)

Detalhamento interno de um bounded context representativo (Votações). Todos os bounded contexts seguem a mesma estrutura hexagonal (ver [ADR-002](ADR/002-backend-language-and-framework.md)).

```mermaid
graph TB
    subgraph "Votações Service"
        subgraph "Driving Adapters (entrada)"
            HTTP["HTTP Handler<br/>(REST API)"]
            EVT_IN["Event Subscriber<br/>(NATS consumer)"]
        end

        subgraph "Application Layer"
            UC1["RegistrarVotacao<br/>Use Case"]
            UC2["ConsultarVotos<br/>Use Case"]
            UC3["ListarVotacoes<br/>Use Case"]
        end

        subgraph "Domain Layer"
            AGG["Votacao<br/>Aggregate Root"]
            VO["VotoNominal<br/>Value Object"]
            REPO["VotacaoRepository<br/>Interface (Port)"]
            PUB["EventPublisher<br/>Interface (Port)"]
        end

        subgraph "Driven Adapters (saída)"
            PG_REPO["PostgreSQL<br/>Repository"]
            NATS_PUB["NATS<br/>Event Publisher"]
        end
    end

    HTTP --> UC2
    HTTP --> UC3
    EVT_IN --> UC1

    UC1 --> AGG
    UC2 --> REPO
    UC3 --> REPO
    UC1 --> PUB

    AGG --> VO

    REPO -.->|implementa| PG_REPO
    PUB -.->|implementa| NATS_PUB
```

### Fluxo de dados

1. **Ingestão** → Pipeline extrai votações da API da Câmara/Senado e publica evento `VotacaoBrutaExtraida` no NATS
2. **Event Subscriber** → Consome o evento e aciona o use case `RegistrarVotacao`
3. **Use Case** → Valida, cria aggregate `Votacao` com votos nominais, persiste via `VotacaoRepository`
4. **Domain Event** → Após persistir, publica `VotacaoRegistrada` via `EventPublisher`
5. **Consumers externos** → Coerência e Grafo Legislativo consomem `VotacaoRegistrada`
6. **API Query** → HTTP Handler recebe request, aciona use case `ConsultarVotos`, retorna com `trust_level: L1`

## Nível 3 — Componentes (Ingestão)

```mermaid
graph LR
    subgraph "Pipeline Câmara"
        EXT["Extractor<br/>HTTP client + paginação"]
        TRANS["Transformer<br/>Normalização + validação"]
        LOAD["Loader<br/>Upsert PostgreSQL"]
        PUB["Publisher<br/>Domain event"]
    end

    API["Câmara API v2"] --> EXT
    EXT --> TRANS
    TRANS --> LOAD
    LOAD --> PUB

    LOAD --> PG[(PostgreSQL)]
    PUB --> NATS{{NATS JetStream}}
```

Cada pipeline segue o padrão ETL:

| Fase | Responsabilidade |
|------|-----------------|
| **Extract** | Chamada HTTP à API externa com retry, paginação, rate limiting |
| **Transform** | Normalização de encoding (UTF-8), datas (ISO 8601), IDs; validação de schema; enriquecimento com `trust_level: L1` e `source_url` |
| **Load** | Upsert idempotente no PostgreSQL via ID da fonte |
| **Publish** | Publicação de domain event no NATS para consumers downstream |

Detalhes das fontes e estratégia de ingestão em [Fontes de Dados](DATA-SOURCES.md).
