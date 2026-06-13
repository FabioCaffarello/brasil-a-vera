// Onda HeroSection — cópia-rds da listagem /parlamentares sob /rds/ para
// validar a migração ao @fabio.caffarello/react-design-system 3.12.0 (a
// 3.12.0 destravou HeroSection, #163). PRIMEIRA das 3 listagens; o padrão
// aqui replica em /proposicoes e /votacoes.
//
// Convive em paralelo com a rota original (strangler fig); promoção é
// decisão futura. O chrome (Navbar + Footer + Toaster + skip-link) vem do
// root layout `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Substituições estruturais vs original:
// - HeroSection (composição local) → HeroSection do RDS /server
//   (server-safe; API local→RDS 1:1 — kicker/title/description/variant/align).
// - StatsGrid (composição local)   → StatGroup layout="grid" + Stat do
//   /server (precedente §3.6 KpiStrip→StatGroup; StatGroup já traz borda +
//   dividers próprios).
// - DataBadge, PartyBadge          → mantidos LOCAIS (import dos originais;
//   sem par RDS — precedente perfis).
// - Filtros, ParlamentarCard       → cópias traduzidas em ./_components/.
// - EmptyState, Button             → cópias LOCAIS traduzidas (RDS só os tem
//   no entry raiz client; +JS contra ADR-022).
// - ExportCsvLink, FollowButton, Combobox, auth/canExport/follows → lógica
//   preservada, importada dos ORIGINAIS (client islands / produção).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md.

import { auth } from '@clerk/nextjs/server'
import {
  HeroSection,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { SearchX, Users } from 'lucide-react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { canExport } from '@/lib/auth-guards'
import { getFollowsByUserId } from '@/lib/queries/follows'
import {
  type Casa,
  getListagemStats,
  getPartidosDistintos,
  getUfsDistintos,
  listParlamentares,
  ORDENS_LISTAGEM,
  type OrdemListagem,
} from '@/lib/queries/parlamentares'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'
import { Button } from './_components/button'
import { EmptyState } from './_components/empty-state'
import { Filtros } from './_components/filtros'
import { ParlamentarCard } from './_components/parlamentar-card'

export const metadata = {
  title: 'Parlamentares (rds-pilot) — Brasil à Vera',
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

  const [parlamentares, partidos, ufs, stats, canExportData] =
    await Promise.all([
      listParlamentares(filtros),
      getPartidosDistintos(),
      getUfsDistintos(),
      getListagemStats(),
      canExport(),
    ])

  // Gating server-side do FollowButton (Wave 10 Hotfix 10.1, preservado):
  // anônimos não disparam getFollowsByUserId e o card recebe
  // follow={undefined} — zero HTML/JS do botão. Autenticados: lazy upsert
  // do user_profile + query de follows.
  const { userId: clerkUserId } = await auth()
  let followingIds: Set<string> = new Set()
  if (clerkUserId) {
    const internalUserId = await getOrCreateUserProfileId(clerkUserId)
    if (internalUserId) {
      followingIds = await getFollowsByUserId(internalUserId)
    }
  }

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
        <StatGroup cols={3} layout="grid">
          <Stat label="parlamentares" value={stats.totalParlamentares} />
          <Stat label="partidos" value={stats.totalPartidos} />
          <Stat label="UFs" value={stats.totalUfs} />
        </StatGroup>

        <Filtros partidos={partidos} selecionado={filtros} ufs={ufs} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-sm">
          <span>
            {parlamentares.length}{' '}
            {parlamentares.length === 1 ? 'resultado' : 'resultados'}
          </span>
          {canExportData && parlamentares.length > 0 && (
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
                <a href="/rds/parlamentares">Limpar filtros</a>
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
                <ParlamentarCard
                  follow={
                    clerkUserId
                      ? { isFollowing: followingIds.has(p.id) }
                      : undefined
                  }
                  parlamentar={p}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
