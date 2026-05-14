import { useLocation } from 'wouter'
import { useListProposicoes, useGetProposicoesFiltros } from '@workspace/api-client-react'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { TrustBanner } from '@/components/trust-banner'

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

const TIPOS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'PL', label: 'PL — Projeto de Lei' },
  { value: 'PEC', label: 'PEC — Emenda à Constituição' },
  { value: 'PLP', label: 'PLP — Lei Complementar' },
  { value: 'MPV', label: 'MPV — Medida Provisória' },
  { value: 'PDC', label: 'PDC — Decreto Legislativo' },
  { value: 'PRC', label: 'PRC — Resolução' },
]

const SITUACOES = [
  { value: '', label: 'Todas as situações' },
  { value: 'TRAMITANDO', label: 'Tramitando' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
  { value: 'ARQUIVADA', label: 'Arquivada' },
  { value: 'TRANSFORMADA_EM_NORMA', label: 'Virou norma' },
]

export default function ProposicoesPage() {
  const [, navigate] = useLocation()
  const params = useQueryParams()
  const tipo = params.get('tipo') ?? undefined
  const ano = params.get('ano') ?? undefined
  const situacao = params.get('situacao') ?? undefined

  const { data: proposicoes = [], isLoading } = useListProposicoes({
    tipo: tipo as 'PL' | undefined,
    ano: ano ? Number(ano) : undefined,
    situacao: situacao as 'TRAMITANDO' | undefined,
  })
  const { data: filtrosData } = useGetProposicoesFiltros()
  const anos = filtrosData?.anos ?? []

  function handleFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const newParams = new URLSearchParams()
    const tipoVal = (form.elements.namedItem('tipo') as HTMLSelectElement).value
    const anoVal = (form.elements.namedItem('ano') as HTMLSelectElement).value
    const situacaoVal = (form.elements.namedItem('situacao') as HTMLSelectElement).value
    if (tipoVal) newParams.set('tipo', tipoVal)
    if (anoVal) newParams.set('ano', anoVal)
    if (situacaoVal) newParams.set('situacao', situacaoVal)
    navigate(`/proposicoes${newParams.toString() ? `?${newParams}` : ''}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Proposições</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Projetos de lei, PECs, MPs e demais proposições legislativas.
        </p>
      </header>

      <TrustBanner level="L1" message="Proposições oficiais da Câmara e do Senado, sem transformação." />

      <form onSubmit={handleFilter} className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tipo</span>
            <select name="tipo" defaultValue={tipo ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Ano</span>
            <select name="ano" defaultValue={ano ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Todos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Situação</span>
            <select name="situacao" defaultValue={situacao ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <a href="/proposicoes" className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">Limpar</a>
          <button type="submit" className="min-h-[44px] rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">Filtrar</button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : proposicoes.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Nenhuma proposição encontrada.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{proposicoes.length} resultados</p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {proposicoes.map((p) => <li key={p.id}><ProposicaoCard proposicao={p} /></li>)}
          </ul>
        </>
      )}
    </div>
  )
}
