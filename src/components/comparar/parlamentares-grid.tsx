import { formatBRL } from '@/lib/format'
import type {
  MetricasParlamentar,
  ParlamentarComparar,
} from '@/lib/queries/comparar'

interface Props {
  parlamentares: ParlamentarComparar[]
  metricas: MetricasParlamentar[]
  ano: number
}

export function ParlamentaresGrid({ parlamentares, metricas, ano }: Props) {
  const metricaPorId = new Map(metricas.map((m) => [m.parlamentarId, m]))
  const cols = parlamentares.length

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {parlamentares.map((p) => {
        const m = metricaPorId.get(p.id)
        if (!m) return null
        return (
          <div
            key={p.id}
            className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <header className="flex items-center gap-3">
              {p.urlFoto ? (
                // biome-ignore lint/performance/noImgElement: foto remota; CLS evitado com width/height.
                <img
                  src={p.urlFoto}
                  alt=""
                  loading="lazy"
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-12 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {p.nome}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {p.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ·{' '}
                  <span className="font-medium">{p.partidoSigla}</span>/{p.uf}
                </p>
              </div>
            </header>

            <dl className="space-y-2.5 border-zinc-200 border-t pt-3 text-sm dark:border-zinc-700">
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Presença em votações nominais
                </dt>
                <dd className="mt-0.5 tabular-nums text-zinc-800 dark:text-zinc-200">
                  {m.presenca.percentual !== null ? (
                    <>
                      <span className="font-semibold">
                        {m.presenca.percentual}%
                      </span>{' '}
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ({m.presenca.presente}/{m.presenca.total})
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Sem votos
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Proposições autoria primária
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                  {m.proposicoesAutoriaPrimaria}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Gasto CEAP — {ano}
                </dt>
                <dd className="mt-0.5">
                  {m.gastosTotalRegistros === 0 ? (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Sem gastos registrados
                    </span>
                  ) : (
                    <>
                      <p className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                        {formatBRL(m.gastosTotalGeral)}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {m.gastosTopCategorias.map((c) => (
                          <li
                            key={c.categoriaDescricao}
                            className="flex justify-between gap-2 tabular-nums"
                          >
                            <span className="truncate">
                              {c.categoriaDescricao}
                            </span>
                            <span>{formatBRL(c.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )
      })}
    </div>
  )
}
