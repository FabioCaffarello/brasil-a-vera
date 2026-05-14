import { useLocation } from 'wouter'
import { useListVotacoes, useGetVotacoesFiltros } from '@workspace/api-client-react'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { TrustBanner } from '@/components/trust-banner'

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

export default function VotacoesPage() {
  const [, navigate] = useLocation()
  const params = useQueryParams()
  const casa = params.get('casa') ?? undefined
  const ano = params.get('ano') ?? undefined
  const resultado = params.get('resultado') ?? undefined
  const somenteNominais = params.get('somenteNominais') === '1'

  const { data: votacoes = [], isLoading } = useListVotacoes({
    casa: casa as 'CAMARA' | 'SENADO' | undefined,
    ano: ano ? Number(ano) : undefined,
    resultado: resultado as 'aprovadas' | 'rejeitadas' | undefined,
    somenteNominais: somenteNominais || undefined,
  })
  const { data: filtrosData } = useGetVotacoesFiltros()
  const anos = filtrosData?.anos ?? []

  function handleFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const newParams = new URLSearchParams()
    const casaVal = (form.elements.namedItem('casa') as HTMLSelectElement).value
    const anoVal = (form.elements.namedItem('ano') as HTMLSelectElement).value
    const resultadoVal = (form.elements.namedItem('resultado') as HTMLSelectElement).value
    const nominaisVal = (form.elements.namedItem('somenteNominais') as HTMLInputElement).checked
    if (casaVal) newParams.set('casa', casaVal)
    if (anoVal) newParams.set('ano', anoVal)
    if (resultadoVal) newParams.set('resultado', resultadoVal)
    if (nominaisVal) newParams.set('somenteNominais', '1')
    navigate(`/votacoes${newParams.toString() ? `?${newParams}` : ''}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Votações</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Plenário e comissões da Câmara e do Senado.
        </p>
      </header>

      <TrustBanner level="L1" message="Votações oficiais da Câmara e do Senado, sem transformação." />

      <form onSubmit={handleFilter} className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Casa</span>
            <select name="casa" defaultValue={casa ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Câmara + Senado</option>
              <option value="CAMARA">Câmara dos Deputados</option>
              <option value="SENADO">Senado Federal</option>
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
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Resultado</span>
            <select name="resultado" defaultValue={resultado ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Aprovadas + rejeitadas</option>
              <option value="aprovadas">Só aprovadas</option>
              <option value="rejeitadas">Só rejeitadas</option>
            </select>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="somenteNominais" value="1" defaultChecked={somenteNominais} className="size-5 rounded border-zinc-300 dark:border-zinc-600" />
          Só votações nominais
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <a href="/votacoes" className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">Limpar</a>
          <button type="submit" className="min-h-[44px] rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">Filtrar</button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : votacoes.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Nenhuma votação encontrada.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{votacoes.length} resultados</p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {votacoes.map((v) => <li key={v.id}><VotacaoCard votacao={v} /></li>)}
          </ul>
        </>
      )}
    </div>
  )
}
