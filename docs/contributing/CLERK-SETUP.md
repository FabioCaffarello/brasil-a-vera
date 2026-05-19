# Clerk — setup local

> Brasil a Vera · Contributing · v0.1
> Introduzido na Sprint 4.1 PR 1 (Wave 4 — Design System & Frontend de
> Excelência). Governança: [ADR-022](../architecture/ADR/022-clerk-para-autenticacao.md).

Este guia cobre o que um contribuidor precisa fazer para rodar Brasil a
Vera localmente com Clerk integrado. Se você só vai mexer em rotas
públicas (que não dependem de auth), pode pular — Clerk está configurado
de forma "dormente" no 4.1 e não afeta rotas anônimas além do JS do
Provider no client.

## Variáveis de ambiente

Adicione ao seu `.env.local` (gitignored):

```bash
# Clerk — https://dashboard.clerk.com
# Crie uma "Application" em dev mode e copie:
#   API Keys → Publishable key
#   API Keys → Secret keys → Secret key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Notas:

- `NEXT_PUBLIC_*` vars são **inlined no bundle** durante `next build`.
  Para `npm run cf:build` rodar localmente, exporte no shell antes:
  ```bash
  export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  npm run cf:build
  ```
- `CLERK_SECRET_KEY` é apenas runtime (middleware + RSC server). Não
  precisa estar disponível no build.

## `cf:preview` localmente

O Cloudflare Wrangler lê `.dev.vars` (também gitignored), não `.env.local`.
Para `npm run cf:preview` funcionar com Clerk:

```bash
# Copie as mesmas vars do .env.local para .dev.vars
cp .env.local .dev.vars
# (gitignore já cobre)
```

Ou simplesmente:

```bash
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..." >> .dev.vars
echo "CLERK_SECRET_KEY=sk_test_..." >> .dev.vars
```

## Produção (Cloudflare Workers + GitHub Actions)

### Workers Secrets

Configurar uma vez via Wrangler:

```bash
wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
wrangler secret put CLERK_SECRET_KEY
```

Mas atenção — `NEXT_PUBLIC_*` precisa estar disponível em **build time**,
não só runtime. Se a build acontece em GitHub Actions, o secret precisa
estar lá também (próximo bloco).

### GitHub Actions secrets

Em `Settings → Secrets and variables → Actions`, adicione:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — exposto via `env:` no step de build
- `CLERK_SECRET_KEY` — exposto via `env:` no step de build (runtime do
  Worker pode usar Workers Secret também, mas duplicar não machuca)

No workflow `.github/workflows/deploy.yml`:

```yaml
- name: Build (Cloudflare)
  env:
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
    CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  run: npm run cf:build
```

## Account Portal hosted vs sign-in custom

No Sprint 4.1, **não criamos rota custom de sign-in**. O fluxo é:

1. Usuário anônimo no header vê botão "Entrar"
2. Click → redirecionado para
   `https://accounts.<app>.clerk.accounts.dev/sign-in`
3. Login via Google/email/etc.
4. Volta para o Brasil a Vera autenticado (cookie de session)
5. Header renderiza `<UserButton>`

Wave 10 substitui este fluxo pelo custom sign-in catch-all em
`app/sign-in/[[...sign-in]]/page.tsx` com `signInUrl="/sign-in"`
configurado no `<ClerkProvider>` do route group `(authenticated)/`.
Ver [LOGGED-AREA-VISION](../product/LOGGED-AREA-VISION.md) §4 e
[ADR-029](../architecture/ADR/029-modelo-dados-area-logada-e-topologia-auth.md).
Por ora (pré-Wave 10), Account Portal hosted continua sendo o gate.
O escopo originalmente previsto em `/minha-area/sign-in` foi
rebrandeado para `/sign-in/[[...sign-in]]` na Wave 10.

## Troubleshooting

### Erro "Missing publishableKey" no build

