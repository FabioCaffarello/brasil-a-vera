import { Button } from '@fabio.caffarello/react-design-system'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function RdsSmokeLinkPage() {
  return (
    <main
      style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <h1>RDS 3.3.1 — smoke C (Button variant="link" + asChild)</h1>
      <p>
        Canonical brasil-a-vera pattern: text-only call-to-action that navigates
        via next/link, no chrome, underline on hover.
      </p>

      <section data-test="button-variant-link">
        <Button variant="link" asChild>
          <Link href="/parlamentares/204554" prefetch>
            Ver perfil completo →
          </Link>
        </Button>
      </section>

      <section data-test="button-variant-link-bare">
        <p>
          For contrast, the same variant without asChild (renders a real
          button):
        </p>
        <Button variant="link">Cancelar</Button>
      </section>
    </main>
  )
}
