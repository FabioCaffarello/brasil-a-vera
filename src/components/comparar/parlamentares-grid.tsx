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

// Sprint 4.4 PR 2 commit 1/3 — refatorado para tokens semânticos.
// Grid de 2-3 colunas com foto + nome/partido + 3 métricas (presença,
// proposições, gasto CEAP + top 3 categorias).
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
            className="space-y-3 rounded-lg border border-line-default bg-surface-base p-4"
            key={p.id}
          >
            <header className="flex items-center gap-3">
              {p.urlFoto ? (
                // biome-ignore lint/performance/noImgElement: foto remota; CLS evitado com width/height.
                <img
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                  height={48}
                  loading="lazy"
                  src={p.urlFoto}
                  width={48}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-12 shrink-0 rounded-full bg-surface-raised"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-fg-primary text-sm">
                  {p.nome}
                </p>
                <p className="text-fg-tertiary text-xs">
                  {p.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ·{' '}
                  <span className="font-medium">{p.partidoSigla}</span>/{p.uf}
                </p>
              </div>
            </header>

            <dl className="space-y-2.5 border-line-default border-t pt-3 text-sm">
              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Presença em votações nominais
                </dt>
                <dd className="mt-0.5 tabular-nums text-fg-primary">
                  {m.presenca.percentual !== null ? (
                    <>
                      <span className="font-semibold">
                        {m.presenca.percentual}%
                      </span>{' '}
                      <span className="text-fg-tertiary text-xs">
                        ({m.presenca.presente}/{m.presenca.total})
                      </span>
                    </>
                  ) : (
                    <span className="text-fg-tertiary">Sem votos</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Proposições autoria primária
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-fg-primary">
                  {m.proposicoesAutoriaPrimaria}
                </dd>
              </div>

              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Gasto CEAP — {ano}
                </dt>
                <dd className="mt-0.5">
                  {m.gastosTotalRegistros === 0 ? (
                    <span className="text-fg-tertiary">
                      Sem gastos registrados
                    </span>
                  ) : (
                    <>
                      <p className="font-semibold tabular-nums text-fg-primary">
                        {formatBRL(m.gastosTotalGeral)}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-fg-tertiary text-xs">
                        {m.gastosTopCategorias.map((c) => (
                          <li
                            className="flex justify-between gap-2 tabular-nums"
                            key={c.categoriaDescricao}
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
