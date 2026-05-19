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

# Wave 10 Etapa 1 — webhook do Clerk (sincroniza usuario.user_profile).
# Em Clerk Dashboard → Webhooks → Add Endpoint, criar com:
#   URL:     https://brasilavera.org/api/webhooks/clerk
#   Eventos: user.created, user.updated, user.deleted
# Copiar o "Signing secret" gerado pelo Clerk (prefixado por whsec_).
CLERK_WEBHOOK_SECRET=whsec_...
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
- `CLERK_WEBHOOK_SECRET` é apenas runtime (handler em `app/api/webhooks/clerk`).
  Mesma regra do `CLERK_SECRET_KEY`.

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
wrangler secret put CLERK_WEBHOOK_SECRET   # Wave 10 Etapa 1
```

Mas atenção — `NEXT_PUBLIC_*` precisa estar disponível em **build time**,
não só runtime. Se a build acontece em GitHub Actions, o secret precisa
estar lá também (próximo bloco).

### GitHub Actions secrets

Em `Settings → Secrets and variables → Actions`, adicione:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — exposto via `env:` no step de build
- `CLERK_SECRET_KEY` — exposto via `env:` no step de build (runtime do
  Worker pode usar Workers Secret também, mas duplicar não machuca)
- `CLERK_WEBHOOK_SECRET` — apenas runtime (handler em `app/api/webhooks/clerk`);
  preferir Workers Secret e omitir do build env

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
Na Wave 10, `auth.protect()` será adicionado para `/painel/*` apenas.

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

## Webhook do Clerk — Wave 10 Etapa 1

Endpoint: `POST /api/webhooks/clerk` em `src/app/api/webhooks/clerk/route.ts`.
Auth via assinatura HMAC do Svix (NÃO usa session do Clerk). Sincroniza
`usuario.user_profile` em resposta a eventos `user.created` / `user.updated`
/ `user.deleted`.

### Setup no Clerk Dashboard

1. Dashboard → seu projeto → **Webhooks** → **Add Endpoint**
2. URL: `https://brasilavera.org/api/webhooks/clerk`
3. Em "Subscribe to events", marcar: `user.created`, `user.updated`, `user.deleted`
4. Copiar **Signing secret** (formato `whsec_...`)
5. Configurar como `CLERK_WEBHOOK_SECRET` em `.env.local`, `.dev.vars` e
   Workers Secret (ver seções acima)

### Setup no Clerk Dashboard (custom sign-in/sign-up)

Wave 10 Etapa 1 introduz rotas custom de sign-in/sign-up dentro do site.

1. Dashboard → **Customization → Paths**:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/painel`
   - After sign-up URL: `/painel`
2. Em **Domains → Authorized origins**, garantir que `https://brasilavera.org`
   está autorizado (já estava desde Sprint 4.1; só confirmar)

### Testes locais

Webhook precisa de URL pública para o Clerk alcançar. Em dev local, usar
ngrok / cloudflared tunnel / Clerk CLI:

```bash
# Opção A — Clerk CLI (recomendado)
clerk webhook forward --endpoint /api/webhooks/clerk

# Opção B — ngrok
ngrok http 3000
# Copiar a URL pública para o endpoint do Clerk Dashboard
```

### Troubleshooting webhook

- `400 Invalid webhook` no log → headers `svix-*` ausentes (request não vem do Clerk) ou assinatura inválida (secret errado). Confirmar que `CLERK_WEBHOOK_SECRET` bate com o do Dashboard.
- `500 Server misconfigured` → `CLERK_WEBHOOK_SECRET` não está no ambiente. Workers: rodar `wrangler secret list`.
- Webhook 5xx fica em retry exponencial pelo Clerk; entradas com 4xx vão para Dead Letter no Dashboard.
