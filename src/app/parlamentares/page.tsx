import { SearchX, Users } from 'lucide-react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { Filtros } from '@/components/parlamentar/filtros'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { StatsGrid } from '@/design-system/compositions/stats-grid'
import { Button } from '@/design-system/primitives/button'
import {
  type Casa,
  getListagemStats,
  getPartidosDistintos,
  getUfsDistintos,
  listParlamentares,
  ORDENS_LISTAGEM,
  type OrdemListagem,
} from '@/lib/queries/parlamentares'

export const metadata = {
  title: 'Parlamentares — Brasil à Vera',
  description:
    'Deputados federais e senadores em exercício, filtráveis por casa, partido e UF.',
}

interface PageProps {
  searchParams: Promise<{
    casa?: string
    partido?: string
    uf?: string
    q?: string
    ordem?: string
  }>
}

function normalizeCasa(value: string | undefined): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

function normalizeOrdem(value: string | undefined): OrdemListagem | undefined {
  if (value && (ORDENS_LISTAGEM as string[]).includes(value)) {
    return value as OrdemListagem
  }
  return undefined
}

export default async function ParlamentaresPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros = {
    casa: normalizeCasa(params.casa),
    partido: params.partido?.trim() || undefined,
    uf: params.uf?.trim() || undefined,
    q: params.q?.trim() || undefined,
    ordem: normalizeOrdem(params.ordem),
  }

  const [parlamentares, partidos, ufs, stats] = await Promise.all([
    listParlamentares(filtros),
    getPartidosDistintos(),
    getUfsDistintos(),
    getListagemStats(),
  ])

  return (
    <>
      <HeroSection
        align="center"
        description="Deputados federais (Câmara) e senadores (Senado) em exercício na legislatura atual."
        kicker={
          <DataBadge
            icon={<Users className="h-3 w-3" />}
            label="L1"
            source="Câmara + Senado"
            tone="accent"
          />
        }
        title="Parlamentares"
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <StatsGrid
          items={[
            { value: stats.totalParlamentares, label: 'parlamentares' },
            { value: stats.totalPartidos, label: 'partidos' },
            { value: stats.totalUfs, label: 'UFs' },
          ]}
        />

        <Filtros partidos={partidos} selecionado={filtros} ufs={ufs} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-sm">
          <span>
            {parlamentares.length}{' '}
            {parlamentares.length === 1 ? 'resultado' : 'resultados'}
          </span>
          {parlamentares.length > 0 && (
            <ExportCsvLink
              href={`/api/export/parlamentares?${new URLSearchParams(
                Object.entries({
                  casa: filtros.casa ?? '',
                  partido: filtros.partido ?? '',
                  uf: filtros.uf ?? '',
                }).filter(([, v]) => v !== ''),
              ).toString()}`}
            />
          )}
        </div>

        {parlamentares.length === 0 ? (
          <EmptyState
            action={
              <Button asChild size="sm" variant="outline">
                <a href="/parlamentares">Limpar filtros</a>
              </Button>
            }
            description="Tente ajustar casa, partido ou UF para resultados diferentes."
            icon={SearchX}
            title="Nenhum parlamentar corresponde aos filtros"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parlamentares.map((p) => (
              <li key={p.id}>
                <ParlamentarCard parlamentar={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
