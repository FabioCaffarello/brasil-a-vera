// Onda HeroSection — cópia-rds da listagem /proposicoes sob /rds/ para
// validar a migração ao @fabio.caffarello/react-design-system 3.12.0 (a
// 3.12.0 destravou HeroSection, #163). SEGUNDA das 3 listagens; replica o
// padrão estabelecido em /rds/parlamentares (§3.14) verbatim.
//
// Convive em paralelo com a rota original (strangler fig); promoção é
// decisão futura. O chrome (Navbar + Footer + Toaster + skip-link) vem do
// root layout `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Substituições estruturais vs original (precedente §3.14):
// - HeroSection (composição local) → HeroSection do RDS /server
//   (server-safe; API local→RDS 1:1 — kicker/title/description/variant/align).
// - StatsGrid (composição local)   → StatGroup layout="grid" cols={4} +
//   Stat do /server (precedente §3.6 KpiStrip→StatGroup; o Stat traz `hint`
//   na API 1:1; StatGroup já traz borda + dividers próprios).
// - DataBadge                      → mantido LOCAL (import do original;
//   sem par RDS — precedente perfis/listagens).
// - FiltrosProposicao, ProposicaoCard → cópias traduzidas em ./_components/.
// - EmptyState, Button             → cópias LOCAIS traduzidas (RDS só os tem
//   no entry raiz client; +JS contra ADR-022).
// - ExportCsvLink, auth/canExport  → lógica preservada, importada dos
//   ORIGINAIS (client island / produção).
//
// Lógica preservada do original: normalização de params, cursor (ADR-026,
// decodeCursor + permanentRedirect 308 em token inválido), queries, "Mostrar
// mais" com restantes da primeira página. hrefs de filtro/cursor/card e form
// `action` reescritos pra /rds/proposicoes; export href → /api/export
// produção; metadata `(rds-pilot)`.
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md.

