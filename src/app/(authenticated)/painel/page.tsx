// `/painel` — Wave 10 Etapa 1 (placeholder).
//
// Página vazia "em construção" só para validar o fluxo:
//   1. Anônimo é redirecionado pelo middleware (auth.protect()) para /sign-in
//   2. Após login, Clerk redireciona para /painel (signInFallbackRedirectUrl)
//   3. Webhook user.created criou user_profile via /api/webhooks/clerk
//   4. Esta página resolve clerk_user_id → user_profile no banco
//      (lazy upsert se webhook atrasou) e mostra greeting
//
// Etapas seguintes (LOGGED-AREA-VISION §8):
//   Etapa 2 — botão Acompanhar em ParlamentarCard + tabela follows
//   Etapa 3 — Resumo com 4 estados + Wizard de onboarding

import { auth, currentUser } from '@clerk/nextjs/server'

import { composeDisplayName, extractPrimaryEmail } from '@/lib/clerk-webhook'
import {
  findUserProfileByClerkId,
  upsertUserProfileFromClerk,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

export default async function PainelPage() {
  // Middleware já garantiu autenticação (auth.protect() em /painel/*).
  // userId aqui sempre existe; assert defensivo via destructuring.
  const { userId } = await auth()
  if (!userId) {
    // Estado impossível em prod (middleware redireciona antes), mas
    // type-narrowing força o check.
    return null
  }

  // Lazy upsert: cobre o caso raro de o webhook ter atrasado/falhado
  // e o usuário hitar /painel antes do user_profile existir. Não bloqueia
  // o fluxo nem trata como erro — webhook eventualmente alcança.
  let profile = await findUserProfileByClerkId(userId)
  if (!profile) {
    const user = await currentUser()
    if (user) {
      await upsertUserProfileFromClerk({
        clerkUserId: userId,
        email: extractPrimaryEmail({
          id: user.id,
          primary_email_address_id: user.primaryEmailAddressId,
          email_addresses: user.emailAddresses.map((e) => ({
            id: e.id,
            email_address: e.emailAddress,
          })),
          first_name: user.firstName,
          last_name: user.lastName,
        }),
        displayName: composeDisplayName({
          id: user.id,
          primary_email_address_id: user.primaryEmailAddressId,
          email_addresses: [],
          first_name: user.firstName,
          last_name: user.lastName,
        }),
      })
      profile = await findUserProfileByClerkId(userId)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-semibold text-3xl text-foreground tracking-tight">
        Em construção
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Olá, {profile?.displayName ?? profile?.email ?? 'cidadão(ã)'}. A área
        logada do Brasil à Vera está sendo construída em fases.
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        Esta é a Etapa 1 (autenticação + perfil) da Wave 10. Próximas etapas
        habilitam acompanhamento de parlamentares, alertas semanais e dashboard
        LGPD.
      </p>
      <p className="mt-4 text-muted-foreground text-sm">
        Documento de visão:{' '}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/product/LOGGED-AREA-VISION.md"
          rel="noreferrer"
          target="_blank"
        >
          LOGGED-AREA-VISION.md
        </a>
      </p>
    </div>
  )
}
