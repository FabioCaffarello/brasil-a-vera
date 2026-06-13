// Onda HeroSection — cópia-rds da rota /comparar sob /rds/ para validar a
// migração ao @fabio.caffarello/react-design-system 3.12.0 (a 3.12.0
// destravou HeroSection, #163, junto com /busca e a home). Convive em
// paralelo com a rota original (strangler fig); promoção é decisão futura.
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Substituições estruturais vs original:
// - HeroSection (composição local) → HeroSection do RDS /server
//   (server-safe; API local→RDS 1:1 — kicker/title/description/variant/align;
//   precedente §3.14/§3.17). Diferença de typography do h1 (RDS
//   text-3xl sm:text-4xl vs local text-4xl..6xl) aceita — é a typography do
//   componente adotado, não token fora do mapa.
// - SectionCard (composição local)  → cópia LOCAL sobre Card compound do RDS
//   (./_components/section-card.tsx — reuso verbatim da piloto-2 / busca).
// - ConcordanciaMatrix/ParlamentaresGrid → cópias LOCAIS de domínio,
//   traduzidas 1:1 (./_components/). Originais INTOCADOS.
// - DataBadge → mantido LOCAL (import do original; sem par RDS — precedente
//   listagens/perfis/busca, kicker do hero com tone="accent").
// - ErrorState → helper local reconstruído inline traduzido (warning
//   cirúrgico, precedente piloto-1/5/6 de helper local).
//
// Lógica de query (getCompararParlamentares), parse/validação de ids e
// contrato dos 4 estados de erro preservados do original. Exemplo de URL no
// ErrorState reescrito pra /rds/comparar (navegação CONTIDA na staging).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   text-warning            → text-fg-warning
// Tokens homônimos (sem tradução — base warning/N idêntica dos dois lados,
//   ext. piloto-2 generalizada por papel utility, princípio piloto-5):
//   border-warning/40 bg-warning/10 (caixa de comparativo indisponível).

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { Columns3 } from 'lucide-react'

import { DataBadge } from '@/design-system/compositions/data-badge'
import { getCompararParlamentares } from '@/lib/queries/comparar'
import { ConcordanciaMatrix } from './_components/concordancia-matrix'
import { ParlamentaresGrid } from './_components/parlamentares-grid'
import { SectionCard } from './_components/section-card'

export const metadata = {
  title: 'Comparar parlamentares (rds-pilot) — Brasil à Vera',
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
 * warning cirúrgico, não cabe em composição genérica. Tokens: `text-warning`
 * → `text-fg-warning`; `border-warning/40`/`bg-warning/10` homônimos.
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-5">
        <h1 className="font-medium text-base text-fg-warning">
          Comparativo indisponível
        </h1>
        <p className="mt-1 text-fg-warning text-sm">{message}</p>
        <p className="mt-3 text-fg-warning text-xs">
          Use a URL com 2 ou 3 IDs separados por vírgula:
          <br />
          <code className="font-mono">
            /rds/comparar?ids=&lt;uuid1&gt;,&lt;uuid2&gt;
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
        align="center"
        description={
          hasInvalid
            ? 'Alguns IDs fornecidos não eram UUIDs válidos e foram ignorados.'
            : undefined
        }
        kicker={
          <DataBadge
            icon={<Columns3 className="h-3 w-3" />}
            label="Comparativo"
            source="L1 · oficial"
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
