# ADR-006: Stack do Frontend e Monolito Full-Stack

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-04-14
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Estrutura de Módulos no Serving Layer](#estrutura-de-módulos-no-serving-layer)
- [Deploy na Vercel](#deploy-na-vercel)
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
- **Custo zero** — deploy no free tier da Vercel nas Waves 0/1

Adicionalmente, a decisão Monolith First (ver [ADR-007](007-monolith-first-strategy.md)) estabelece que o Next.js serve **tanto o frontend quanto a API** nas Waves 0–2.

## Decisão

**Adotamos Next.js (App Router) com TypeScript como monolito full-stack** — servindo frontend (SSR/SSG) e API (Route Handlers) no mesmo deploy.

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js (App Router, React Server Components) |
| Linguagem | TypeScript (strict mode) |
| Estilização | Tailwind CSS |
| Componentes UI | shadcn/ui (components copiados, não dependency) |
| Acesso a banco | Drizzle ORM (queries type-safe; migrations em SQL puro) |
| Validação | Zod |
| Visualização de grafo | React Flow (Wave 3) |
| Gráficos | Recharts ou Nivo (baseados em D3) |
| Estado do cliente | React Server Components + `use` hook; Zustand para estado client-side complexo |
| Testes | Vitest + React Testing Library |
| Linting e formatação | Biome (lint + format unificados) |
| Pre-commit | Husky |

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

## Deploy na Vercel

### Free tier (Waves 0/1)

| Recurso | Limite |
|---------|--------|
| Bandwidth | 100GB/mês |
| Serverless functions | 100GB-hours/mês |
| Build time | 6.000 min/mês |
| Edge functions | 500.000 invocações/mês |

### Limitações importantes

- **Sem processo persistente** — serverless functions encerram após retornar o response. Background tasks via `waitUntil()` têm timeout de 60s e sem garantia de execução. Por isso, **ingestão roda no GitHub Actions, nunca na Vercel** (ver [ADR-007](007-monolith-first-strategy.md)).
- **Spending limit** — configurar spending limit de $0 na Vercel para evitar cobranças acidentais.
- **Cold starts** — serverless functions podem ter cold starts de ~500ms. Mitigação: ISR para páginas populares.

### Stack complementar

| Componente | Serviço | Tier |
|-----------|---------|------|
| PostgreSQL | Supabase | Free (500MB) |
| CDN/proxy | Cloudflare | Free |
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
- **Contras**: ecossistema menor que Next.js, deploy na Vercel menos integrado
- **Veredicto**: filosoficamente interessante, mas Next.js tem vantagem prática em ecossistema

### SPA puro (React + Vite) + API Go separada

- **Prós**: separação clara frontend/backend, deploy independente
- **Contras**: sem SSR (SEO comprometido), requer hosting separado para API Go (custo), preview de links sociais requer serviço extra
- **Veredicto**: incompatível com custo zero e requisito de SEO nas Waves 0/1

## Consequências

### Positivas

- **SEO garantido** — SSR/SSG para todas as páginas públicas
- **Custo zero** — Vercel free tier é suficiente para Waves 0/1
- **Performance** — React Server Components reduzem JavaScript no cliente; ISR para páginas diárias
- **Monolito full-stack** — frontend e API no mesmo deploy, sem overhead de integração
- **Compartilhamento social** — OG images dinâmicas por parlamentar
- **Trust level nativo** — componente `TrustBadge` reutilizável em toda a UI
- **Import boundaries** — Biome `noRestrictedImports` garante isolamento de bounded contexts desde o dia 1
- **Pre-commit hooks** — Husky executa `biome check` nos arquivos staged antes de cada commit, evitando que erros de lint cheguem ao CI

### Negativas

- **Bundle size** — React + Next.js têm footprint maior que Svelte/Astro — mitigação: RSC reduz JS no cliente
- **Sem background tasks** — Vercel não suporta processos persistentes — mitigação: ingestão no GitHub Actions
- **Monolito no curto prazo** — todo o sistema em um único deploy — mitigação: modularização interna permite extração futura via Strangler Fig

### Neutras

- Na Wave 3+, quando módulos Go forem extraídos, o Next.js se torna apenas o frontend + módulos não migrados, com Caddy como gateway na frente
- React Flow para o grafo interativo (Wave 3) é adequado para ~600 nós. Se expandir para assembleias estaduais (Wave 4+), reavaliar Sigma.js (WebGL) com dados reais de performance.

## Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Vercel Free Tier Limits](https://vercel.com/docs/accounts/plans)
- [shadcn/ui](https://ui.shadcn.com/)
- [Biome — Linter e Formatter unificado](https://biomejs.dev/)
- [Biome — noRestrictedImports](https://biomejs.dev/linter/rules/no-restricted-imports/)
- [Husky — Git hooks](https://typicode.github.io/husky/)
- [React Flow](https://reactflow.dev/)
