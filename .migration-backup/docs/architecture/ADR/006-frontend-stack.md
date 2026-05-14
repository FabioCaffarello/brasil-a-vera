# ADR-006: Stack do Frontend e Monolito Full-Stack

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-04-14
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Estrutura de Módulos no Serving Layer](#estrutura-de-módulos-no-serving-layer)
- [Deploy em Cloudflare Workers](#deploy-em-cloudflare-workers)
- [Import Boundaries (Biome)](#import-boundaries-biome)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O frontend do Brasil a Vera precisa atender personas com perfis distintos (ver [Personas](../../product/PERSONAS.md)):

- **Cidadão Consciente** — mobile-first, quer respostas rápidas, compartilha em redes sociais
- **Jornalista Investigativo** — desktop-first, precisa de tabelas densas, exports e citação
- **Ativista/ONG** — monitoramento contínuo, dashboards temáticos

Requisitos técnicos:

- **SEO** — páginas de parlamentar e proposição devem ser indexáveis
- **Performance percebida** — first contentful paint rápido, especialmente em mobile 3G/4G
- **Trust level visual** — cada dado renderiza seu trust_level (L1-L4) com tratamento visual diferenciado
- **Acessibilidade** — WCAG 2.1 AA mínimo
- **Compartilhamento social** — cards OG/Twitter ricos para cada página de parlamentar
- **Custo zero** — deploy no free tier do Cloudflare Workers nas Waves 0/1 (ver [ADR-009](009-cloudflare-pages.md))

Adicionalmente, a decisão Monolith First (ver [ADR-007](007-monolith-first-strategy.md)) estabelece que o Next.js serve **tanto o frontend quanto a API** nas Waves 0–2.

## Decisão

**Adotamos Next.js (App Router) com TypeScript como monolito full-stack** — servindo frontend (SSR/SSG) e API (Route Handlers) no mesmo deploy.

| Camada | Tecnologia | Status na Wave 1 |
|--------|-----------|------------------|
| Framework | Next.js 16 (App Router, React Server Components) | em uso |
| Linguagem | TypeScript (strict mode) | em uso |
| Estilização | Tailwind CSS 4 | em uso |
| Componentes UI | Componentes próprios mínimos com Tailwind | em uso (ver nota) |
| Acesso a banco | Drizzle ORM (queries type-safe; migrations em SQL puro) | em uso |
| Validação | Zod | em uso |
| Visualização de grafo | React Flow | planejado Wave 3 |
| Gráficos | Recharts ou Nivo (baseados em D3) | quando necessário (sem uso atual) |
| Estado do cliente | React Server Components puros | em uso (zero `use client` no projeto) |
| Testes | Vitest + React Testing Library | em uso |
| Linting e formatação | Biome (lint + format unificados) | em uso |
| Pre-commit | Husky | em uso |

> **Nota sobre UI components:** a versão original deste ADR previa shadcn/ui
> (componentes copiados, não dependency). Durante a Wave 1 optamos por
> componentes próprios mínimos diretamente em Tailwind — sem shadcn,
> sem libs de UI. Vale rever quando o design system amadurecer; até lá, ver
> regra em `CLAUDE.md` ("NÃO use shadcn/ui sem antes consultar").
>
> **Estado client-side:** a stack lista Zustand para estado complexo, mas
> não foi necessário ainda (RSC + form GET resolvem busca, filtros e
> navegação). Reintroduzir só se aparecer feature interativa que não cabe
> em URL.

### Estrutura de diretórios

```
src/
├── app/                              # App Router
│   ├── layout.tsx                    # layout raiz
│   ├── page.tsx                      # home
│   ├── parlamentares/
│   │   ├── page.tsx                  # listagem / busca
│   │   └── [id]/
│   │       ├── page.tsx              # página 360° do parlamentar
│   │       ├── votacoes/
│   │       ├── gastos/
│   │       └── coerencia/
│   ├── proposicoes/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── grafo/                        # Wave 3
│   │   └── page.tsx
│   └── api/                          # API Route Handlers (backend)
│       ├── parlamentares/
│       │   └── [...slug]/route.ts    # chama src/modules/parlamentares/
│       ├── votacoes/
│       │   └── [...slug]/route.ts    # chama src/modules/votacoes/
│       ├── proposicoes/
│       ├── gastos/
│       └── coerencia/
├── modules/                          # bounded contexts (backend)
│   ├── parlamentares/
│   │   ├── domain/
│   │   ├── repository/
│   │   ├── service/
│   │   └── routes/
│   ├── votacoes/
│   ├── proposicoes/
│   ├── gastos/
│   └── coerencia/
├── shared/
│   ├── db/                           # conexão PostgreSQL, migrations SQL
│   ├── trust/                        # TrustLevel types, shared kernel
│   └── domain-events/                # contratos de eventos (interfaces)
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── trust/                        # componentes de trust_level
│   │   ├── trust-badge.tsx
│   │   ├── trust-disclaimer.tsx
│   │   └── trust-wrapper.tsx
│   ├── parlamentar/
│   ├── votacao/
│   └── grafo/
└── lib/
    └── trust.ts                      # utilidades de trust_level
```

**Regra**: API routes mapeiam 1:1 com bounded contexts. `/api/parlamentares/*` só chama `src/modules/parlamentares/`. Zero lógica de negócio nas pages — pages e components usam React Server Components para buscar dados via módulos, ou chamam API routes.

### Renderização por Trust Level

| Trust Level | Renderização |
|-------------|-------------|
| L1 — Dados Brutos | Exibição direta, badge verde sutil, link para fonte oficial |
| L2 — Agregações | Exibição direta, badge azul, link para fórmula/metodologia |
| L3 — Correlações | Seção visualmente separada, disclaimer permanente não dispensável, badge amarelo |
| L4 — Impacto | Sub-brand "Brasil a Vera Labs", identidade visual distinta, badge laranja |

## Estrutura de Módulos no Serving Layer

Cada bounded context vive em `src/modules/<contexto>/` com a mesma organização interna (ver [ADR-002](002-backend-language-and-framework.md)):

- **`domain/`** — types, interfaces, erros de domínio. Zero dependência de infraestrutura.
- **`repository/`** — interface (port) + implementação PostgreSQL via Drizzle.
- **`service/`** — lógica de negócio (use cases). Recebe repositórios por injeção (interfaces).
- **`routes/`** — Next.js Route Handlers que delegam para o service.

Esta estrutura mapeia diretamente para a estrutura hexagonal do Go (Wave 3+), facilitando a extração via Strangler Fig.

## Deploy em Cloudflare Workers

Detalhes da escolha em [ADR-009](009-cloudflare-pages.md). O Next.js é processado
pelo adapter `@opennextjs/cloudflare`, que gera um Worker em `.open-next/worker.js`
mais um bundle de assets, deployado no edge da Cloudflare via Wrangler.

### Free tier (Waves 0/1)

| Recurso | Limite |
|---------|--------|
| Bandwidth | Ilimitado |
| Workers requests | 100.000/dia |
| Builds | 500/mês |
| Build time | 20 min por build (free) |
| Workers CPU time | 10ms por request (free) / 50ms (paid) |

### Limitações importantes

- **Sem processo persistente** — Workers encerram após retornar o response. Não há equivalente confiável a background tasks para jobs longos. Por isso, **ingestão roda no GitHub Actions, nunca em Cloudflare Workers** (ver [ADR-007](007-monolith-first-strategy.md) e [ADR-009](009-cloudflare-pages.md)).
- **Spending limit** — mesmo com upgrade para Workers Paid ($5/mês), configurar billing alerts na Cloudflare para evitar surpresas.
- **CPU time por request** — limite de 10ms (free) ou 50ms (paid) por request. Operações pesadas devem ir para GitHub Actions ou Workers separados.
- **Server Actions** — comportamento de Server Actions em Workers runtime difere em alguns aspectos de runtimes Node — consultar docs do adapter antes de adotar.

### Stack complementar

| Componente | Serviço | Tier |
|-----------|---------|------|
| PostgreSQL | Neon | Free (3GB) |
| CDN/proxy | Cloudflare (nativo no Pages) | Free |
| Object storage | Cloudflare R2 | Free (10GB) |
| Domínio | Registro.br | ~R$3,30/mês |

## Import Boundaries (Biome)

Biome `noRestrictedImports` é configurado no dia 1 para bloquear imports cruzados entre módulos:

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

Esta regra é executada no CI via `biome ci .` — PRs que violam boundaries são bloqueados automaticamente.

## Alternativas Consideradas

### SvelteKit

- **Prós**: performance superior (menos JavaScript), sintaxe mais simples, SSR nativo
- **Contras**: comunidade menor no Brasil, ecossistema de componentes menos maduro
- **Veredicto**: tecnicamente excelente, mas pool de contribuidores React no Brasil é significativamente maior

### Astro + React Islands

- **Prós**: zero JS by default, islands architecture ideal para conteúdo estático
- **Contras**: interatividade complexa (grafo, filtros dinâmicos) requer muitas islands
- **Veredicto**: bom para sites de conteúdo, mas o Brasil a Vera é mais aplicação do que site

### Remix

- **Prós**: web standards first, data loading elegante, nested routes
- **Contras**: ecossistema menor que Next.js, deploy no Cloudflare Workers menos integrado
- **Veredicto**: filosoficamente interessante, mas Next.js tem vantagem prática em ecossistema

### SPA puro (React + Vite) + API Go separada

- **Prós**: separação clara frontend/backend, deploy independente
- **Contras**: sem SSR (SEO comprometido), requer hosting separado para API Go (custo), preview de links sociais requer serviço extra
- **Veredicto**: incompatível com custo zero e requisito de SEO nas Waves 0/1

## Consequências

### Positivas

- **SEO garantido** — SSR/SSG para todas as páginas públicas
- **Custo zero** — Cloudflare Workers free tier é suficiente para Waves 0/1 (bandwidth ilimitado)
- **Performance** — React Server Components reduzem JavaScript no cliente; ISR para páginas diárias
- **Monolito full-stack** — frontend e API no mesmo deploy, sem overhead de integração
- **Compartilhamento social** — OG images dinâmicas por parlamentar
- **Trust level nativo** — componente `TrustBadge` reutilizável em toda a UI
- **Import boundaries** — Biome `noRestrictedImports` garante isolamento de bounded contexts desde o dia 1
- **Pre-commit hooks** — Husky executa `biome check` nos arquivos staged antes de cada commit, evitando que erros de lint cheguem ao CI

### Negativas

- **Bundle size** — React + Next.js têm footprint maior que Svelte/Astro — mitigação: RSC reduz JS no cliente
- **Sem background tasks** — Cloudflare Workers não suportam processos persistentes — mitigação: ingestão no GitHub Actions
- **Monolito no curto prazo** — todo o sistema em um único deploy — mitigação: modularização interna permite extração futura via Strangler Fig

### Neutras

- Na Wave 3+, quando módulos Go forem extraídos, o Next.js se torna apenas o frontend + módulos não migrados, com Caddy como gateway na frente
- React Flow para o grafo interativo (Wave 3) é adequado para ~600 nós. Se expandir para assembleias estaduais (Wave 4+), reavaliar Sigma.js (WebGL) com dados reais de performance.

## Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Cloudflare Workers — Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [@opennextjs/cloudflare — adapter](https://github.com/opennextjs/opennextjs-cloudflare)
- [shadcn/ui](https://ui.shadcn.com/)
- [Biome — Linter e Formatter unificado](https://biomejs.dev/)
- [Biome — noRestrictedImports](https://biomejs.dev/linter/rules/no-restricted-imports/)
- [Husky — Git hooks](https://typicode.github.io/husky/)
- [React Flow](https://reactflow.dev/)
