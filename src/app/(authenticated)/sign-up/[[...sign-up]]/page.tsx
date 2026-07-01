// Custom sign-up catch-all — Wave 10 Etapa 1.
// Mesma estratégia do sign-in (ver page.tsx irmão). Catch-all cobre
// `/sign-up`, `/sign-up/verify-email-address`, `/sign-up/continue`, etc.

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center py-12">
      <SignUp />
    </div>
  )
}
