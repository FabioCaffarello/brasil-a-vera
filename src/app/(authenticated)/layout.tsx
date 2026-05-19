// Route group `(authenticated)/` — Wave 10 Etapa 1, revisado em
// fix/wave-10-single-clerk-provider e em Etapa 9.3.
//
// **Mudança Wave 10 fix**: o `<ClerkProvider>` que vivia aqui foi
// removido. Provider agora mora UMA SÓ VEZ no root layout
// (`src/app/layout.tsx`) — descoberta empírica: múltiplos Providers
// em árvores siblings causam erro do Clerk:
//
//   @clerk/nextjs: You've added multiple <ClerkProvider> components
//
// **Mudança Etapa 9.3**: o layout passou de pass-through para
// wrapper com `<ConsentGate />`. O gate é RSC server-side: consulta
// consent_log do usuário e, se a versão aceita ≠ PRIVACY_POLICY_VERSION,
// renderiza o modal de re-aceite no lugar dos children. Sem flash
// de conteúdo embaixo do modal (decisão é server-side antes de
// streamar children).
//
// Sub-rotas cobertas pelo route group: `/painel/*`, `/sign-in/*`,
// `/sign-up/*`. O gate early-returns quando `auth()` é anônimo, então
// /sign-in para visitantes não-autenticados passa direto pelo gate.
// Para um usuário autenticado que navegue para /sign-in (caso raro),
// o modal aparece — aceitável; o usuário não deveria estar lá.

import { ConsentGate } from '@/components/painel/consent-gate/consent-gate'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ConsentGate>{children}</ConsentGate>
}
