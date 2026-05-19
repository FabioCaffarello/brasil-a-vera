# ADR-029: Modelo de dados da área logada e topologia de auth

> Brasil a Vera · Arquitetura · v0.3
> Última atualização: 2026-05-19 (addendum pós-Wave 10 — refator de rotas)
> Status: accepted

---

## Addendum pós-Wave 10 (2026-05-19) — refator de rotas

A **arquitetura de rotas** descrita aqui (5 rotas multi-segmento sob
`/painel/*`) foi revertida para `/painel` único com tabs via Parallel
Routes após decisão de produto pós-entrega. Fonte: [ADR-032](./032-painel-tabs-parallel-routes.md)
+ [RFC](../../product/REFACTOR-PAINEL-TABS.md).

**O que continua válido neste ADR sem alteração:**
- Modelo de dados (`usuario.user_profile`, `usuario.follows`,
  `usuario.alert_policy`, `usuario.alert_delivery`, `usuario.consent_log`,
  `usuario.data_request`) — schema intocado pelo refator
- Topologia revisada empíricamente (`<ClerkProvider>` único no root
  layout — fix Wave 10 documentado no addendum abaixo)
- Cap 200 follows por usuário
- `consent_log.user_id` nullable + `ip_hash` com salt diário

**O que muda:**
- Rotas multi-segmento citadas (`/painel/parlamentares`,
  `/painel/configuracoes`, etc.) deixam de existir como URLs;
  todas resolvem via `/painel?tab=...&subtab=...`
- `<ConsentGate />` em `(authenticated)/layout.tsx` permanece intocado
  (gating server-side da consent acima do `/painel` continua válido)
- Route group `(authenticated)/` permanece como organização lógica
  (cobre `/painel/*`, `/sign-in/[[...]]`, `/sign-up/[[...]]` — rota
  única `/painel` ainda vive dentro do route group)

---

## Addendum Wave 10 — topologia revisada (2026-05-19)

A decisão original de §6 (Provider em route group `(authenticated)/layout.tsx`,
Opção C3) foi **revisada empíricamente** após primeiro acesso autenticado em
produção retornar erro do Clerk:

```
Uncaught Error: @clerk/nextjs: You've added multiple <ClerkProvider>
components in your React component tree. Wrap your components in a
single <ClerkProvider>.
```

**Causa raiz**: Clerk detecta múltiplos Providers mesmo em **árvores siblings**.
A topologia da decisão original tinha:
- `<ClerkProvider>` #1 dentro de `<AuthIslandLoader />` na `<Navbar>` (root layout)
- `<ClerkProvider>` #2 dentro de `(authenticated)/layout.tsx` envolvendo
  `<main>{children}</main>`

Esses dois Providers vivem em árvores irmãs no DOM (Navbar é sibling de main no
`<body>` do root layout), mas o Clerk SDK ainda os detecta como duplicados.

**Decisão revisada (Opção C1)**: `<ClerkProvider>` único no root layout
(`src/app/layout.tsx`), envolvendo todo o `<html>`. Removido do `auth-island.tsx`
e do `(authenticated)/layout.tsx`. O custo de bundle (+50kb gzip em rotas
anônimas, medido empíricamente no ADR-022 §4 PR 1 da Sprint 4.1) é aceito —
princípio 13 do CLAUDE.md: a hipótese de "Providers siblings não conflitam" foi
falsificada empiricamente em produção.

`(authenticated)/layout.tsx` permanece como pass-through para preservar o
route group como organização lógica das rotas privadas (não-funcional do ponto
de vista do React, mas semanticamente útil para futuro layout privado).

Implementação no PR fix/wave-10-single-clerk-provider.

---

## Contexto

A Wave 10 introduz a área logada do Brasil à Vera. O escopo, telas, fluxos
de produto e princípios estão consolidados em
[`docs/product/LOGGED-AREA-VISION.md`](../../product/LOGGED-AREA-VISION.md).
Este ADR cumpre a promessa do
[ADR-022 §Consequências/Neutras](022-clerk-para-autenticacao.md) — *"ADR
separado se schema de acompanhamento for não-trivial"* — e endereça duas
decisões arquiteturais que precisam de fundamentação formal:

1. **Modelo de dados** do bounded context `usuario` (7 tabelas novas:
   `user_profile`, `follows`, `alert_policy`, `alert_delivery`,
   `consent_log`, `data_request`, `alert_period`).
2. **Topologia do `<ClerkProvider>`** em rotas autenticadas — decisão que
   o VISION delegou explicitamente a este ADR (§4 Notas técnicas).

Forças em jogo:

- **Soberania de dados**: ADR-022 já estabeleceu que dados cívicos vivem
  no nosso Postgres com `clerk_user_id` como FK opaca, para mitigar
  vendor lock-in.
- **Disciplina anti-over-engineering**: duas tentativas anteriores do
  projeto morreram por hexagonal/DDD preventivo. ADR-019 bloqueia
  abstrações sem gargalo empírico.
