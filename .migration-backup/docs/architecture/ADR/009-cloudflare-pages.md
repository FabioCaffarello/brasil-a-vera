# ADR-009: Deploy em Cloudflare Workers (via OpenNext)

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-05-11
> Status: accepted

---

> **Nota sobre o nome do arquivo:** este ADR foi inicialmente chamado de
> "Cloudflare Pages" porque a proposta original era usar o adapter
> `@cloudflare/next-on-pages` (Cloudflare Pages). Durante a implementação
> descobrimos que esse adapter não suporta Next.js 16 (peer dep
> `next >=14.3.0 <=15.5.2`). A decisão foi atualizada para usar
> `@opennextjs/cloudflare` (Cloudflare Workers + Assets). O nome do arquivo
> permanece `009-cloudflare-pages.md` por questão de estabilidade de links
> mas o produto Cloudflare alvo é **Workers**, não Pages.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Substitui](#substitui)
- [Referências](#referências)

---

## Contexto

O Brasil a Vera é um projeto open-source mantido por doação, com restrição firme de
custo operacional próximo de zero. O deploy planejado originalmente no [ADR-007](007-monolith-first-strategy.md)
era Vercel free tier, mas após avaliação prática duas barreiras emergiram:

1. **Limite de bandwidth** — Vercel free tier limita a 100GB/mês. Para um site
   público de transparência, com tráfego potencialmente irregular (picos durante
   votações de impacto), esse limite é um teto operacional incerto.
2. **Proibição de uso comercial** — os termos da Vercel free tier proíbem uso
   comercial. Um projeto cívico que aceita doação ocupa zona cinzenta nessa
   cláusula; a única forma de operar sem risco contratual seria upgrade para Pro
   ($20/mês por dev).

O projeto precisa de uma plataforma que combine:

- Suporte ao Next.js 16 (App Router, RSC, Route Handlers, nova adapter API)
- Bandwidth efetivamente ilimitado no free tier
- Termos de uso compatíveis com projeto open-source mantido por doação
- Edge runtime para baixa latência global
- Custo previsível mesmo em caso de pico inesperado de tráfego

Adicionalmente, o Next.js 16 introduziu uma nova **Adapters API** (ver
`adapterPath` em `next.config.ts`) e parte dos adapters legados — incluindo o
`@cloudflare/next-on-pages` (Cloudflare Pages tradicional) — ainda não suporta
Next 16. O adapter moderno mantido para o ecossistema Cloudflare é o
**`@opennextjs/cloudflare`**, parte do projeto OpenNext, que faz deploy para
**Cloudflare Workers** com binding de assets estáticos.

## Decisão

**Adotamos Cloudflare Workers como plataforma de deploy** usando o adapter
**`@opennextjs/cloudflare`**. O build do Next.js é processado pelo adapter,
que gera um Worker em `.open-next/worker.js` e empacota os assets estáticos
em `.open-next/assets/`. O Worker é deployado com binding `ASSETS` que serve
os arquivos estáticos diretamente.

Funcionalmente equivalente, do ponto de vista do usuário final, ao Cloudflare
Pages (mesmo edge, mesmo bandwidth ilimitado, mesmo CDN global), mas o produto
Cloudflare alvo é Workers.

| Aspecto | Cloudflare Workers |
|---------|-------------------|
| Bandwidth | Ilimitado (free) |
| Workers requests | 100.000/dia (free) |
| Workers CPU time | 10ms/request (free) / 50ms/request (paid) |
| Edge POPs | 300+ globalmente |
| Assets serving | Binding `ASSETS` nativo, sem custo de Workers requests |
| Termos | Permitem uso comercial e doação |
| Plano pago | Workers Paid: $5/mês ao estourar limite gratuito |

Configuração canônica no repositório:

- `wrangler.jsonc` — define name, main, compatibility_date, flags e binding de assets
- `open-next.config.ts` — config mínima do adapter (sem incremental cache R2 no Wave 0)
- `package.json` scripts: `cf:build`, `cf:preview`, `cf:deploy`
- `.github/workflows/deploy.yml` — deploy automático em push para `main` via wrangler

Preview deploys de PR são gerados automaticamente pela integração nativa
**Cloudflare Workers Builds ↔ GitHub** quando o repositório é conectado no
dashboard da Cloudflare. Não é necessário configurar isso no workflow YAML.

## Alternativas Consideradas

### `@cloudflare/next-on-pages` (Cloudflare Pages tradicional)

- **Prós**: paradigma maduro, integração nativa com Cloudflare Pages, preview deploys do dashboard são automáticos no produto Pages.
- **Contras**: peer dependency `next >=14.3.0 <=15.5.2` — **não suporta Next 16**. O adapter não foi portado para a nova Adapters API do Next 16, e provavelmente nunca será (deprecated em favor do OpenNext).
- **Veredicto**: descartado por incompatibilidade com Next 16. Tentar forçar (`--legacy-peer-deps`) instala mas quase certamente quebra em build porque o adapter inspeciona o output do Next que mudou de formato.

### Manter Vercel free tier

- **Prós**: DX excelente, integração nativa com Next.js, preview deploys, comments
  em PR sem configuração.
- **Contras**: limite de bandwidth de 100GB/mês, cláusula de uso comercial
  incompatível com o modelo de sustentabilidade do projeto.
- **Veredicto**: descartado pelo bandwidth e pelo termo.

### Netlify free tier

- **Prós**: maturidade, suporte a Next.js, preview deploys.
- **Contras**: bandwidth limitado a 100GB/mês — mesmo modelo da Vercel.
- **Veredicto**: descartado pelo mesmo motivo de bandwidth.

### SQLite-em-R2 com Next.js static export

- **Prós**: arquitetura ultra-barata e simples, sem servidor dinâmico, dados
  consultados diretamente do Cloudflare R2 como SQLite file.
- **Contras**: requer reescrita significativa da arquitetura atual (que assume
  PostgreSQL no Neon e Route Handlers dinâmicos). Limita features que dependem
  de mutação ou consulta em tempo real.
- **Veredicto**: opção interessante para o futuro caso o custo do Neon se torne
  problemático ou o site evolua para majoritariamente estático. Anotada como
  alternativa para reavaliação, não adotada agora.

### VPS dedicada (Hetzner / DigitalOcean) + Caddy

- **Prós**: controle total, custo fixo (~$5–10/mês), sem restrições de runtime.
- **Contras**: VPS adiciona overhead operacional (atualizações, monitoramento,
  backups) incompatível com o modelo de manutenção solo. Cold start global pior
  que edge.
- **Veredicto**: candidata natural para a Wave 3+ quando a stack se mover para
  microserviços Go (ver [ADR-007](007-monolith-first-strategy.md)). Sobredimensionado
  para o monolito Next.js em Wave 0.

## Consequências

### Positivas

- **Custo praticamente fixo** — free tier cobre o esperado para Waves 0–1; mesmo
  no upgrade pago ($5/mês de Workers Paid), o custo é previsível.
- **Bandwidth ilimitado** — picos de tráfego em torno de eventos legislativos
  (votações de alto impacto) não geram custo nem risco operacional.
- **Performance no edge** — assets e responses servidos do POP mais próximo do
  visitante, sem configuração adicional.
- **Termos compatíveis com doação** — sem zona cinzenta contratual.
- **Adapter alinhado com Next 16** — `@opennextjs/cloudflare` usa a nova
  Adapters API do Next 16 e é mantido ativamente pela equipe OpenNext.
- **Preview deploys automáticos** — gerados pela integração nativa Cloudflare
  Workers Builds ↔ GitHub quando o repo é conectado no dashboard.

### Negativas

- **DX inferior à Vercel** — feedback de build menos polido, dashboard menos
  refinado, sem alguns recursos como Web Analytics nativos integrados.
- **Suporte ao Next.js via adapter** — `@opennextjs/cloudflare` é mantido por
  uma equipe terceira (OpenNext), embora alinhada com Cloudflare. Algumas
  features do Next.js têm caveats — consultar a doc do adapter antes de adotar.
- **CPU time por request** — limite de 10ms (free) ou 50ms (paid) por request.
  Operações pesadas devem ir para GitHub Actions ou Workers separados.
- **Vendor lock-in moderado** — `wrangler.jsonc`, compatibility flags, binding
  `ASSETS` e o adapter são específicos da Cloudflare. Migração para outra
  plataforma seria trabalho.

### Neutras

- Workers runtime é V8 isolate (não Node.js), com subset da API do Node via
  `nodejs_compat`. Código que toca diretamente APIs de SO precisa rodar em
  Route Handlers que o adapter mapeia para Worker compatível.
- Drizzle com `@neondatabase/serverless` + `neon-serverless` é compatível com
  Workers runtime (ver [ADR-011](011-database-driver.md)).
- A integração `Cloudflare Workers Builds` (gera preview por PR) é configurada
  via dashboard e não requer workflow YAML adicional.

## Substitui

Este ADR superseda **parcialmente** o [ADR-007](007-monolith-first-strategy.md):
- A camada de deploy migra de Vercel para Cloudflare Workers (via OpenNext).
- O restante do ADR-007 (Strangler Fig, regras de modularização, critérios de
  trigger para extração) permanece válido.

## Referências

- [OpenNext for Cloudflare — docs](https://opennext.js.org/cloudflare)
- [@opennextjs/cloudflare — GitHub](https://github.com/opennextjs/opennextjs-cloudflare)
- [Cloudflare Workers — Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers — Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Next.js 16 — Adapters API](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath)
- [Vercel Pricing](https://vercel.com/pricing)
