import { Button, Chip } from '@fabio.caffarello/react-design-system'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function RdsSmokeAsChildPage() {
  return (
    <main
      style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      <h1>RDS 3.3.1 — smoke A (asChild)</h1>

      <section data-test="button-aschild">
        <h2>Button asChild + next/link</h2>
        <p>
          Should render{' '}
          <code>&lt;a href="/parlamentares/X" data-prefetch&gt;</code> carrying
          Button classes — NOT <code>&lt;button&gt;</code>.
        </p>
        <Button asChild variant="primary">
          <Link href="/parlamentares/204554" prefetch>
            Ver perfil completo
          </Link>
        </Button>
      </section>

      <section data-test="chip-aschild">
        <h2>Chip asChild + next/link (selected)</h2>
        <p>
          Should render a single <code>&lt;a href="/busca?tema=…"&gt;</code>{' '}
          wearing chip classes; no nested-interactive (no{' '}
          <code>&lt;button&gt;</code> inside the
          <code>&lt;a&gt;</code>).
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Chip asChild selected>
            <Link href="/busca?tema=saude">Saúde</Link>
          </Chip>
          <Chip asChild>
            <Link href="/busca?tema=educacao">Educação</Link>
          </Chip>
        </div>
      </section>
    </main>
  )
}
