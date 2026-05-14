import { useLocation } from 'wouter'
import { useComparar, getCompararQueryKey } from '@workspace/api-client-react'
import { ParlamentaresGrid } from '@/components/comparar/parlamentares-grid'
import { ConcordanciaMatrix } from '@/components/comparar/concordancia-matrix'

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

export default function CompararPage() {
  const params = useQueryParams()
  const idsParam = params.get('ids') ?? ''
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)

  const compararParams = { ids: idsParam }
  const { data, isLoading, error } = useComparar(
    compararParams,
    { query: { enabled: ids.length >= 2, queryKey: getCompararQueryKey(compararParams) } }
  )

  if (ids.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Comparar parlamentares</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
          <h2 className="font-medium text-amber-900 dark:text-amber-200">Comparativo indisponível</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Use a URL com 2 ou 3 IDs de parlamentares separados por vírgula:
          </p>
          <p className="mt-2 font-mono text-xs text-amber-700 dark:text-amber-400">
            /comparar?ids=&lt;uuid1&gt;,&lt;uuid2&gt;
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="p-8 text-sm text-zinc-500">Carregando comparativo...</div>

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950">
          <h1 className="font-medium text-rose-900 dark:text-rose-200">Erro ao carregar comparativo</h1>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">Verifique se os IDs são válidos e tente novamente.</p>
        </div>
      </div>
    )
  }

  const d = data as unknown as Record<string, unknown>
  const parlamentares = (d.parlamentares as Array<Record<string, unknown>>) ?? []
  const metricas = (d.metricas as Array<Record<string, unknown>>) ?? []
  const concordancia = (d.concordancia as Array<Record<string, unknown>>) ?? []
  const ano = Number(d.ano ?? new Date().getFullYear())

  const nomesPorId = new Map(parlamentares.map((p) => [String(p.id), String(p.nome)]))

  const concordanciaPares = concordancia.map((c) => ({
    parlamentarA: String(c.a),
    parlamentarB: String(c.b),
    total: Number(c.votosEmComum ?? 0),
    coincidentes: Number(c.coincidentes ?? 0),
    percentual: c.percentual != null ? Number(c.percentual) : null,
  }))

  const parlamentaresData = parlamentares.map((p) => ({
    id: String(p.id),
    nome: String(p.nome),
    casa: p.casa as 'CAMARA' | 'SENADO',
    partidoSigla: String(p.partidoSigla),
    uf: String(p.uf),
    urlFoto: p.urlFoto ? String(p.urlFoto) : null,
  }))

  const metricasData = metricas.map((m) => ({
    parlamentarId: String(m.parlamentarId),
    presenca: (m.presenca as { presente: number; total: number; percentual: number | null }),
    gastosTotalGeral: String(m.gastosTotalGeral ?? '0'),
    gastosTotalRegistros: Number(m.gastosTotalRegistros ?? 0),
    gastosTopCategorias: ((m.gastosTopCategorias as Array<{ categoriaDescricao: string; total: string; n: number }>) ?? []),
    proposicoesAutoriaPrimaria: Number(m.proposicoesAutoriaPrimaria ?? 0),
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Comparativo</h1>

      <Section title="Parlamentares">
        <ParlamentaresGrid parlamentares={parlamentaresData} metricas={metricasData} ano={ano} />
      </Section>

      {concordanciaPares.length > 0 && (
        <Section title="Concordância de votos" hint="% de votações em que ambos votaram na mesma direção.">
          <ConcordanciaMatrix pares={concordanciaPares} nomesPorId={nomesPorId} />
        </Section>
      )}
    </div>
  )
}
