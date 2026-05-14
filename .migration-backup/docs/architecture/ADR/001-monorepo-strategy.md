# ADR-001: Estratégia de Monorepo

> Brasil a Vera · Arquitetura · v0.2
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
- **Consistência de versão** — contratos entre módulos (domain events, DTOs) devem evoluir de forma coordenada

O projeto está no início (Wave 0) com um time pequeno. A complexidade de múltiplos repositórios é prematura, mas a estrutura precisa escalar para waves futuras.

## Decisão

**Adotamos monorepo com estrutura modular por bounded context.** Nas Waves 0–2, o monolito Next.js organiza módulos em `src/modules/`. Na Wave 3+, módulos Go extraídos vivem em `services/` no mesmo monorepo (ver [ADR-007](007-monolith-first-strategy.md)).

Estrutura de alto nível:

```
brasil-a-vera/
├── src/                       # monolito Next.js (Waves 0–2)
│   ├── app/                   # App Router — pages e API routes
│   ├── modules/               # bounded contexts como módulos TypeScript
│   │   ├── parlamentares/
│   │   │   ├── domain/        # types, interfaces
│   │   │   ├── repository/    # interface + implementação PostgreSQL
│   │   │   ├── service/       # lógica de negócio
│   │   │   └── routes/        # Next.js Route Handlers
│   │   ├── proposicoes/
│   │   ├── votacoes/
│   │   ├── gastos/
│   │   ├── eleitoral/
│   │   └── coerencia/
│   ├── shared/                # código compartilhado (shared kernels)
│   │   ├── db/                # conexão PostgreSQL, migrations SQL puras
│   │   ├── trust/             # vocabulário L1-L4, regras, disclaimers
│   │   └── domain-events/     # contratos de eventos (TypeScript interfaces)
│   └── components/            # componentes React
├── ingestion/                 # scripts TypeScript de ingestão (GitHub Actions)
│   ├── camara/
│   ├── senado/
│   ├── tse/
│   └── transparencia/
├── services/                  # microserviços Go extraídos (Wave 3+)
│   └── (vazio até a Wave 3)
├── docs/                      # documentação (este diretório)
└── infra/                     # IaC, docker-compose, scripts de deploy
```

Princípios de organização:

- Cada diretório em `src/modules/` segue a mesma estrutura interna (domain, repository, service, routes) — Clean Architecture aplicada ao TypeScript
- `src/shared/` contém apenas código genuinamente transversal — o default é cada módulo ter seu próprio código
- Dependências entre `src/modules/` são bloqueadas via Biome `noRestrictedImports` — nenhum módulo importa implementação de outro, apenas tipos do shared kernel
- `ingestion/` scripts são TypeScript standalone, executados no GitHub Actions (nunca em Cloudflare Workers) — ver [ADR-007](007-monolith-first-strategy.md)
- Na Wave 3+, módulos extraídos para Go entram em `services/` seguindo a estratégia Strangler Fig — o monorepo acomoda ambas as linguagens simultaneamente

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
- Na Wave 3+, o mesmo monorepo acomoda módulos TypeScript e Go side-by-side durante a migração Strangler Fig

### Negativas

- O repositório crescerá em tamanho — mitigação: `.gitattributes` para large files, shallow clones documentados
- Risco de coupling acidental entre modules se as fronteiras não forem enforce por tooling — mitigação: Biome `noRestrictedImports` configurado no CI desde o dia 1

### Neutras

- Se no futuro um bounded context precisar de deploy completamente independente, a extração para repo separado é possível mas não trivial

## Referências

- [Monorepo Explained — monorepo.tools](https://monorepo.tools/)
- [Google's Monorepo — Why Google Stores Billions of Lines in a Single Repository](https://research.google/pubs/pub45424/)
- [Monolith First — Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
