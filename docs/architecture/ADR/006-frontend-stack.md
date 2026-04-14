# ADR-006: Stack do Frontend

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

O frontend do Brasil a Vera precisa atender personas com perfis distintos (ver [Personas](../../product/PERSONAS.md)):

- **Cidadão Consciente** — mobile-first, quer respostas rápidas, compartilha em redes sociais
- **Jornalista Investigativo** — desktop-first, precisa de tabelas densas, exports e citação
- **Ativista/ONG** — monitoramento contínuo, dashboards temáticos

Requisitos técnicos:

- **SEO** — páginas de parlamentar e proposição devem ser indexáveis (link compartilhado no WhatsApp/Twitter deve ter preview rico)
- **Performance percebida** — first contentful paint rápido, especialmente em mobile com conexão 3G/4G
- **Visualizações interativas** — grafo legislativo (Wave 3), gráficos de gastos, timeline de votações
- **Trust level visual** — cada dado renderiza seu trust_level (L1-L4) com tratamento visual diferenciado
- **Acessibilidade** — WCAG 2.1 AA mínimo
- **Compartilhamento social** — cards OG/Twitter ricos para cada página de parlamentar
- **Open-source friendly** — stack conhecida por contribuidores brasileiros

## Decisão

**Adotamos Next.js (App Router) com TypeScript como framework frontend.**

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js (App Router, React Server Components) |
| Linguagem | TypeScript (strict mode) |
| Estilização | Tailwind CSS |
| Componentes UI | shadcn/ui (components copiados, não dependency) |
| Visualização de grafo | D3.js (força-dirigida) ou Sigma.js (WebGL, Wave 3) |
| Gráficos | Recharts ou Nivo (baseados em D3) |
| Estado do cliente | React Server Components + `use` hook; Zustand para estado client-side complexo |
| Testes | Vitest + React Testing Library |
| Linting | ESLint + Prettier |

### Justificativa do Next.js

- **Server-Side Rendering (SSR)** e **Static Generation (SSG)** — páginas de parlamentar podem ser geradas estaticamente e revalidadas periodicamente (ISR), garantindo SEO e performance
- **React Server Components** — dados L1/L2 são fetched no servidor sem bundle JavaScript no cliente
- **App Router** — layouts aninhados facilitam a estrutura hierárquica (parlamentar → votações → detalhe)
- **API Routes** — BFF (Backend For Frontend) leve para agregações específicas da UI
- **OG Image generation** — `@vercel/og` para cards de compartilhamento social dinâmicos
- **Ecossistema React** — maior pool de contribuidores no Brasil

### Estrutura de diretórios

```
web/
├── app/                          # App Router
│   ├── layout.tsx                # layout raiz
│   ├── page.tsx                  # home
│   ├── parlamentares/
│   │   ├── page.tsx              # listagem / busca
│   │   └── [id]/
│   │       ├── page.tsx          # página 360° do parlamentar
│   │       ├── votacoes/
│   │       ├── gastos/
│   │       └── coerencia/
│   ├── proposicoes/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── grafo/                    # Wave 3
│   │   └── page.tsx
│   └── api/                      # BFF routes
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── trust/                    # componentes de trust_level
│   │   ├── trust-badge.tsx       # badge L1/L2/L3/L4
│   │   ├── trust-disclaimer.tsx  # disclaimer L3
│   │   └── trust-wrapper.tsx     # wrapper que aplica estilo por nível
│   ├── parlamentar/
│   ├── votacao/
│   └── grafo/
├── lib/
│   ├── api-client.ts             # client para o backend Go
│   └── trust.ts                  # utilidades de trust_level
└── public/
```

### Renderização por Trust Level

| Trust Level | Renderização |
|-------------|-------------|
| L1 — Dados Brutos | Exibição direta, badge verde sutil, link para fonte oficial |
| L2 — Agregações | Exibição direta, badge azul, link para fórmula/metodologia |
| L3 — Correlações | Seção visualmente separada, disclaimer permanente não dispensável, badge amarelo |
| L4 — Impacto | Sub-brand "Brasil a Vera Labs", identidade visual distinta, badge laranja |

## Alternativas Consideradas

### SvelteKit

- **Prós**: performance superior (menos JavaScript), sintaxe mais simples, SSR nativo, growing momentum
- **Contras**: comunidade menor no Brasil, ecossistema de componentes menos maduro, menos contribuidores potenciais familiarizados
- **Veredicto**: tecnicamente excelente, mas o pool de contribuidores React no Brasil é significativamente maior

### Astro + React Islands

- **Prós**: zero JS by default, islands architecture ideal para conteúdo estático com ilhas interativas
- **Contras**: interatividade complexa (grafo, filtros dinâmicos) requer muitas islands, experiência de desenvolvimento fragmentada
- **Veredicto**: bom para sites de conteúdo, mas o Brasil a Vera é mais aplicação do que site

### Remix

- **Prós**: web standards first, data loading elegante, nested routes
- **Contras**: ecossistema menor que Next.js, menos documentação e exemplos, SSG limitado
- **Veredicto**: filosoficamente interessante, mas Next.js tem vantagem prática em ecossistema e adoção

### SPA puro (React + Vite)

- **Prós**: simples, sem framework opinativo, deploy estático
- **Contras**: sem SSR (SEO comprometido), sem ISR (revalidação de cache), preview de links sociais requer serviço separado
- **Veredicto**: incompatível com o requisito de SEO e compartilhamento social

## Consequências

### Positivas

- **SEO garantido** — SSR/SSG para todas as páginas públicas; parlamentares indexáveis por Google
- **Performance** — React Server Components reduzem JavaScript enviado ao cliente; ISR para páginas que mudam diariamente
- **Compartilhamento social** — OG images dinâmicas por parlamentar ("Dep. X votou Y vezes contra Z")
- **Trust level nativo** — componente `TrustBadge` reutilizável em toda a UI
- **Ecossistema** — componentes shadcn/ui, D3.js, Recharts são maduros e bem documentados

### Negativas

- **Bundle size** — React + Next.js têm footprint maior que Svelte/Astro — mitigação: RSC reduz JS no cliente, tree-shaking, lazy loading
- **Complexidade do App Router** — RSC + Server Actions têm curva de aprendizado — mitigação: documentação interna com exemplos, components de referência
- **Dependência do ecossistema Vercel** — Next.js é mantido pela Vercel — mitigação: deploy possível em qualquer plataforma Node.js (Docker, Fly.io, Railway); não usar features Vercel-only

### Neutras

- D3.js para o grafo interativo (Wave 3) pode ser substituído por Sigma.js se o número de nós crescer (assembleias estaduais, Wave 4)
- Design system próprio pode ser construído sobre shadcn/ui conforme a identidade visual amadurecer

## Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [shadcn/ui](https://ui.shadcn.com/)
- [D3.js — Data-Driven Documents](https://d3js.org/)
