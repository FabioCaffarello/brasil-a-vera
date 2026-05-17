import { Columns3 } from 'lucide-react'

import { ConcordanciaMatrix } from '@/components/comparar/concordancia-matrix'
import { ParlamentaresGrid } from '@/components/comparar/parlamentares-grid'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { SectionCard } from '@/design-system/compositions/section-card'
import { getCompararParlamentares } from '@/lib/queries/comparar'

export const metadata = {
  title: 'Comparar parlamentares — Brasil à Vera',
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

/**
 * ErrorState — Sprint 4.3 D4 herdada. Caixa de "comparativo indisponível"
 * em warning subtle (mesmo padrão `ParesContraditorios`, `AlinhamentoBancada`
 * com amostra insuficiente). Mantido como helper local Sprint 6.4 — é
 * warning cirúrgico, não cabe em composição genérica.
 */
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
    <>
      <HeroSection
        description={
          hasInvalid
            ? 'Alguns IDs fornecidos não eram UUIDs válidos e foram ignorados.'
            : undefined
        }
        kicker={
          <DataBadge
            icon={<Columns3 className="h-3 w-3" />}
            label="Comparativo"
            tone="accent"
          />
        }
        title={`${result.parlamentares.length} parlamentares lado a lado`}
        variant="plain"
      />

      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-8">
        <SectionCard
          subtitle="Presença em votações nominais, autoria primária de proposições, gastos CEAP do ano corrente."
          title="Comparação"
        >
          <ParlamentaresGrid
            ano={result.ano}
            metricas={result.metricas}
            parlamentares={result.parlamentares}
          />
        </SectionCard>

        <SectionCard
          subtitle={`% de coincidência nos votos das votações em comum (mín. 5 votações comparáveis para considerar amostra estatisticamente válida).`}
          title="Concordância entre pares"
        >
          <ConcordanciaMatrix
            nomesPorId={nomesPorId}
            pares={result.concordancia}
          />
        </SectionCard>
      </div>
    </>
  )
}
