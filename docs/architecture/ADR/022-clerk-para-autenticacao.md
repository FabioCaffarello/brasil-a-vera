# ADR-022: Clerk para autenticação na Sprint 4.5+

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-05-15 (Sprint 4.1 PR 1 — decisões de implementação)
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Decisões de implementação (Sprint 4.1)](#decisões-de-implementação-sprint-41)
- [Validação empírica do free tier](#validação-empírica-do-free-tier)
- [Tratamento de dados pessoais (LGPD)](#tratamento-de-dados-pessoais-lgpd)
- [Bundle e performance](#bundle-e-performance)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 4 (Design System & Frontend de Excelência) inclui na Sprint 4.5 a
"Minha área" autenticada — rotas privadas para acompanhamento de parlamentares,
alertas personalizados, configurações. O protótipo do designer parceiro usa
um mock via `localStorage` (anti-pattern de Lovable que precisa ser substituído
antes de qualquer feature real).

A Wave 3.3 originalmente previa alertas configuráveis por e-mail — também
exigem um fluxo mínimo de auth. Aquela wave migrou para o backlog Wave 5
após a re-priorização pós-Sprint 3.2, mas a necessidade de auth permanece
ancorada na Sprint 4.5.

Requisitos práticos:

1. **Login social (Google, GitHub)** — usuário cívico raramente quer criar
   senha; Google domina entre eleitores brasileiros.
2. **Email + senha como fallback** — para quem não usa Google/GitHub
   (acessibilidade de público).
3. **Session persistente entre Workers isolates** — Cloudflare Workers
   não tem RAM persistente; sessions precisam viver em cookie + storage
   externo.
4. **Free tier compatível com Wave 4 e além** — projeto solo mantido por
   doação; auth não pode introduzir custo recorrente significativo.
5. **LGPD-aware** — dados de usuário brasileiro (e-mail, IP) ficam fora da
   nossa responsabilidade direta sempre que possível, com data processor
   contratual claro.
6. **Bundle mínimo no client** — a maior parte do site é pública (RSC, zero
   hidratação). Auth UI fica em ilhas isoladas.

A peça crítica: a Sprint 4.5 ainda está distante (depois de 4.0-4.4). Decidir
agora reduz incerteza arquitetural — o componente `<UserButton />` precisa
existir no header da Sprint 4.1, ainda que sem rotas privadas ativas.

## Decisão

**Adotamos Clerk** (`@clerk/nextjs`) como provedor de autenticação para todas
as rotas privadas da Wave 4+. Setup divide-se em três momentos:

1. **Sprint 4.0 (este ADR)**: decisão registrada. Nenhuma dep instalada
   ainda.
2. **Sprint 4.1 (refatoração do shell)**: `@clerk/nextjs` adicionado.
   `<ClerkProvider>` envolve `<html>`. Header tem `<SignedIn>` /
   `<SignedOut>` / `<UserButton>` em uma ilha cliente isolada. Middleware
   protege `/minha-area/*` mesmo sem rotas concretas dentro ainda.
3. **Sprint 4.5 (Minha área)**: rotas concretas em `/minha-area/*`. Nova
   tabela `usuario_acompanhamento` no schema (se confirmada nesta sprint).
   ADR específico sobre persistência de dados de usuário em multi-tenant
   cívico se entrar (LGPD prática, não só teórica).

## Decisões de implementação (Sprint 4.1)

Calibradas após inspeção do quickstart Clerk Core 3 (mar/2026) e do estado
upstream do `@opennextjs/cloudflare` em 2026-05-15.

### 1. `middleware.ts` (NÃO `proxy.ts`) — dívida conhecida

Next 16 (out/2025) renomeou `middleware.ts` → `proxy.ts`. O arquivo legacy
`middleware.ts` continua funcionando, só emite deprecation warning.

**MAS** `@opennextjs/cloudflare` ainda NÃO suporta `proxy.ts`:

- Issue [opennextjs/opennextjs-cloudflare#962](https://github.com/opennextjs/opennextjs-cloudflare/issues/962) aberta out/2025
- Relato adicional [vercel/next.js#86122](https://github.com/vercel/next.js/issues/86122): `proxy.ts` não executa atrás de Cloudflare orange-cloud mesmo fora do OpenNext

**Decisão**: ficar em `middleware.ts` até suporte upstream chegar.
Aplicar codemod Next 16 (`npx @next/codemod next/middleware-to-proxy`) em PR
de migração quando issue #962 fechar. Princípio 13 + ADR-019: não preemptar
suporte que ainda não existe.

### 2. API: `<Show when="...">` (correção empírica — `<SignedIn>` foi REMOVIDO em Core 3)

**Plano original** (refletindo research do owner pré-implementação): usar
`<SignedIn>` / `<SignedOut>` em vez de `<Show>`, argumento de que ambos
estavam funcionais e a API antiga tinha mais issues resolvidas.

**Descoberta empírica no PR 2** da Sprint 4.1: `@clerk/nextjs@7.3.4`
(Core 3, instalado no PR 1) **não exporta** `<SignedIn>` / `<SignedOut>`.
Inspeção de `node_modules/@clerk/nextjs/dist/types/components.client.d.ts`:

```ts
export { ClerkProvider } from './client-boundary/ClerkProvider';
export { Show } from './client-boundary/controlComponents';
```

`@clerk/nextjs/legacy` também NÃO inclui `<SignedIn>`/`<SignedOut>` — só
hooks `useSignIn`/`useSignUp`.

Build do Next falha com:
> Export SignedIn doesn't exist in target module
> Did you mean to import SignIn?

**Decisão corrigida**: usar `<Show when="signed-in">` / `<Show when="signed-out">`
no Core 3+. Princípio 13 aplicado — hipótese sobre disponibilidade da API
falsificada empiricamente; pivotar para o que existe.

`<Show>` foi a API nova em Core 3 e é hoje a ÚNICA exportada. Comportamento
equivalente. Quando RBAC/Permissions chegarem (Sprint 4.5+), `<Show>` já
tem o açúcar `when={{ permission: '...' }}`.

Alternativa de downgrade para `@clerk/nextjs@6.x` (que tinha `<SignedIn>`)
foi descartada — perderíamos features Core 3 (sem benefício compensador
para Brasil a Vera).

### 3. Matcher do middleware — REVERTIDO no PR 3 (volta a `/minha-area/(.*)`)

**PR 1 (original)**: matcher = `['/minha-area/(.*)']` para evitar custo CPU
em rotas públicas e potencial conflito com edge cache (ADR-018).

**PR 2 (revisado para amplo)**: matcher genérico cobrindo todas as rotas
não-asset. Razão: `<AuthSlot />` RSC server-side precisa de `auth()` em
todas as páginas.

**PR 3 (REVERTIDO para restrito)**: matcher voltou a `['/minha-area/(.*)']`
após validação empírica do deploy CI.

**Razão da reversão**: o merge do PR 2 em main quebrou o deploy Cloudflare:

```
✘ Your Worker exceeded the size limit of 3 MiB.
- handler.mjs: 11649 KiB (raw)
Total Upload: 13898 KiB / gzip: 3234 KiB (limite 3072 KiB free tier)
```

O Clerk SDK no main `handler.mjs` (via `import { auth } from '@clerk/nextjs/server'`
em `<AuthSlot />`) crescia o bundle compressed em ~440 KB e estourou o
free tier (Workers Free: 3 MiB script gzipped; Workers Paid $5/mo: 10 MiB).

Tentativa de `default.minify: true` (OpenNext) quebrou esbuild em
`@vercel/og/index.edge.js` (`Export ImageResponse doesn't exist in this
file` — file pré-bundled pelo Next não sobrevive a `minifySyntax`).

Trade-off da reversão (PR 3):
- ✅ Free tier preservado (zero custo adicional vs $5/mo Workers Paid)
- ✅ SSG / static prerender retornam para `/docs/*`, `/partidos/[sigla]`
- ✅ Middleware roda só em `/minha-area/(.*)` (CPU econômico, edge cache natural)
- ❌ Perdemos "zero JS anônimo" do PR 2 — anônimos pagam Clerk chunk via
  AuthIslandLoader lazy (após hydrate, ~50 KB compressed background download)
- ❌ Anônimo vê Skeleton brevemente até hidratar

A perda de zero-JS-anônimo é aceita porque (a) LCP não é afetado (chunk
load é pós-paint), (b) free tier preservado, (c) margem de ~350 KB no
limite de 3 MiB (medido empíricamente).

`clerkMiddleware()` continua em modo "dormente" (sem `auth.protect()`).
No Sprint 4.5, quando `/minha-area/*` for criada, adiciona
`auth.protect()` no handler para o subset de rotas privadas.

### 4. `<ClerkProvider>` envolve `<html>`

Quickstart Clerk mostra ambos os padrões (envolver `<html>` ou apenas
`<header>`). Para Brasil a Vera:

- **Sim, envolve `<html>`** — queremos `auth()` server-side em qualquer
  RSC (perfil de usuário, prefs, alertas — Sprint 4.5+)
- Custo: Provider injeta `@clerk/clerk-js` no client em TODAS as rotas,
  mesmo anônimas. Medição empírica obrigatória no PR 1 do 4.1.

**ATUALIZAÇÃO PR 1 (Opção B aplicada)**: plano original previa Provider em `<html>`.
Após medição empírica no PR 1 mostrar gate de 50kb tripado em 815B (1.6% além —
ver §5), owner escolheu **Opção B**: Provider NÃO entra em `<html>`. Layout root sem
Provider; delta em rotas anônimas volta a praticamente zero.

**ATUALIZAÇÃO PR 2 (refinamento do split-point após validação empírica)**:

A tentativa inicial do PR 2 foi colocar o `<AuthIsland>` (com `ClerkProvider` +
`Show` + `SignInButton` + `dark` statically imported) dentro do `<Navbar>`. Medição
empírica mostrou que o Next bundla todas as dependências estaticamente reachable da
árvore de layout, INDEPENDENTE de render condicional server-side. Resultado: +78kb
gzipped por rota anônima — PIOR que Opção A (+50kb).

**Topologia final do PR 3 (revertida — 2 componentes)**:

| Arquivo | Tipo | Papel |
|---|---|---|
| `auth-island-loader.tsx` | Client | Thin wrapper que faz `dynamic(() => import('./auth-island'), { ssr: false })`. **Cria o split-point assíncrono** |
| `auth-island.tsx` | Client | Implementação real: `<ClerkProvider>` + `<Show when>` + `<UserButton>` |

**Removidos no PR 3** (estavam no PR 2):
- `auth-slot.tsx` (RSC com `auth()`) — causava o bloat no handler.mjs
- `src/app/sign-in/page.tsx` (redirectToSignIn stub) — não mais necessário; `<SignInButton>` do Clerk gera URL Account Portal direto

**Fluxo (PR 3)**:

- **Initial paint** (anônimo OU autenticado): Navbar (RSC) renderiza
  `<AuthIslandLoader />` que mostra `<Skeleton />` placeholder. Zero Clerk no HTML.
- **Após hydrate**: AuthIslandLoader monta no client, `dynamic()` carrega
  `auth-island.tsx` chunk assincronamente.
- **Após chunk load**: `<ClerkProvider>` hidrata; `<Show when>` decide
  client-side renderizar `<SignInButton>` (anônimo) ou `<UserButton>` (autenticado).

**Medição empírica do PR 3** (curl /docs anônimo):
- Initial HTML JS chunks: 14, 201,823 gzipped (mesmo do PR 2 baseline)
- Lazy AuthIsland chunk (loads after hydrate): ~50 KB compressed
- LCP NÃO impactado (chunk load post-paint)
- **Server-side Worker bundle (Cloudflare)**: 2.79 MB gzipped (margem 350 KB
  no limite 3 MiB do free tier) ✓

A diferença residual de +11kb gzipped vem de Next runtime adicional para middleware
edge + AuthIslandLoader chunk em si (pequeno; necessário para criar o split-point).
**Dentro do gate de 50kb** (ADR-022 §5).

**Sprint 4.5**: layout do route group `(authenticated)/` pode adicionar seu próprio
Provider para client hooks em rotas privadas.

`auth()` server-side em RSCs continua funcionando — lê de cookies via middleware,
não depende do Provider client.

Props do Provider quando entrar (na AuthIsland do PR 2):

- `afterSignOutUrl="/"` — logout do `<UserButton>` volta à home, não
  ao Account Portal hosted do Clerk
- `appearance={{ baseTheme: dark }}` — alinha com nosso shell dark-first
  (sem isso, componentes Clerk vêm tema claro). Requer `@clerk/themes`
  (~2kb gzip), dep mínima sem risco
- **Sem** `signInUrl` / `signUpUrl` custom — Account Portal hosted
  (`accounts.<app>.clerk.accounts.dev`) cobre Sprint 4.1. Quando
  Sprint 4.5 criar `/minha-area/sign-in`, aí configura

### 5. Gate empírico: ClerkProvider > 50kb gzip por rota pública

**Histórico**: gate foi proposto e empiricamente tripado.

Medição no PR 1 (com Provider em `<html>` antes da Opção B ser aplicada):
- JS gzipped main: 231,580 bytes
- JS gzipped branch: 282,395 bytes
- **delta: +50,815 bytes** (gate de 50kb tripado em 815 bytes / 1.6%)

Owner escolheu **Opção B** (§4 acima — Provider em AuthIsland scoped, não em
`<html>`). Decisão arquivada. Princípio 13 aplicado — confirmação empírica
antes de mergear evitou shipping de bundle inflado em rotas anônimas.

Re-medição após aplicar Opção B no PR 1 (Provider removido do layout):
- JS gzipped branch (Opção B): a ser medido empiricamente; esperado igual ao main
- delta esperado em rotas anônimas: 0 bytes (ClerkProvider só hidrata via AuthIsland no PR 2)

### 6. Account Portal hosted no Sprint 4.1

Login real no 4.1 acontece via Account Portal hosted Clerk:

- Usuário anônimo clica "Entrar" no header
- Browser vai para `https://accounts.<app>.clerk.accounts.dev/sign-in`
- Após login, volta para Brasil a Vera com cookie de session
- Header renderiza `<UserButton>` (avatar + dropdown)

Sem rota custom `/sign-in` em Brasil a Vera no 4.1 — não precisa. Sprint
4.5 introduz `/minha-area/sign-in` se quisermos sign-in dentro do site
(decisão diferida).

### Plano de migração caso o free tier mude

Se Clerk mudar o free tier (50k MAU hoje) ou se métricas em produção
mostrarem que ultrapassamos o limite, dois caminhos:

- Avaliar Lucia / Better Auth com migração documentada (sessões portáveis,
  dados de usuário em Postgres). Cluster de dados de auth fica no nosso
  banco — então migração não perde state.
- Pagar Pro ($20/mo annual, hoje) se ROI cívico justificar — entra em ADR
  específico no momento da decisão.

Princípio: vendor lock-in mitigado mantendo dados sensíveis (acompanhamentos,
preferências) no **nosso** banco Postgres, com `clerk_user_id` apenas como
foreign key opaca. Se trocarmos Clerk por X, re-mapeamos o ID e seguimos.

## Validação empírica do free tier

Pricing oficial consultado em 2026-05-15 (`https://clerk.com/pricing`).
Output literal da consulta (princípio 13 do CLAUDE.md):

```
| Tier       | Base Price          | MAU Limit | Included MAU | Overage Cost                                          |
|------------|---------------------|-----------|--------------|-------------------------------------------------------|
| Hobby      | $0                  | 50,000    | 50,000       | N/A                                                   |
| Pro        | $20/mo (annual)     | Unlimited | 50,000       | $0.02/MAU (50K-100K); scales to $0.012/MAU (10M+)     |
| Business   | $250/mo (annual)    | Unlimited | 50,000       | Same tiered overage as Pro                            |
| Enterprise | Custom              | Unlimited | Custom       | Custom                                                |

Hobby inclui:
- Unlimited applications
- Up to 3 dashboard seats
- APIs e prebuilt UIs para core authentication
- Custom domain
- Fixed, 7-day session lifetime
- Basic security features (bot protection, account lockout)

Pro adiciona:
- Remove Clerk branding
- MFA
- Passkeys
- Custom email templates
- Enterprise connections ($75/mo each)
- Extended session customization

Nota: "Monthly retained user" (MAU para billing) = usuário retornando 24h+
post-signup. First-day access é grátis.
```

**Leitura para o nosso caso**: o Hobby tier (50k MAU) cobre confortavelmente
o cenário realista do Brasil a Vera nos próximos 12-24 meses. Para
comparação, o ROADMAP cita "50k MAU em Wave 3 como OKR aspiracional, não
critério de Done". Estamos uma ordem de grandeza abaixo de qualquer limite.

A regra de "MAU = retorno 24h+ post-signup" é favorável: visitas anônimas
(maior parte do tráfego cívico) não contam.

**Restrição aceita do Hobby**: branding "powered by Clerk" no `<UserButton />`
e session lifetime fixa em 7 dias. Aceitáveis para fase de validação.
Reavaliar se cidadão pedir "manter logado por mais tempo" como feedback real.

## Tratamento de dados pessoais (LGPD)

### O que o Clerk armazena (data processor)

- E-mail
- Nome (se fornecido pelo provedor OAuth)
- Provider ID (Google sub, GitHub ID, etc.)
- Senha hash (se cadastro email/senha)
- IP de últimas N sessions (rotação ~30 dias)
- User agent das sessions

Servidores Clerk são US-based. Para LGPD, isso configura **transferência
internacional de dados pessoais** — exige base legal (consentimento
explícito do titular no momento do cadastro, art. 7º LGPD, com finalidade
clara) e cláusulas contratuais padrão entre Clerk (operador) e Brasil a
Vera (controlador).

### O que NÃO vai para o Clerk

- Histórico de acompanhamentos (parlamentar X seguido pelo usuário Y)
- Configurações de alerta
- Preferências de tema (se houver)
- Qualquer dado de uso cívico

Tudo isso vive no nosso Postgres (Neon), em tabelas com `clerk_user_id`
como foreign key opaca. Razão dupla:

1. **Soberania dos dados**: o que define o usuário cívico (quem ele acompanha,
   o que pediu alerta) é nosso, não do auth provider.
2. **Reduzir blast radius de mudança de provider**: se trocarmos Clerk por
   Lucia ou outro, basta re-mapear o `external_id`.

### Política de privacidade

Sprint 4.5 inclui:

- Página `/privacidade` documentando coleta, finalidade, base legal,
  retenção, direitos do titular (acesso, correção, exclusão).
- Fluxo de exclusão de conta: deleta do Clerk + cascata `usuario_*` no
  Postgres. Operação manual via dashboard admin no início; automatizar se
  volume justificar.
- Cookie consent: Clerk usa cookies funcionais; banner mínimo na primeira
  visita anônima informando + opt-out via não-login.

## Bundle e performance

Bundle do `@clerk/nextjs` no client **não medido neste ADR** — a dependência
ainda não foi instalada. Medição empírica acontece no PR da Sprint 4.1
(`feat(shell): integrate Clerk in header`) via:

1. `npm run build` antes/depois — diff no `chunks/` registrado no PR.
2. Cloudflare Workers bundle (`npm run cf:build`) antes/depois — Worker
   tem limite de 1 MB no free tier; medir margem.
3. `npx bundle-phobia @clerk/nextjs` como referência cruzada
   (no momento desta redação retornou erro de scraping; tentar de novo
   com `bun x bundle-phobia` ou consulta manual ao site).

Estimativa preliminar baseada em docs públicos do Clerk em 2025:
~80-100 kB gzip para o client SDK. Mitigação se ficar alto:

- `<UserButton />` carregado dinamicamente (`next/dynamic`) — usuário
  anônimo (maioria) não baixa nada.
- `<ClerkProvider>` no layout root é peer dep necessária, mas o JS de
  features (MFA, sessões, etc.) carrega lazy.
- Rotas públicas (`/`, `/parlamentares`, etc.) continuam zero hidratação
  além do mínimo do `<UserButton />` ilha.

Se a medição empírica no PR da Sprint 4.1 mostrar > 150 kB gzip no client
de uma página pública, abrir issue de otimização **antes** do merge. Ver
princípio 13 (validação empírica) no CLAUDE.md.

## Alternativas Consideradas

### A. Lucia Auth (self-hosted, código aberto)

- **Prós**: zero vendor lock-in. Sessions em Postgres (nosso banco). Zero
  custo recorrente. Sem dados em US.
- **Contras**: **autor anunciou descontinuação em 2025** — projeto entra
  em modo "código congelado, sem novos features". Forks comunitários
  existem mas sem governance clara. Implementar OAuth (Google, GitHub),
  reset de senha, MFA, rate limiting, brute force protection, etc. tudo
  manual. Em projeto solo, escrever auth corretamente é arriscado
  (bugs de segurança em auth são caros). Tempo de implementação:
  estimado 1-2 sprints inteiras — Sprint 4.5 vira Sprint 4.5/6/7.
- **Veredicto**: descartado por custo de manutenção + risco de descontinuação
  upstream. Re-avaliar se Clerk virar problema.

### B. NextAuth / Auth.js v5

- **Prós**: open source, ecossistema Next.js maduro, sessions adapter para
  Postgres (`@auth/drizzle-adapter` existe), zero custo recorrente.
- **Contras**: v5 estável mas ainda com churn frequente em DX.
  Cloudflare Workers runtime tem caveats (algumas funcionalidades exigem
  Node runtime — incompatível com nosso deploy). Manutenção upstream
  ativa mas com breaking changes regulares. Implementação completa
  (com email verification, MFA, etc.) ainda fica nas nossas mãos.
- **Veredicto**: descartado por incompatibilidade parcial com Workers
  runtime + churn de breaking changes. Re-avaliar se Auth.js estabilizar
  versão Edge-first.

### C. Better Auth (lançado 2024, em ascensão)

- **Prós**: workers-first, sessions em Postgres, TypeScript-strict,
  open source MIT, zero custo recorrente. Filosofia próxima da nossa
  (código próprio + tokens).
- **Contras**: lançado há menos de 1 ano; ecossistema ainda imaturo;
  comunidade pequena. Migrações de schema da própria lib não estão tão
  documentadas. Risco de breaking changes alto na fase atual.
- **Veredicto**: descartado **por enquanto** — não passa no "maturidade
  para produção brasileira em projeto solo". Forte candidato a substituir
  Clerk em 12-18 meses se ecossistema estabilizar.

### D. Supabase Auth

- **Prós**: free tier generoso (50k MAU), integração TS forte.
- **Contras**: nossa decisão arquitetural (ADR-003) é Neon, não Supabase
  — e Supabase Auth quer (idealmente) Supabase DB junto. Usar só Auth
  é viável mas perde sinergia. Adiciona dependência operacional num
  vendor extra (já temos Cloudflare + Neon + GitHub Actions).
- **Veredicto**: descartado por desalinhamento com ADR-003 e por
  fragmentação de vendors.

### E. Código próprio (sessions em Postgres + bcrypt + OAuth manual)

- **Prós**: zero peer deps, zero vendor, total controle.
- **Contras**: auth corretamente implementado é trabalho de semanas
  (CSRF, session fixation, brute force, password storage, OAuth state
  validation, reset-by-email com tokens TTL, rate limiting, etc.).
  Bugs em auth são bugs de segurança — em projeto cívico com dados de
  usuário, custo de errar é alto. Tempo de manutenção: contínuo (CVEs
  em deps de OAuth, novas best practices).
- **Veredicto**: descartado. Bibliotecas de auth maduras são exatamente
  o caso onde "preferimos código próprio a libs com escopo amplo"
  (CLAUDE.md) **não se aplica** — segurança não é commodity replicável.

### F. WorkOS

- **Prós**: forte em B2B SSO, SAML, etc.
- **Contras**: foco B2B, não cobre nosso caso B2C cívico bem. Pricing
  voltado para enterprise.
- **Veredicto**: descartado por desalinhamento de público-alvo.

## Consequências

### Positivas

- **Setup em horas, não semanas**: a Sprint 4.5 pode focar em features
  cívicas (acompanhamento, alertas) em vez de auth plumbing.
- **A11y + i18n + dark mode prontos** no `<UserButton />` e `<SignIn />`
  componentes — Clerk customiza via tokens CSS, integra com nossa paleta.
- **Free tier folgado**: 50k MAU cobre o cenário realista 12-24 meses
  sem custo.
- **Soberania de dados cívicos preservada**: acompanhamentos e
  preferências no nosso Postgres, `clerk_user_id` como foreign key
  opaca — migração futura é viável.
- **Segurança terceirizada para especialista**: brute force, password
  storage, OAuth state, MFA, etc. ficam com o Clerk.

### Negativas

- **Vendor lock-in parcial**: dados de auth (e-mail, IP, sessions) em
  Clerk US. Mitigação: dados cívicos no nosso banco; trocar provider
  re-mapeia `external_id`.
- **Branding "Powered by Clerk"** no tier Hobby (aceitável; remove com
  Pro $20/mo se virar fricção).
- **LGPD operacional**: transferência internacional de dados exige base
  legal documentada + DPA com Clerk + cláusulas contratuais padrão.
  Trabalho jurídico (não técnico) que cai no operador. Não inviabiliza
  Clerk — é o trabalho que **qualquer** provider US-based exigiria.
- **Bundle no cliente**: ~80-100 kB gzip estimados. Mitigação via
  lazy-load (`next/dynamic`) para usuários anônimos.
- **Risco de mudança de pricing upstream**: Clerk pode mudar Hobby tier.
  Plano de migração documentado acima (Lucia/Better Auth + dados em
  Postgres mitigam).

### Neutras

- ADR-003 (Neon Postgres) permanece válido — dados cívicos no Neon.
- ADR-009 (Cloudflare Workers) permanece compatível — Clerk SDK suporta
  Workers runtime nativamente (verificar empiricamente no PR da Sprint 4.1).
- Sprint 4.1 introduz `@clerk/nextjs` como dep. Sprint 4.5 introduz tabelas
  de domínio para acompanhamento (em ADR separado se schema for não-trivial).

## Referências

- [ADR-003 — Database strategy (Neon)](003-database-neon.md)
- [ADR-009 — Deploy em Cloudflare Workers](009-cloudflare-pages.md)
- [ADR-019 — Disciplina arquitetural (sem gargalo empírico)](019-disciplina-arquitetural-sem-gargalo.md) — princípio aplicado de forma leve aqui (princípio 14)
- [ADR-021 — Design System & shadcn curado](021-design-system-shadcn-curado.md)
- Clerk pricing (consultado 2026-05-15): `https://clerk.com/pricing`
- Clerk Cloudflare Workers docs: `https://clerk.com/docs/integrations/databases/neon` e `https://clerk.com/docs/quickstarts/nextjs`
- LGPD Lei 13.709/2018 — art. 7º (bases legais), art. 33 (transferência internacional)
- Comparativo de auth providers: [Lucia archival announcement](https://github.com/lucia-auth/lucia/discussions/1707), [Auth.js Edge support](https://authjs.dev/), [Better Auth](https://www.better-auth.com/)
