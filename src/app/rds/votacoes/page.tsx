// Onda HeroSection — cópia-rds da listagem /votacoes sob /rds/ para validar
// a migração ao @fabio.caffarello/react-design-system 3.12.0 (a 3.12.0
// destravou HeroSection, #163). TERCEIRA e ÚLTIMA das 3 listagens; fecha o
// trio replicando o padrão de /rds/parlamentares (§3.14) e /rds/proposicoes
// (§3.15) verbatim.
//
// Convive em paralelo com a rota original (strangler fig); promoção é
// decisão futura. O chrome (Navbar + Footer + Toaster + skip-link) vem do
// root layout `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Substituições estruturais vs original (precedente §3.14/§3.15):
// - HeroSection (composição local) → HeroSection do RDS /server
//   (server-safe; API local→RDS 1:1 — kicker/title/description/variant/align).
// - StatsGrid (composição local)   → StatGroup layout="grid" cols={4} +
//   Stat do /server (precedente §3.6 KpiStrip→StatGroup; o Stat traz `hint`
//   na API 1:1; StatGroup já traz borda + dividers próprios).
// - DataBadge                      → mantido LOCAL (import do original;
//   sem par RDS — precedente perfis/listagens).
// - FiltrosVotacao, VotacaoCard    → cópias traduzidas em ./_components/.
// - EmptyState, Button             → cópias LOCAIS traduzidas (RDS só os tem
//   no entry raiz client; +JS contra ADR-022).
// - ExportCsvLink, auth/canExport  → lógica preservada, importada dos
//   ORIGINAIS (client island / produção).
//
// Lógica preservada do original: normalização de params, compat `?offset=`
// (ADR-028 §4, redirect 308), cursor (ADR-026, decodeCursor + permanentRedirect
// 308 em token inválido), queries, "Mostrar mais" com restantes da primeira
// página, helper formatUltimaVotacaoStat, descrição narrativa. hrefs de
// filtro/cursor/card e form `action` reescritos pra /rds/votacoes; export
// href → /api/export produção; alternates RSS → /feed/votacoes produção (é o
// produto, não navegação com contraparte /rds/); metadata `(rds-pilot)`.
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md.

import {
  HeroSection,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { SearchX, Vote } from 'lucide-react'
import { permanentRedirect } from 'next/navigation'

import { ExportCsvLink } from '@/components/export-csv-link'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { canExport } from '@/lib/auth-guards'
import { decodeCursor } from '@/lib/cursor'
import { formatNumeroAbreviado } from '@/lib/format-number'
import { CursorVotacoesV1 } from '@/lib/queries/cursor-schemas'
import {
  type Casa,
  countVotacoes,
  type FiltrosVotacao as Filtros,
  getAnosVotacaoDistintos,
  listVotacoesCursor,
  VOTACOES_LISTAGEM_PAGE_SIZE,
} from '@/lib/queries/votacoes'
import { getEstatisticasGlobaisVotacoes } from '@/lib/queries/votacoes-stats'
import { Button } from './_components/button'
import { EmptyState } from './_components/empty-state'
import { FiltrosVotacao } from './_components/filtros'
import { VotacaoCard } from './_components/votacao-card'

export const metadata = {
  title: 'Votações (rds-pilot) — Brasil à Vera',
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
    after?: string
    /** Compat ADR-028 §4 — aceito por 1 release. Sempre redireciona para
     * strip do param, preservando os demais filtros. */
    offset?: string
  }>
}

// Constrói href preservando filtros e mudando apenas `after` (cursor).
// Strip de `after` quando override é null — usado no permanentRedirect 308
// para tokens inválidos (ADR-026 §5) e no strip do `offset` (compat
// ADR-028 §4). Base /rds/.
function buildPageHref(
  params: Awaited<PageProps['searchParams']>,
  override: { after?: string | null; offset?: null },
): string {
  const merged: Record<string, string | null | undefined> = {
    ...params,
    ...override,
  }
  const search = new URLSearchParams()
  for (const key of [
    'casa',
    'ano',
    'resultado',
    'somenteNominais',
    'after',
  ] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, value)
    }
  }
  const qs = search.toString()
  return qs ? `/rds/votacoes?${qs}` : '/rds/votacoes'
}

// Stat "Última votação": narrativa de recência ("há N dias") em primeiro
// plano + data formal como hint. Quando > 30 dias, inverte (data grande,
// distância como hint) — passou a ser história, não atividade corrente.
function formatUltimaVotacaoStat(ultima: Date | string | null): {
  value: string
  hint: string
} {
  if (!ultima) return { value: '—', hint: 'sem registro' }
  const data = typeof ultima === 'string' ? new Date(ultima) : ultima
  const agora = new Date()
  const ms = agora.getTime() - data.getTime()
  const dias = Math.floor(ms / 86_400_000)
  const dataFmt = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

  if (dias < 0) return { value: dataFmt, hint: 'data futura registrada' }
  if (dias === 0) return { value: 'hoje', hint: dataFmt }
  if (dias === 1) return { value: 'há 1 dia', hint: dataFmt }
  if (dias < 30) return { value: `há ${dias} dias`, hint: dataFmt }
  // > 30 dias: vira referência histórica — data ganha destaque.
  return { value: dataFmt, hint: `há ${dias} dias` }
}

