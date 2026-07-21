// Listagem de parlamentares — promovida ao RDS (migração ADR-033).
// Consome o design system @fabio.caffarello/react-design-system — tokens
// traduzidos pela tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// - HeroSection + Stat/StatGroup vêm do RDS /server (server-safe).
// - DataBadge consolidado no RDS (ADR-038); tone data-viz = `dataviz`.
// - EmptyState/Button de @/design-system; Filtros/ParlamentarCard de
//   @/components/parlamentar; ExportCsvLink/FollowButton/Combobox e
//   auth/canExport/follows preservados.

import {
  Button,
  DataBadge,
  HeroSection,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { SearchX, Users } from 'lucide-react'
import { permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import { ExportCsvLink } from '@/components/export-csv-link'
import { MostrarMais } from '@/components/listagem/mostrar-mais'
import { Filtros } from '@/components/parlamentar/filtros'
import { FollowIsland } from '@/components/parlamentar/follow-island'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import {
  ParlamentarPreviewDrawer,
  ParlamentarPreviewProvider,
} from '@/components/parlamentar/preview-drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { canExport } from '@/lib/auth-guards'
import { decodeCursor } from '@/lib/cursor'
import { buildListaHref, restantesPrimeiraPagina } from '@/lib/pagination'
import { CursorParlamentaresV1 } from '@/lib/queries/cursor-schemas'
import {
  type Casa,
  countParlamentares,
  getListagemStats,
  getPartidosDistintos,
  getUfsDistintos,
  listParlamentaresPaginado,
  ORDENS_LISTAGEM,
  type OrdemListagem,
  PARLAMENTARES_LISTAGEM_PAGE_SIZE,
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
    after?: string
  }>
}

const PARLAMENTARES_HREF_KEYS = [
  'casa',
  'partido',
  'uf',
  'q',
  'ordem',
  'after',
] as const

// Href da listagem preservando filtros, sobrescrevendo só `after` (cursor).
// Usado pelo "Mostrar mais" e pelo redirect 308 de cursor inválido (ADR-026 §5).
function buildPageHref(
  params: Awaited<PageProps['searchParams']>,
  override: { after?: string | null },
): string {
  return buildListaHref(
    '/parlamentares',
    params,
    PARLAMENTARES_HREF_KEYS,
    override,
  )
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

async function ExportIsland({
  exportHref,
  totalFiltrado,
}: {
  exportHref: string
  totalFiltrado: number
}) {
  const can = await canExport()
  if (!can || totalFiltrado === 0) return null
  return <ExportCsvLink href={exportHref} />
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

  // Cursor (ADR-026): null = token inválido → redirect 308 strip do param,
  // preservando os filtros. undefined = primeira página.
  const cursor = decodeCursor(params.after, CursorParlamentaresV1)
  if (cursor === null) {
    permanentRedirect(buildPageHref(params, { after: null }))
  }

  const [page, partidos, ufs, stats, totalFiltrado] = await Promise.all([
    listParlamentaresPaginado(filtros, { cursor }),
    getPartidosDistintos(),
    getUfsDistintos(),
    getListagemStats(),
    countParlamentares(filtros),
  ])
  const parlamentares = page.rows
  // "N restantes" só na 1ª página (sem cursor).
  const restantes = restantesPrimeiraPagina(
    Boolean(cursor),
    totalFiltrado,
    PARLAMENTARES_LISTAGEM_PAGE_SIZE,
  )

  const exportHref = `/api/export/parlamentares?${new URLSearchParams(
    Object.entries({
      casa: filtros.casa ?? '',
      partido: filtros.partido ?? '',
      uf: filtros.uf ?? '',
    }).filter(([, v]) => v !== ''),
  ).toString()}`

  return (
    <>
      <HeroSection
        align="center"
        description="Deputados federais (Câmara) e senadores (Senado) da legislatura atual — inclui titulares, suplentes em exercício e mandatos encerrados no período."
        kicker={
          <DataBadge
            icon={<Users className="h-3 w-3" />}
            label="L1"
            source="Câmara + Senado"
            tone="dataviz"
          />
        }
        title="Parlamentares"
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-6 py-8">
        {/* col-span no 3º Stat: o grid mobile do StatGroup é 2 colunas e
            3 itens deixavam um "card" fantasma no 4º quadrante (auditoria
            UX 2026-07-20, P2.13). */}
        <StatGroup cols={3} layout="grid">
          <Stat label="parlamentares" value={stats.totalParlamentares} />
          <Stat label="partidos" value={stats.totalPartidos} />
          <Stat
            className="col-span-2 md:col-span-1"
            label="UFs"
            value={stats.totalUfs}
          />
        </StatGroup>

        <Filtros partidos={partidos} selecionado={filtros} ufs={ufs} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-sm">
          <span>
            {totalFiltrado} {totalFiltrado === 1 ? 'resultado' : 'resultados'}
          </span>
          {/* ExportCsvLink streams via ExportIsland — auth required */}
          <Suspense fallback={null}>
            <ExportIsland
              exportHref={exportHref}
              totalFiltrado={totalFiltrado}
            />
          </Suspense>
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
          <ParlamentarPreviewProvider>
            {/* Fallback: list without follow state, streams immediately.
                FollowIsland resolves auth + follows and replaces via Suspense. */}
            <Suspense
              fallback={
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {parlamentares.map((p, i) => (
                    <li key={p.id}>
                      <ParlamentarCard parlamentar={p} priority={i < 3} />
                    </li>
                  ))}
                </ul>
              }
            >
              <FollowIsland parlamentares={parlamentares} />
            </Suspense>
            <ParlamentarPreviewDrawer />
          </ParlamentarPreviewProvider>
        )}

        {/* Cursor pagination (ADR-026 §4). `<a>` puro, sem JS, anchor
            #mostrar-mais. Só na ordem `nome` (keyset); ordens agregadas
            capam por LIMIT sem nextCursor. */}
        {page.nextCursor ? (
          <MostrarMais
            href={buildPageHref(params, { after: page.nextCursor })}
            restantes={restantes}
          />
        ) : null}
      </div>
    </>
  )
}
