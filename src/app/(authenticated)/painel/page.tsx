// `/painel` — Wave 10 Etapa 1 (placeholder).
//
// Página vazia "em construção" só para validar o fluxo:
//   1. Anônimo é redirecionado pelo middleware (auth.protect()) para /sign-in
//   2. Após login, Clerk redireciona para /painel (signInFallbackRedirectUrl)
//   3. Esta RSC faz lazy upsert do user_profile no primeiro hit autenticado
//      (Clerk = source of truth para email/nome; nós sincronizamos sob demanda)
//   4. Renderiza greeting com o display_name persistido
//
// Sobre o lazy upsert: optamos por NÃO usar webhook do Clerk (Wave 10 Etapa 1).
// Razão: método tradicional com `currentUser()` no primeiro hit é mais simples
// e suficiente para o escopo atual. Se a Wave 10 precisar reagir a eventos
// `user.deleted` em tempo real ou cobrir mudanças que não passam por /painel
// (ex.: alguém muda email no Clerk Account Portal e quer ver refletido sem
// abrir o painel), reabrir webhook em wave futura.
//
// Etapas seguintes (LOGGED-AREA-VISION §8):
//   Etapa 2 — botão Acompanhar em ParlamentarCard + tabela follows
//   Etapa 3 — Resumo com 4 estados + Wizard de onboarding

import { auth, currentUser } from '@clerk/nextjs/server'

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

  // Lazy upsert: sincroniza user_profile com Clerk no primeiro hit do
  // /painel após signup (ou após mudança de email/nome no Clerk Account
  // Portal). É o caminho principal de criação do perfil, não fallback.
  let profile = await findUserProfileByClerkId(userId)
  if (!profile) {
    const user = await currentUser()
    if (user) {
      const primaryEmail =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ?? user.emailAddresses[0]?.emailAddress
      if (primaryEmail) {
        const nameParts = [user.firstName, user.lastName].filter(
          (s): s is string => s !== null && s.trim() !== '',
        )
        await upsertUserProfileFromClerk({
          clerkUserId: userId,
          email: primaryEmail,
          displayName: nameParts.length === 0 ? null : nameParts.join(' '),
        })
        profile = await findUserProfileByClerkId(userId)
      }
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
