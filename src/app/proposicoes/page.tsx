import { SearchX } from 'lucide-react'
import Link from 'next/link'

import { ExportCsvLink } from '@/components/export-csv-link'
import { FiltrosProposicao } from '@/components/proposicao/filtros'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { TrustBanner } from '@/components/trust-banner'
import { EmptyState } from '@/components/ui/empty-state'
import {
  type FiltrosProposicao as Filtros,
  getAnosDistintos,
  listProposicoes,
  type SituacaoProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'

export const metadata = {
  title: 'Proposições — Brasil a Vera',
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

interface PageProps {
  searchParams: Promise<{
    tipo?: string
    ano?: string
    situacao?: string
  }>
}

export default async function ProposicoesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros: Filtros = {
    tipo: normalizeTipo(params.tipo),
    ano: normalizeAno(params.ano),
    situacao: normalizeSituacao(params.situacao),
  }

  const LIMITE = 50
  const [proposicoes, anos] = await Promise.all([
    listProposicoes(filtros, LIMITE),
    getAnosDistintos(),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Proposições
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Projetos de lei, PECs, MPs, decretos e resoluções legislativas
          ingeridas no Brasil a Vera. Resultados ordenados por ano e número,
          mais recentes primeiro.
        </p>
      </header>

      <TrustBanner
        level="L1"
        message="Proposições oficiais da Câmara e do Senado, sem transformação."
      />

      <div className="mb-6">
        <FiltrosProposicao
          anos={anos}
          selecionado={{
            tipo: params.tipo,
            ano: params.ano,
            situacao: params.situacao,
          }}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
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
              }).filter(([, v]) => v !== ''),
            ).toString()}`}
          />
        )}
      </div>

      {proposicoes.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhuma proposição corresponde aos filtros"
          description="Tente ajustar tipo, ano ou situação para resultados diferentes."
          action={
            <Link
              href="/proposicoes"
              className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 font-medium text-sm text-zinc-700 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Limpar filtros
            </Link>
          }
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
  )
}
