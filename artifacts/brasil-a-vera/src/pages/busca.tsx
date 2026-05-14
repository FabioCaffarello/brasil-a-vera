import { useLocation, Link } from 'wouter'
import { useBuscar, getBuscarQueryKey } from '@workspace/api-client-react'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { formatProposicaoRef } from '@/lib/format'

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const [, navigate] = useLocation()
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
    if (q) navigate(`/busca?q=${encodeURIComponent(q)}`)
  }
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Nome do parlamentar, ementa, PL 1234/2025"
        autoComplete="off"
        className="min-h-[44px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
      />
      <button type="submit" className="min-h-[44px] rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
        Buscar
      </button>
    </form>
  )
}

export default function BuscaPage() {
  const params = useQueryParams()
  const query = params.get('q')?.trim() ?? ''

  const buscarParams = { q: query || ' ' }
  const { data: resultados, isLoading } = useBuscar(
    buscarParams,
    { query: { enabled: query.length >= 2, queryKey: getBuscarQueryKey(buscarParams) } }
  )

  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Buscar</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Pesquise por nome de parlamentar, ementa de proposição, descrição de votação ou referência (PL 1234/2025).
        </p>
        <SearchInput />
      </div>
    )
  }

  if (query.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Buscar</h1>
        <SearchInput defaultValue={query} />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Digite ao menos 2 caracteres.</p>
      </div>
    )
  }

  const parl = resultados?.parlamentares ?? []
  const props = resultados?.proposicoes ?? []
  const vots = resultados?.votacoes ?? []
  const totalResultados = parl.length + props.length + vots.length

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Resultados para "{query}"
        </h1>
        <SearchInput defaultValue={query} />
      </header>

      {resultados?.proposicaoMatchExato && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm text-emerald-900 dark:text-emerald-200">
            Referência de proposição detectada. Ir direto para{' '}
            <Link
              href={`/proposicoes/${resultados.proposicaoMatchExato.tipo}/${resultados.proposicaoMatchExato.numero}/${resultados.proposicaoMatchExato.ano}`}
              className="font-mono font-semibold underline decoration-dotted"
            >
              {formatProposicaoRef(
                resultados.proposicaoMatchExato.tipo ?? '',
                resultados.proposicaoMatchExato.numero ?? 0,
                resultados.proposicaoMatchExato.ano ?? 0,
              )}
            </Link>
            ?
          </p>
        </section>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-500">Buscando...</p>
      ) : totalResultados === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Nenhum resultado encontrado. Tente termos mais curtos ou variantes.
        </p>
      ) : (
        <>
          {parl.length > 0 && (
            <Section title={`Parlamentares (${parl.length})`}>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {parl.map((p) => <li key={p.id}><ParlamentarCard parlamentar={{ ...p, urlFoto: p.urlFoto ?? null }} /></li>)}
              </ul>
            </Section>
          )}
          {props.length > 0 && (
            <Section title={`Proposições (${props.length})`}>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {props.map((p) => <li key={p.id}><ProposicaoCard proposicao={p} /></li>)}
              </ul>
            </Section>
          )}
          {vots.length > 0 && (
            <Section title={`Votações (${vots.length})`}>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {vots.map((v) => <li key={v.id}><VotacaoCard votacao={v} /></li>)}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
