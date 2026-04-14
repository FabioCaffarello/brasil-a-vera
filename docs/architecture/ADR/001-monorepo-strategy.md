# ADR-001: Estratégia de Monorepo

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

O Brasil a Vera é composto por múltiplos bounded contexts (Parlamentares, Proposições, Votações, Gastos, Eleitoral, Coerência, Grafo Legislativo, Impacto), além de frontend, pipelines de ingestão de dados e infraestrutura. Precisamos decidir como organizar o código-fonte para equilibrar:

- **Coesão de domínio** — cada bounded context deve ser autónomo e ter fronteiras claras
- **Reutilização de código** — shared kernels (Trust Metadata, tipos comuns) devem ser compartilhados sem duplicação
- **Developer experience** — contribuidores open-source devem conseguir entender a estrutura rapidamente
- **CI/CD eficiente** — builds e deploys devem ser incrementais, sem recompilar o que não mudou
- **Consistência de versão** — contratos entre serviços (domain events, DTOs) devem evoluir de forma coordenada

O projeto está no início (Wave 0) com um time pequeno. A complexidade de múltiplos repositórios é prematura, mas a estrutura precisa escalar para waves futuras.

## Decisão

**Adotamos monorepo com estrutura modular por bounded context**, usando workspaces nativos da linguagem/toolchain escolhida (ver [ADR-002](002-backend-language-and-framework.md)).

Estrutura de alto nível:

```
brasil-a-vera/
├── services/              # bounded contexts como módulos independentes
│   ├── parlamentares/
│   ├── proposicoes/
│   ├── votacoes/
│   ├── gastos/
│   ├── eleitoral/
│   ├── coerencia/
│   ├── grafo-legislativo/
│   └── impacto/
├── libs/                  # código compartilhado (shared kernels)
│   ├── trust-metadata/    # vocabulário L1-L4, regras, disclaimers
│   ├── domain-events/     # contratos de eventos entre bounded contexts
│   └── commons/           # tipos utilitários, value objects compartilhados
├── ingestion/             # pipelines de ingestão de dados externos
│   ├── camara/
│   ├── senado/
│   ├── tse/
│   └── transparencia/
├── web/                   # frontend web
├── docs/                  # documentação (este diretório)
├── infra/                 # IaC, docker-compose, scripts de deploy
└── tools/                 # scripts de desenvolvimento, generators
```

Princípios de organização:

- Cada diretório em `services/` segue a mesma estrutura interna (Clean Architecture / hexagonal)
- `libs/` contém apenas código genuinamente transversal — o default é cada serviço ter seu próprio código
- Dependências entre `services/` são estritamente via `libs/domain-events/` (eventos assíncronos), nunca imports diretos
- `ingestion/` adapters são separados dos services porque podem ter ciclos de vida e deploy independentes

## Alternativas Consideradas

### Multi-repo (um repositório por bounded context)

- **Prós**: isolamento total, CI/CD independente por serviço, permissões granulares
- **Contras**: overhead de sincronização de contratos, contribuição open-source mais difícil (forks múltiplos), shared kernels requerem publicação de packages, refactors cross-cutting são dolorosos
- **Veredicto**: complexidade operacional desproporcional para o estágio atual

### Monorepo monolítico (sem separação modular)

- **Prós**: simples no início, sem overhead de workspaces
- **Contras**: fronteiras de bounded context ficam implícitas (não enforceable), coupling cresce silenciosamente, dificulta extração futura de serviços
- **Veredicto**: atalho que compromete a capacidade de escalar a arquitetura

## Consequências

### Positivas

- Contribuidores clonam um único repositório e têm visão completa do sistema
- Refactors que cruzam bounded contexts são atómicos (um PR, um merge)
- Shared kernels (Trust Metadata, domain events) são sempre consistentes — sem versionamento de packages
- CI pode ser configurado para builds incrementais (só rebuilda o que mudou)
- A estrutura de diretórios torna os bounded contexts visíveis e navegáveis

### Negativas

- O repositório crescerá em tamanho — mitigação: `.gitattributes` para large files, shallow clones documentados
- CI precisa de configuração de cache e detecção de mudanças para não ser lento — mitigação: tooling de monorepo (dependendo da stack)
- Risco de coupling acidental entre services se as fronteiras não forem enforce por tooling — mitigação: linting de imports, dependency constraints

### Neutras

- Se no futuro um bounded context precisar de deploy completamente independente, a extração para repo separado é possível mas não trivial

## Referências

- [Monorepo Explained — monorepo.tools](https://monorepo.tools/)
- [Google's Monorepo — Why Google Stores Billions of Lines in a Single Repository](https://research.google/pubs/pub45424/)
