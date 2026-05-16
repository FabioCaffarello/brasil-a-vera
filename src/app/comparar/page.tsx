import { ConcordanciaMatrix } from '@/components/comparar/concordancia-matrix'
import { ParlamentaresGrid } from '@/components/comparar/parlamentares-grid'
import { getCompararParlamentares } from '@/lib/queries/comparar'

export const metadata = {
  title: 'Comparar parlamentares — Brasil a Vera',
  description: 'Compara 2-3 parlamentares lado a lado.',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PageProps {
  searchParams: Promise<{ ids?: string | string[] }>
}

function parseIds(raw: string | string[] | undefined): {
  ids: string[]
  hasInvalid: boolean
} {
  if (!raw) return { ids: [], hasInvalid: false }
  const flat = Array.isArray(raw) ? raw.join(',') : raw
  const tokens = flat
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  let hasInvalid = false
  const ids: string[] = []
  for (const t of tokens) {
    if (UUID_RE.test(t)) ids.push(t)
    else hasInvalid = true
  }
  return { ids, hasInvalid }
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="mb-3">
        <h2 className="font-medium text-foreground-muted text-sm uppercase tracking-wide">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-foreground-muted text-xs">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

// ErrorState (D4 Sprint 4.3 herdada): caixa de "comparativo indisponível"
// migrada de amber para warning subtle, mesmo padrão de `ParesContraditorios`
// e `AlinhamentoBancada` (amostra insuficiente).
function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-5">
        <h1 className="font-medium text-base text-warning">
          Comparativo indisponível
        </h1>
        <p className="mt-1 text-sm text-warning">{message}</p>
        <p className="mt-3 text-warning text-xs">
          Use a URL com 2 ou 3 IDs separados por vírgula:
          <br />
          <code className="font-mono">
            /comparar?ids=&lt;uuid1&gt;,&lt;uuid2&gt;
          </code>
        </p>
      </div>
    </div>
  )
}

export default async function CompararPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { ids, hasInvalid } = parseIds(params.ids)
  const unique = Array.from(new Set(ids))

  if (hasInvalid && unique.length === 0) {
    return (
      <ErrorState message="Nenhum ID válido encontrado. IDs devem ser UUIDs no formato 8-4-4-4-12." />
    )
  }
  if (unique.length < 2) {
    return (
      <ErrorState
        message={`Selecione 2 ou 3 parlamentares para comparar. ${
          unique.length === 0 ? 'Nenhum' : 'Apenas 1'
        } ID fornecido.`}
      />
    )
  }
  if (unique.length > 3) {
    return (
      <ErrorState message="Máximo 3 parlamentares simultâneos. Remova alguns IDs e tente de novo." />
    )
  }

  const result = await getCompararParlamentares(unique)
  if (!result) {
    return (
      <ErrorState message="Um ou mais IDs não correspondem a parlamentares na base. Verifique se os IDs estão corretos." />
    )
  }

  const nomesPorId = new Map(
    result.parlamentares.map((p) => [p.id, p.nome.split(' ')[0] ?? p.nome]),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <p className="font-mono text-foreground-muted text-xs uppercase tracking-wider">
          Comparativo
        </p>
        <h1 className="font-bold text-3xl text-foreground">
          {result.parlamentares.length} parlamentares lado a lado
        </h1>
        {hasInvalid && (
          <p className="text-warning text-xs">
            Alguns IDs fornecidos não eram UUIDs válidos e foram ignorados.
          </p>
        )}
      </header>

      <Section
        title="Comparação"
        hint="Presença em votações nominais, autoria primária de proposições, gastos CEAP do ano corrente."
      >
        <ParlamentaresGrid
          parlamentares={result.parlamentares}
          metricas={result.metricas}
          ano={result.ano}
        />
      </Section>

      <Section
        title="Concordância entre pares"
        hint={`% de coincidência nos votos das votações em comum (mín. ${
          // Linkar para constante via texto literal é OK porque é estável.
          5
        } votações comparáveis para considerar amostra estatisticamente válida)`}
      >
        <ConcordanciaMatrix
          pares={result.concordancia}
          nomesPorId={nomesPorId}
        />
      </Section>
    </div>
  )
}