export default async function VotacoesPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Compat ADR-028 §4 — `?offset=` aceito por 1 release (até v0.9.0).
  // Strip via permanentRedirect 308 preservando filtros + cursor. Mantém
  // deep-links externos válidos sem precisar coexistir nos internals.
  if (params.offset !== undefined && params.offset !== '') {
    permanentRedirect(buildPageHref(params, { offset: null }))
  }

  const filtros: Filtros = {
    casa: normalizeCasa(params.casa),
    ano: normalizeAno(params.ano),
    resultado: normalizeResultado(params.resultado),
    somenteNominais: params.somenteNominais === '1',
  }

  // Cursor ADR-026: null = token inválido (versão antiga, shape errado,
  // base64 corrompido) → strip do param via 308. undefined = primeira
  // página.
  const cursor = decodeCursor(params.after, CursorVotacoesV1)
  if (cursor === null) {
    permanentRedirect(buildPageHref(params, { after: null }))
  }

  const [page, anos, stats, totalFiltrado, canExportData] = await Promise.all([
    listVotacoesCursor(filtros, { cursor }),
    getAnosVotacaoDistintos(),
    getEstatisticasGlobaisVotacoes(),
    countVotacoes(filtros),
    canExport(),
  ])
  const votacoes = page.rows
  // "Mostrar mais (N restantes)" só faz sentido na primeira página (sem
  // cursor). Em páginas subsequentes mostra só "Mostrar mais" — não
  // rastreamos page-N para calcular restantes sem ginástica adicional.
  const restantesPrimeiraPagina = !cursor
    ? Math.max(0, totalFiltrado - VOTACOES_LISTAGEM_PAGE_SIZE)
    : null

  // Volume narrativo no hero — N votações desde AAAA quando há cobertura
  // histórica conhecida; cai em fallback honesto quando o banco está vazio
  // (caso de bootstrap, jamais em produção).
  const descricaoNarrativa =
    stats.total > 0 && stats.anoMaisAntigo
      ? `${formatNumeroAbreviado(stats.total)} votações desde ${stats.anoMaisAntigo} em plenário e comissões da Câmara e do Senado. A maioria das votações em comissão é simbólica (sem voto individual registrado) — use o filtro para ver só nominais.`
      : 'Plenário e comissões da Câmara e do Senado. A maioria das votações em comissão é simbólica (sem voto individual registrado) — use o filtro para ver só nominais.'

  return (
    <>
      <HeroSection
        align="center"
        description={descricaoNarrativa}
        kicker={
          <DataBadge
            icon={<Vote className="h-3 w-3" />}
            label="L1"
            source="Câmara + Senado"
            tone="accent"
          />
        }
        title="Votações"
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* StatGroup (precedente §3.6/§3.14: StatsGrid→StatGroup) alimenta
            o hero com 4 stats narrativos. Total e "Última votação" sempre
            presentes; Aprovadas/Rejeitadas usam janela 12m para refletir
            atividade recente, não acervo cumulativo. */}
        <StatGroup cols={4} layout="grid">
          <Stat
            hint="no banco"
            label="Total"
            value={formatNumeroAbreviado(stats.total)}
          />
          <Stat
            hint="últimos 12 m"
            label="Aprovadas"
            value={formatNumeroAbreviado(stats.aprovadas12m)}
          />
          <Stat
            hint="últimos 12 m"
            label="Rejeitadas"
            value={formatNumeroAbreviado(stats.rejeitadas12m)}
          />
          {(() => {
            const ultima = formatUltimaVotacaoStat(stats.ultimaVotacaoData)
            return (
              <Stat
                hint={ultima.hint}
                label="Última votação"
                value={ultima.value}
              />
            )
          })()}
        </StatGroup>

        <FiltrosVotacao
          anos={anos}
          selecionado={{
            casa: params.casa,
            ano: params.ano,
            resultado: params.resultado,
            somenteNominais: params.somenteNominais === '1',
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-sm">
          <span>
            {totalFiltrado === 0
              ? 'Nenhum resultado'
              : `${formatNumeroAbreviado(totalFiltrado)} ${totalFiltrado === 1 ? 'resultado' : 'resultados'}`}
          </span>
          {canExportData && votacoes.length > 0 && (
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
                <a href="/rds/votacoes">Limpar filtros</a>
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

        {/* Cursor pagination (ADR-026 §4 + ADR-028). Link <a> puro, sem JS,
            com anchor #mostrar-mais que mantém scroll visual após paginar. */}
        {page.nextCursor ? (
          <div className="flex justify-center" id="mostrar-mais">
            <Button asChild variant="outline">
              <a href={buildPageHref(params, { after: page.nextCursor })}>
                {restantesPrimeiraPagina !== null
                  ? `Mostrar mais (${formatNumeroAbreviado(restantesPrimeiraPagina)} restantes)`
                  : 'Mostrar mais'}
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}
