// Custom sign-up catch-all — Wave 10 Etapa 1.
// Mesma estratégia do sign-in (ver page.tsx irmão). Catch-all cobre
// `/sign-up`, `/sign-up/verify-email-address`, `/sign-up/continue`, etc.

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <SignUp />
    </div>
  )
}
