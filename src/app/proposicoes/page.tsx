import { FileText, SearchX } from 'lucide-react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { FiltrosProposicao } from '@/components/proposicao/filtros'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { StatsGrid } from '@/design-system/compositions/stats-grid'
import { Button } from '@/design-system/primitives/button'
import { formatNumeroAbreviado } from '@/lib/format-number'
import {
  type FiltrosProposicao as Filtros,
  getAnosDistintos,
  listProposicoes,
  ORDENS_PROPOSICAO,
  type OrdemProposicao,
  type SituacaoProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'
import { getEstatisticasGlobaisProposicoes } from '@/lib/queries/proposicoes-stats'

export const metadata = {
  title: 'Proposições — Brasil à Vera',
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
    q?: string
    ordem?: string
  }>
}

export default async function ProposicoesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros: Filtros = {
    tipo: normalizeTipo(params.tipo),
    ano: normalizeAno(params.ano),
    situacao: normalizeSituacao(params.situacao),
    q: normalizeQ(params.q),
    ordem: normalizeOrdem(params.ordem),
  }

  const LIMITE = 50
  const [proposicoes, anos, stats] = await Promise.all([
    listProposicoes(filtros, LIMITE),
    getAnosDistintos(),
    getEstatisticasGlobaisProposicoes(),
  ])

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
        {/* Wave 8 Sprint 8.1 PR1 — StatsGrid alimenta o hero com 4 stats
            narrativos (P7: proposição é ciclo de vida). Hints curtos
            (P1: densidade > floreio) explicam a janela de cada métrica.
            Aprovadas/Encerradas filtradas pelos últimos 12m via MAX da
            tramitação — proteção contra inflar com históricas paradas. */}
        <StatsGrid
          items={[
            {
              value: formatNumeroAbreviado(stats.total),
              label: 'Total',
              hint: 'no banco',
            },
            {
              value: formatNumeroAbreviado(stats.tramitando),
              label: 'Tramitando',
              hint: 'agora',
            },
            {
              value: formatNumeroAbreviado(stats.aprovadas12m),
              label: 'Aprovadas',
              hint: 'últimos 12 m',
            },
            {
              value: formatNumeroAbreviado(stats.rejeitadasArquivadas12m),
              label: 'Encerradas',
              hint: 'rejeitadas ou arquivadas, 12 m',
            },
          ]}
        />

        <FiltrosProposicao
          anos={anos}
          selecionado={{
            tipo: params.tipo,
            ano: params.ano,
            situacao: params.situacao,
            q: params.q,
            ordem: params.ordem,
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-sm">
          <span>
            {proposicoes.length === LIMITE
              ? `${LIMITE} resultados (limite — refine os filtros para ver outros)`
              : `${proposicoes.length} ${proposicoes.length === 1 ? 'resultado' : 'resultados'}`}
          </span>
          {proposicoes.length > 0 && (
            <ExportCsvLink
              href={`/api/export/proposicoes?${new URLSearchParams(
                Object.entries({
                  tipo: filtros.tipo ?? '',
                  ano: filtros.ano ? String(filtros.ano) : '',
                  situacao: filtros.situacao ?? '',
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
                <a href="/proposicoes">Limpar filtros</a>
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
      </div>
    </>
  )
}
