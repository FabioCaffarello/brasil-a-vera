// Comparar parlamentares (lado a lado) — promovida ao RDS (migração ADR-033).
// Consome o design system @fabio.caffarello/react-design-system — tokens
// traduzidos pela tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// - HeroSection do RDS /server; SectionCard (Card compound do RDS);
//   ConcordanciaMatrix/ParlamentaresGrid de @/components/comparar.
// - DataBadge consolidado no RDS (ADR-038). ErrorState é helper local inline.
// - Caixa "comparativo indisponível" mantém `border-warning/40 bg-warning/10`
//   (BaV neutralizado) + `text-fg-warning`.

import {
  DataBadge,
  HeroSection,
  SectionCard,
} from '@fabio.caffarello/react-design-system/server'
import { Columns3 } from 'lucide-react'
import { ConcordanciaMatrix } from '@/components/comparar/concordancia-matrix'
import { ParlamentaresGrid } from '@/components/comparar/parlamentares-grid'
import { SeletorComparacao } from '@/components/comparar/seletor-comparacao'
import { getCompararParlamentares } from '@/lib/queries/comparar'
import { listParlamentares } from '@/lib/queries/parlamentares'

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
 * Tela de entrada do comparativo — auditoria UX 2026-07-20 (P1.6). Antes, o
 * estado sem IDs mostrava uma caixa de erro instruindo a montar a URL à mão
 * com UUIDs; agora é a porta de entrada da feature: hero + seletor zero-JS.
 * `aviso` cobre os casos de URL malformada/parcial sem tom de erro fatal.
 */
async function EntradaComparar({
  aviso,
  selecionados,
}: {
  aviso?: string
  selecionados: string[]
}) {
  const parlamentares = await listParlamentares()
  return (
    <>
      <HeroSection
        align="center"
        description="Escolha 2 ou 3 parlamentares e veja lado a lado presença em votações nominais, proposições de autoria, gastos da cota e concordância de voto."
        kicker={
          <DataBadge
            icon={<Columns3 className="h-3 w-3" />}
            label="Comparativo"
            source="L1 · oficial"
            tone="dataviz"
          />
        }
        title="Compare parlamentares lado a lado"
        variant="plain"
      />
      <div className="mx-auto max-w-3xl space-y-5 pb-8">
        {aviso && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <p className="text-fg-warning text-sm">{aviso}</p>
          </div>
        )}
        <SectionCard
          id="escolher"
          subtitle="A comparação usa apenas dados oficiais — mesma janela e mesma fórmula para todos."
          title="Escolha quem comparar"
        >
          <SeletorComparacao
            parlamentares={parlamentares}
            selecionados={selecionados}
          />
        </SectionCard>
      </div>
    </>
  )
}

export default async function CompararPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { ids, hasInvalid } = parseIds(params.ids)
  const unique = Array.from(new Set(ids))

  if (unique.length < 2) {
    return (
      <EntradaComparar
        aviso={
          hasInvalid
            ? 'O link continha identificadores inválidos — selecione os parlamentares abaixo.'
            : unique.length === 1
              ? 'Falta escolher pelo menos mais 1 parlamentar para comparar.'
              : undefined
        }
        selecionados={unique}
      />
    )
  }
  if (unique.length > 3) {
    return (
      <EntradaComparar
        aviso="O comparativo aceita no máximo 3 parlamentares — escolha até 3 abaixo."
        selecionados={unique.slice(0, 3)}
      />
    )
  }

  const result = await getCompararParlamentares(unique)
  if (!result) {
    return (
      <EntradaComparar
        aviso="Um ou mais parlamentares do link não foram encontrados na base — selecione abaixo."
        selecionados={[]}
      />
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
            tone="dataviz"
          />
        }
        title={`${result.parlamentares.length} parlamentares lado a lado`}
        variant="plain"
      />

      <div className="mx-auto max-w-5xl space-y-5 pb-8">
        <SectionCard
          id="comparacao"
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
          id="concordancia"
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
