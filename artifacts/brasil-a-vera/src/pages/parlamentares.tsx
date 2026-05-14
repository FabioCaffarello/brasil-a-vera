import { useLocation } from 'wouter'
import { useListParlamentares, useGetParlamentaresFiltros } from '@workspace/api-client-react'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { TrustBanner } from '@/components/trust-banner'

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

export default function ParlamentaresPage() {
  const [, navigate] = useLocation()
  const params = useQueryParams()
  const casa = params.get('casa') ?? undefined
  const partido = params.get('partido') ?? undefined
  const uf = params.get('uf') ?? undefined

  const { data: parlamentares = [], isLoading, error } = useListParlamentares({ casa: casa as 'CAMARA' | 'SENADO' | undefined, partido, uf })
  const { data: filtrosData } = useGetParlamentaresFiltros()

  function handleFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const newParams = new URLSearchParams()
    const casaVal = (form.elements.namedItem('casa') as HTMLSelectElement).value
    const partidoVal = (form.elements.namedItem('partido') as HTMLSelectElement).value
    const ufVal = (form.elements.namedItem('uf') as HTMLSelectElement).value
    if (casaVal) newParams.set('casa', casaVal)
    if (partidoVal) newParams.set('partido', partidoVal)
    if (ufVal) newParams.set('uf', ufVal)
    navigate(`/parlamentares${newParams.toString() ? `?${newParams}` : ''}`)
  }

  const partidos = filtrosData?.partidos ?? []
  const ufs = filtrosData?.ufs ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Parlamentares</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Deputados federais (Câmara) e senadores (Senado) em exercício.
        </p>
      </header>

      <TrustBanner level="L1" message="Dados oficiais da Câmara e do Senado, sem transformação." />

      <form onSubmit={handleFilter} className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Casa</span>
            <select name="casa" defaultValue={casa ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Todas as casas</option>
              <option value="CAMARA">Câmara dos Deputados</option>
              <option value="SENADO">Senado Federal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Partido</span>
            <select name="partido" defaultValue={partido ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Todos</option>
              {partidos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">UF</span>
            <select name="uf" defaultValue={uf ?? ''} className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800">
              <option value="">Todas</option>
              {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <a href="/parlamentares" className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">Limpar</a>
          <button type="submit" className="min-h-[44px] rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">Filtrar</button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">Erro ao carregar parlamentares.</p>
      ) : parlamentares.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">Nenhum parlamentar corresponde aos filtros.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{parlamentares.length} {parlamentares.length === 1 ? 'resultado' : 'resultados'}</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parlamentares.map((p) => (
              <li key={p.id}><ParlamentarCard parlamentar={p} /></li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
