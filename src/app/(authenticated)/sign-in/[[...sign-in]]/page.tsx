// Custom sign-in catch-all — Wave 10 Etapa 1.
//
// Substitui o stub server-side antigo em `src/app/sign-in/page.tsx` que
// redirecionava para o Account Portal hosted do Clerk. Agora o fluxo de
// login acontece DENTRO de `brasilavera.org` — alinha com o princípio
// 2 do LOGGED-AREA-VISION (privacidade é feature; sem redirecionamento
// para subdomínio terceirizado).
//
// Métodos habilitados no Clerk Dashboard: email + senha e Google OAuth.
// Aparecem automaticamente — não precisamos enumerar no componente.
//
// Catch-all `[[...sign-in]]` cobre as URLs internas do fluxo Clerk
// (`/sign-in`, `/sign-in/factor-one`, `/sign-in/sso-callback`, etc.).
// Padrão obrigatório quando se usa `<SignIn />` em rota custom.

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  )
}
