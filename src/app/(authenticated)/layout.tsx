// Route group `(authenticated)/` — Wave 10 Etapa 1, revisado em
// fix/wave-10-single-clerk-provider.
//
// **Mudança Wave 10 fix**: o `<ClerkProvider>` que vivia aqui foi
// removido. Provider agora mora UMA SÓ VEZ no root layout
// (`src/app/layout.tsx`) — descoberta empírica: múltiplos Providers
// em árvores siblings causam erro do Clerk:
//
//   @clerk/nextjs: You've added multiple <ClerkProvider> components
//
// Este layout permanece como pass-through para preservar o route
// group como organização lógica (rotas `/painel/*`, `/sign-in/[[...]]`,
// `/sign-up/[[...]]` vivem aqui mesmo sem layout próprio adicionar
// JSX). Future-proof: se precisar de UI específica de rotas
// autenticadas (ex.: navbar privada, breadcrumbs), entra aqui sem
// reorganizar arquivos. ADR-029 §6 v2 (addendum Wave 10).

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