import {
  HeroSection,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { FileText, SearchX } from 'lucide-react'
import { permanentRedirect } from 'next/navigation'

import { ExportCsvLink } from '@/components/export-csv-link'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { canExport } from '@/lib/auth-guards'
import { decodeCursor } from '@/lib/cursor'
import { formatNumeroAbreviado } from '@/lib/format-number'
import { CursorProposicoesV1 } from '@/lib/queries/cursor-schemas'
import {
  countProposicoes,
  type FiltrosProposicao as Filtros,
  getAnosDistintos,
  getTemasDistintos,
  listProposicoes,
  ORDENS_PROPOSICAO,
  type OrdemProposicao,
  PROPOSICOES_LISTAGEM_PAGE_SIZE,
  type SituacaoProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'
import { getEstatisticasGlobaisProposicoes } from '@/lib/queries/proposicoes-stats'
import { Button } from './_components/button'
import { EmptyState } from './_components/empty-state'
import { FiltrosProposicao } from './_components/filtros'
import { ProposicaoCard } from './_components/proposicao-card'

export const metadata = {
  title: 'Proposições (rds-pilot) — Brasil à Vera',
  description:
    'Projetos de lei, PECs, medidas provisórias e demais proposições legislativas em tramitação na Câmara e no Senado.',
}

const SITUACOES_VALIDAS: ReadonlySet<SituacaoProposicao> = new Set([
  'TRAMITANDO',
  'APROVADA',
  'REJEITADA',
  'ARQUIVADA',
  'TRANSFORMADA_EM_NORMA',
])

function normalizeTipo(value: string | undefined): TipoProposicao | undefined {
  if (!value) return undefined
  return TIPOS_PROPOSICAO.includes(value as TipoProposicao)
    ? (value as TipoProposicao)
    : undefined
}

function normalizeSituacao(
  value: string | undefined,
): SituacaoProposicao | undefined {
  if (!value) return undefined
  return SITUACOES_VALIDAS.has(value as SituacaoProposicao)
    ? (value as SituacaoProposicao)
    : undefined
}

function normalizeAno(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 1900 && n < 2100 ? n : undefined
}

function normalizeTema(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function normalizeQ(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function normalizeOrdem(
  value: string | undefined,
): OrdemProposicao | undefined {
  if (!value) return undefined
  return ORDENS_PROPOSICAO.includes(value as OrdemProposicao)
    ? (value as OrdemProposicao)
    : undefined
}

interface PageProps {
  searchParams: Promise<{
    tipo?: string
    ano?: string
    situacao?: string
    tema?: string
    q?: string
    ordem?: string
    after?: string
  }>
}

// Constrói href preservando filtros e mudando apenas `after` (cursor).
// Strip o param quando cursor é null (volta à primeira página) — usado
// no permanentRedirect 308 para tokens inválidos (ADR-026 §5). Base /rds/.
function buildPageHref(
  params: Awaited<PageProps['searchParams']>,
  override: { after?: string | null },
): string {
  const merged = { ...params, ...override }
  const search = new URLSearchParams()
  for (const key of [
    'tipo',
    'ano',
    'situacao',
    'tema',
    'q',
    'ordem',
    'after',
  ] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, value)
    }
  }
  const qs = search.toString()
  return qs ? `/rds/proposicoes?${qs}` : '/rds/proposicoes'
}

export default async function ProposicoesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros: Filtros = {
    tipo: normalizeTipo(params.tipo),
    ano: normalizeAno(params.ano),
    situacao: normalizeSituacao(params.situacao),
    tema: normalizeTema(params.tema),
    q: normalizeQ(params.q),
    ordem: normalizeOrdem(params.ordem),
  }

  // Cursor (ADR-026): null = token inválido → redirect 308 strip do param,
  // preservando demais filtros. undefined = primeira página.
  const cursor = decodeCursor(params.after, CursorProposicoesV1)
  if (cursor === null) {
    permanentRedirect(buildPageHref(params, { after: null }))
  }

  const [page, anos, temas, stats, totalFiltrado, canExportData] =
    await Promise.all([
      listProposicoes(filtros, { cursor }),
      getAnosDistintos(),
      getTemasDistintos(),
      getEstatisticasGlobaisProposicoes(),
      countProposicoes(filtros),
      canExport(),
    ])
  const proposicoes = page.rows
  // "Mostrar mais (N restantes)" só faz sentido na primeira página (cursor
  // = undefined). Em páginas subsequentes não sabemos quantos itens já
  // foram vistos sem rastrear page-N — então mostra só "Mostrar mais".
  const restantesPrimeiraPagina = !cursor
    ? Math.max(0, totalFiltrado - PROPOSICOES_LISTAGEM_PAGE_SIZE)
    : null

  return (
    <>
      <HeroSection
        align="center"
        description="Projetos de lei, PECs, MPs, decretos e resoluções legislativas ingeridas no Brasil à Vera. Busque por número ou palavra na ementa, ou ordene por movimentação recente."
        kicker={
          <DataBadge
            icon={<FileText className="h-3 w-3" />}
            label="L1"
            source="Câmara + Senado"
            tone="accent"
          />
        }
        title="Proposições"
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* StatGroup (precedente §3.6/§3.14: StatsGrid→StatGroup) alimenta
            o hero com 4 stats narrativos. Hints curtos explicam a janela de
            cada métrica. Aprovadas/Encerradas filtradas pelos últimos 12m
            via MAX da tramitação — proteção contra inflar com históricas. */}
        <StatGroup cols={4} layout="grid">
          <Stat
            hint="no banco"
            label="Total"
            value={formatNumeroAbreviado(stats.total)}
          />
          <Stat
            hint="agora"
            label="Tramitando"
            value={formatNumeroAbreviado(stats.tramitando)}
          />
          <Stat
            hint="últimos 12 m"
            label="Aprovadas"
            value={formatNumeroAbreviado(stats.aprovadas12m)}
          />
          <Stat
            hint="rejeitadas ou arquivadas, 12 m"
            label="Encerradas"
            value={formatNumeroAbreviado(stats.rejeitadasArquivadas12m)}
          />
        </StatGroup>

        <FiltrosProposicao
          anos={anos}
          selecionado={{
            tipo: params.tipo,
            ano: params.ano,
            situacao: params.situacao,
            tema: params.tema,
            q: params.q,
            ordem: params.ordem,
          }}
          temas={temas}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-sm">
          <span>
            {totalFiltrado === 0
              ? 'Nenhum resultado'
              : `${formatNumeroAbreviado(totalFiltrado)} ${totalFiltrado === 1 ? 'resultado' : 'resultados'}`}
          </span>
          {canExportData && proposicoes.length > 0 && (
            <ExportCsvLink
              href={`/api/export/proposicoes?${new URLSearchParams(
                Object.entries({
                  tipo: filtros.tipo ?? '',
                  ano: filtros.ano ? String(filtros.ano) : '',
                  situacao: filtros.situacao ?? '',
                  tema: filtros.tema ? String(filtros.tema) : '',
                  q: filtros.q ?? '',
                }).filter(([, v]) => v !== ''),
              ).toString()}`}
            />
          )}
        </div>

        {proposicoes.length === 0 ? (
          <EmptyState
            action={
              <Button asChild size="sm" variant="outline">
                <a href="/rds/proposicoes">Limpar filtros</a>
              </Button>
            }
            description="Tente ajustar tipo, ano ou situação para resultados diferentes."
            icon={SearchX}
            title="Nenhuma proposição corresponde aos filtros"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {proposicoes.map((p) => (
              <li key={p.id}>
                <ProposicaoCard proposicao={p} />
              </li>
            ))}
          </ul>
        )}

        {/* Cursor pagination (ADR-026 §4). Link <a> puro, sem JS, com anchor
            #mostrar-mais que mantém scroll visual após paginar. Só renderiza
            quando nextCursor existe (ordens 'recente'/'antiga' que suportam
            keyset). */}
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
