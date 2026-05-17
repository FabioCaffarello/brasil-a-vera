import { SearchX } from 'lucide-react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { TrustBanner } from '@/components/trust-banner'
import { EmptyState } from '@/components/ui/empty-state'
import { FiltrosVotacao } from '@/components/votacao/filtros'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { Button } from '@/design-system/primitives/button'
import {
  type Casa,
  type FiltrosVotacao as Filtros,
  getAnosVotacaoDistintos,
  listVotacoes,
} from '@/lib/queries/votacoes'

export const metadata = {
  title: 'Votações — Brasil à Vera',
  description:
    'Votações em plenário e comissões na Câmara e no Senado. Filtros por casa, ano e resultado.',
  alternates: {
    types: {
      'application/rss+xml': '/feed/votacoes',
    },
  },
}

function normalizeCasa(value: string | undefined): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

function normalizeResultado(
  value: string | undefined,
): 'aprovadas' | 'rejeitadas' | undefined {
  if (value === 'aprovadas' || value === 'rejeitadas') return value
  return undefined
}

function normalizeAno(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 1900 && n < 2100 ? n : undefined
}

interface PageProps {
  searchParams: Promise<{
    casa?: string
    ano?: string
    resultado?: string
    somenteNominais?: string
  }>
}

export default async function VotacoesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros: Filtros = {
    casa: normalizeCasa(params.casa),
    ano: normalizeAno(params.ano),
    resultado: normalizeResultado(params.resultado),
    somenteNominais: params.somenteNominais === '1',
  }

  const LIMITE = 50
  const [votacoes, anos] = await Promise.all([
    listVotacoes(filtros, LIMITE),
    getAnosVotacaoDistintos(),
  ])

  return (
    <>
      <HeroSection
        description="Plenário e comissões da Câmara e do Senado. A maioria das votações em comissão é simbólica (sem voto individual registrado) — use o filtro para ver só nominais."
        title="Votações"
        variant="gradient"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <TrustBanner
          level="L1"
          message="Votações oficiais da Câmara e do Senado, sem transformação."
        />

        <FiltrosVotacao
          anos={anos}
          selecionado={{
            casa: params.casa,
            ano: params.ano,
            resultado: params.resultado,
            somenteNominais: params.somenteNominais === '1',
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-sm">
          <span>
            {votacoes.length === LIMITE
              ? `${LIMITE} resultados (limite — refine os filtros para ver outros)`
              : `${votacoes.length} ${votacoes.length === 1 ? 'resultado' : 'resultados'}`}
          </span>
          {votacoes.length > 0 && (
            <ExportCsvLink
              href={`/api/export/votacoes?${new URLSearchParams(
                Object.entries({
                  casa: filtros.casa ?? '',
                  ano: filtros.ano ? String(filtros.ano) : '',
                  resultado: filtros.resultado ?? '',
                  somenteNominais: filtros.somenteNominais ? '1' : '',
                }).filter(([, v]) => v !== ''),
              ).toString()}`}
            />
          )}
        </div>

        {votacoes.length === 0 ? (
          <EmptyState
            action={
              <Button asChild size="sm" variant="outline">
                <a href="/votacoes">Limpar filtros</a>
              </Button>
            }
            description="Tente ajustar casa, ano, resultado ou desmarcar 'só nominais' para resultados diferentes."
            icon={SearchX}
            title="Nenhuma votação corresponde aos filtros"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {votacoes.map((v) => (
              <li key={v.id}>
                <VotacaoCard votacao={v} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