Você esqueceu de definir `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Confira
`.env.local` e (para Cloudflare) `.dev.vars`.

### `cf:preview` quebra mas `npm run dev` funciona

`.env.local` é lido pelo Next dev server; `.dev.vars` é lido pelo
Wrangler. Sincronize os dois.

### Botão "Entrar" não aparece (UserButton sempre visível mesmo sem login)

Pré-Wave 10: o matcher do middleware é amplo (cobre todas as rotas
não-asset desde Sprint 4.2 PR 1) mas `clerkMiddleware()` roda em
modo dormente — sem `auth.protect()`. O AuthIslandLoader decide
client-side entre `<SignInButton>` e `<UserButton>` via `<Show when>`.
Veja `src/middleware.ts` e [ADR-022](../architecture/ADR/022-clerk-para-autenticacao.md) §3 v4.
Na Wave 10, `auth.protect()` foi adicionado para `/painel(.*)` apenas. (Pós-refator do painel — ver [RFC](../product/REFACTOR-PAINEL-TABS.md) — a topologia multi-rota original virou rota única com tabs via Parallel Routes; o matcher continua cobrindo corretamente o destino `/painel` raiz + query params.)

### Bundle gzip da home explode após adicionar Clerk

Esperado: Clerk SDK do client adiciona ~30-100kb gzip. O `<UserButton>`
está em ilha cliente lazy (`next/dynamic` com `ssr: false`), então só
baixa quando usuário autenticado. Para usuário anônimo, apenas o
`<ClerkProvider>` carrega — esse é o custo medido na ADR-022 §5.

Se quiser reduzir mais, considerar mover `<ClerkProvider>` para um route
group `(authenticated)/` (decisão pendente para Sprint 4.5).

## Referências

- [ADR-022](../architecture/ADR/022-clerk-para-autenticacao.md) — governança
- [ADR-029](../architecture/ADR/029-modelo-dados-area-logada-e-topologia-auth.md) — modelo `user_profile` + topologia route group
- [LOGGED-AREA-VISION](../product/LOGGED-AREA-VISION.md) — ground truth Wave 10
- [Clerk docs](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Workers integration](https://clerk.com/docs/quickstarts/nextjs#cloudflare-workers)
- [Clerk Webhooks (Svix)](https://clerk.com/docs/webhooks/overview)
- [OpenNext + middleware.ts](https://github.com/opennextjs/opennextjs-cloudflare/issues/962) — por que mantemos `middleware.ts`, não `proxy.ts`

## Setup no Clerk Dashboard (Wave 10 Etapa 1)

Wave 10 Etapa 1 introduz rotas custom de sign-in/sign-up dentro do site:

1. Dashboard → **Customization → Paths**:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/painel`
   - After sign-up URL: `/painel`
2. Em **Domains → Authorized origins**, garantir que `https://brasilavera.org`
   está autorizado (já estava desde Sprint 4.1; só confirmar)

## Sincronização do `user_profile` — método tradicional (sem webhook)

A Wave 10 Etapa 1 **não usa webhook do Clerk**. A sincronização da tabela
`usuario.user_profile` com o Clerk acontece via **lazy upsert** na RSC do
`/painel`:

1. Usuário autentica via custom sign-in/sign-up.
2. Clerk redireciona para `/painel`.
3. A RSC do `/painel` busca o profile por `clerk_user_id`. Se não existir,
   chama `currentUser()` do `@clerk/nextjs/server`, extrai email primário
   e display name, e faz `INSERT … ON CONFLICT DO UPDATE`.
4. A mesma rotina cobre mudanças posteriores (alterar email/nome no Clerk
   Account Portal) — basta o usuário abrir o `/painel` para a tabela
   refletir.

Justificativa: método tradicional é suficiente para o escopo Wave 10
(login funciona, profile criado, dashboard mostra dados certos). Se uma
wave futura precisar reagir a `user.deleted` em tempo real ou cobrir
mudanças que NÃO passam pelo `/painel`, reabrir webhook nessa wave com
`svix` + endpoint POST `/api/webhooks/clerk`.