- **Bundle anônimo**: ADR-022 §4 rejeitou Provider em `<html>` raiz por
  +50kb gzip em rotas anônimas (Opção B aplicada empiricamente).
- **Hooks client em rotas privadas**: `/painel/configuracoes` precisa
  de forms reativos que dependem de `useUser`, `useClerk`. RSC server-side
  com `auth()` não cobre forms client.
- **LGPD**: minimização (`ip_hash` em vez de IP cru), preservação de
  comprovação de consentimento após anonimização (`consent_log.user_id`
  nullable).
- **Convenções do repo**: `pgSchema('<context>')`, UUIDv7 PK em raízes,
  migrations em SQL puro versionadas (ADR-013).

## Decisão

### 1. Bounded context `usuario`

Schema Drizzle isolado: `pgSchema('usuario')`. 7 tabelas:

| Tabela | Cardinalidade | PK | Resumo |
|---|---|---|---|
| `user_profile` | 1 por usuário | UUIDv7 | Identidade própria + `clerk_user_id` opaca |
| `follows` | N (cap 200 por usuário) | composta (`user_id`, `parlamentar_id`) | Relação flat sem flags |
| `alert_policy` | 1:1 com `user_profile` | `user_id` | Configuração de alerta em colunas booleanas |
| `alert_delivery` | N | UUIDv7 + `idempotency_key` unique | Inbox + auditoria |
| `consent_log` | N | UUIDv7 | Comprovação LGPD; `user_id` nullable após anonimização |
| `data_request` | N | UUIDv7 | Trilha do art. 18 LGPD |
| `alert_period` | N (admin-managed) | UUIDv7 | Modulação por período especial |

