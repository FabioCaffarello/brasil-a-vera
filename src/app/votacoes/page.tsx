import { SearchX, Vote } from 'lucide-react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { EmptyState } from '@/components/ui/empty-state'
import { FiltrosVotacao } from '@/components/votacao/filtros'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { StatsGrid } from '@/design-system/compositions/stats-grid'
import { Button } from '@/design-system/primitives/button'
import { formatNumeroAbreviado } from '@/lib/format-number'
import {
  type Casa,
  type FiltrosVotacao as Filtros,
  getAnosVotacaoDistintos,
  listVotacoes,
} from '@/lib/queries/votacoes'
import { getEstatisticasGlobaisVotacoes } from '@/lib/queries/votacoes-stats'

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
  const filtros: Filtros = {
    casa: normalizeCasa(params.casa),
    ano: normalizeAno(params.ano),
    resultado: normalizeResultado(params.resultado),
    somenteNominais: params.somenteNominais === '1',
  }

  const LIMITE = 50
  const [votacoes, anos, stats] = await Promise.all([
    listVotacoes(filtros, LIMITE),
    getAnosVotacaoDistintos(),
    getEstatisticasGlobaisVotacoes(),
  ])

  // Volume narrativo no hero (Wave 9 Sprint 9.1 PR1) — N votações desde
  // AAAA quando há cobertura histórica conhecida; cai em fallback honesto
  // quando o banco está vazio (caso de bootstrap, jamais em produção).
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
        {/* Wave 9 Sprint 9.1 PR2 — 4 stats narrativos sob o hero. Total e
            "Última votação" sempre presentes; Aprovadas/Rejeitadas usam
            janela 12m (mesmo critério Wave 8) para refletir atividade
            recente, não acervo cumulativo. */}
        <StatsGrid
          items={[
            {
              value: formatNumeroAbreviado(stats.total),
              label: 'Total',
              hint: 'no banco',
            },
            {
              value: formatNumeroAbreviado(stats.aprovadas12m),
              label: 'Aprovadas',
              hint: 'últimos 12 m',
            },
            {
              value: formatNumeroAbreviado(stats.rejeitadas12m),
              label: 'Rejeitadas',
              hint: 'últimos 12 m',
            },
            (() => {
              const ultima = formatUltimaVotacaoStat(stats.ultimaVotacaoData)
              return {
                value: ultima.value,
                label: 'Última votação',
                hint: ultima.hint,
              }
            })(),
          ]}
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