Schema canônico completo (tipos, constraints, índices) em
[LOGGED-AREA-VISION §3](../../product/LOGGED-AREA-VISION.md#3-modelo-de-domínio).

### 2. PK estratégia: UUIDv7 + `clerk_user_id` unique

`user_profile.id` é UUIDv7 nosso. `clerk_user_id` é coluna `text unique
not null` (FK opaca). Todas as FKs internas (follows, alert_policy,
alert_delivery, consent_log, data_request) usam `user_profile.id`.

### 3. `follows` flat, sem `usuario_acompanhamento + flags`

ADR-022 prometia tabela `usuario_acompanhamento` provavelmente com flags
(favorito/votei/acompanhei). A sessão de produto Wave 10 simplificou
drasticamente:

- "Votei nele" foi **removido por completo** (auto-declaração de voto é
  problemática para privacidade — voto é constitucionalmente secreto).
- "Favoritar" e "Acompanhar" foram **fundidos em uma única ação**.

Resultado: `follows { user_id, parlamentar_id, followed_at }`. PK composta.
Sem flags, sem tri-state, sem status computado.

### 4. `alert_policy` 1:1 com colunas booleanas

Uma linha por usuário com 11+ colunas booleanas (5 topics × 3 boosts + 2
canais + cadence enum). NÃO 1:N de toggles em tabela separada. NÃO `jsonb`
para topics/boosts/channels.

### 5. Cap 200 follows por usuário

Enforçado a nível de API, não constraint SQL. Valor calibrado para Câmara
(513 deputados): cabe "bancada inteira de UF grande" ou "todos os
membros de uma CPI relevante". Revisão quando Senado/Assembleias/Câmaras
Municipais entrarem em escopo.

### 6. Topologia do `<ClerkProvider>`: route group `(authenticated)/`

`<ClerkProvider>` monta em `src/app/(authenticated)/layout.tsx`. Rotas
anônimas (home, listagens, perfis públicos) **não pagam** o Provider.
Rotas `/painel/*`, `/sign-in/[[...]]`, `/sign-up/[[...]]` ficam no route
group e ganham acesso a hooks client de Clerk.

### 7. `consent_log.user_id` nullable + `ip_hash` com salt diário

Após anonimização (LGPD art. 16), `user_id` é setado para NULL — preserva
o log como comprovação sem identificar o titular. `ip_hash` é
`sha256(ip + daily_salt)` — confirma "ação veio do mesmo IP no mesmo dia"
sem permitir reidentificação retroativa.

## Alternativas Consideradas

### Alternativa A — Schema com `usuario_acompanhamento + flags` (ADR-022 promise)

A promessa original do ADR-022 era uma tabela única com colunas como
`favoritado_em`, `votei_em`, `acompanhado_em`. Cada flag representando uma
relação semanticamente distinta usuário-parlamentar.

- **Prós**: histórico granular ("usuário relacionou-se como X em Y data");
  uma só tabela; consulta única.
- **Contras**: complexidade desproporcional ao job-to-be-done; "votei nele"
  cria pressão social e questão LGPD de convicção política (art. 11);
  card de parlamentar precisa decidir qual ação mostrar baseada em N flags.
- **Veredicto**: descartado. Decisão de produto da sessão Wave 10:
  privacidade + simplicidade > granularidade histórica.

### Alternativa B — `clerk_user_id` como PK direta

Eliminar a coluna UUIDv7 e usar `clerk_user_id` como PK em `user_profile`.

- **Prós**: uma coluna a menos por tabela; menos um índice; mais simples.
- **Contras**: lock-in massivo de Clerk em TODAS as FKs (`follows.user_id`,
  `alert_policy.user_id`, etc.). Trocar provedor de auth força rewrite de
  todas as tabelas e re-mapeamento de IDs em produção.
- **Veredicto**: descartado. Soberania de dados é princípio do ADR-022
  §Plano de migração; UUIDv7 interno é o seguro contra vendor lock-in.

### Alternativa C1 — `<ClerkProvider>` em `<html>` raiz

Topologia que o quickstart do Clerk mostra como padrão.

- **Prós**: `auth()` server-side disponível em qualquer RSC sem boilerplate;
  hooks client em qualquer árvore.
- **Contras**: Provider injeta `@clerk/clerk-js` no client em TODAS as
  rotas, incluindo anônimas. Medição empírica do PR 1 da Sprint 4.1
  mostrou **+50,815 bytes gzipped** em rotas anônimas (gate de 50kb
  tripado em 815 bytes — ADR-022 §5).
- **Veredicto**: descartado empiricamente (já registrado em ADR-022 §4).

### Alternativa C2 — Manter `<ClerkProvider>` apenas em `auth-island.tsx`

Topologia atual (Opção B do ADR-022 §4). Provider só hidrata quando a ilha
do header monta no client. Path anônimo paga zero JS de Clerk.

- **Prós**: bundle anônimo preservado; situação atual já funciona.
- **Contras**: hooks client de Clerk (`useUser`, `useClerk`, `useAuth`) só
  funcionam dentro da árvore da ilha. Forms reativos em
  `/painel/configuracoes` (mudar UF, atualizar nome) precisariam de
  workarounds — ou re-implementar lookup via `auth()` em RSC + Server
  Actions, sem feedback otimista no client.
- **Veredicto**: descartado por limitação de UX em telas privadas.

### Alternativa C3 — Route group `(authenticated)/layout.tsx` (ESCOLHIDA)

Criar `src/app/(authenticated)/layout.tsx` que envolve as rotas
`/painel/*` (e o catch-all de sign-in/sign-up). Provider monta apenas
nesse subtree.

- **Prós**: rotas anônimas continuam sem Clerk no bundle (ADR-022 §4
  preservado); rotas privadas têm Provider + hooks client; isolamento
  natural pelo Next.js route group (não muda URL).
- **Contras**: precisa garantir que `auth-island.tsx` da navbar continua
  funcionando para anônimos sem o Provider no `<html>` — já funciona,
  é a topologia atual; route group apenas adiciona uma camada **em cima**.
- **Veredicto**: **escolhida**. Resolve a limitação de C2 sem regredir
  bundle de C1.

## Consequências

### Positivas

- Schema simples, queriable em SQL puro, introspectável em Drizzle Studio.
- UUIDv7 PK preserva soberania de dados — trocar Clerk re-mapeia uma
  coluna (`clerk_user_id`), não a árvore inteira de FKs.
- `follows` flat reduz complexidade do `ParlamentarCard` para um único
  toggle.
- Route group `(authenticated)/` mantém o gain de bundle do ADR-022 §4
  intacto enquanto destrava hooks client em telas privadas.
- `consent_log.user_id` nullable cumpre LGPD art. 8º §6º sem reter dado
  pessoal após anonimização.

### Negativas

- FK cross-schema (`follows.parlamentar_id` referencia
  `parlamentares.parlamentar.id`) — Drizzle suporta, mas exige atenção em
  migrations e introspecção.
- Cap 200 follows enforçado em API duplica conhecimento (precisa estar no
  handler + idealmente em UI). Aceito para evitar peso de constraint SQL.
- Manutenção do salt diário do `ip_hash` exige rotação operacional
  documentada (cron simples; tarefa Etapa 9).
- Route group adiciona uma camada de aninhamento em `src/app/`. Pequeno
  custo cognitivo; mitigado pela convenção Next.js.

### Neutras

- ADR-022 permanece válido; o `<ClerkProvider>` em
  `(authenticated)/layout.tsx` é **adicional** ao `<ClerkProvider>` de
  escopo restrito que vive em `auth-island.tsx` (este último continua
  servindo a navbar pública).
- Bounded context novo segue ADR-013 (schema por bounded context) sem
  expansão de princípio.

## Referências

- [LOGGED-AREA-VISION §3 (Modelo de domínio) e §4 (Arquitetura de rotas)](../../product/LOGGED-AREA-VISION.md)
- [ADR-013 — Schema por bounded context](013-schema-por-bounded-context.md)
- [ADR-018 — Cache edge no app](018-cache-edge-app.md)
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-022 — Clerk para autenticação](022-clerk-para-autenticacao.md) — §4 (topologia do Provider) e §Consequências/Neutras (promise de ADR de schema)
- Next.js Route Groups: `https://nextjs.org/docs/app/building-your-application/routing/route-groups`
