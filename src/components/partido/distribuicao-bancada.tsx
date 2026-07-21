import type { PartidoMembro } from '@/lib/queries/partidos'

interface Props {
  membros: PartidoMembro[]
}

const TOP_UFS = 5

export function DistribuicaoBancadaBlock({ membros }: Props) {
  const camara = membros.filter((m) => m.casa === 'CAMARA').length
  const senado = membros.filter((m) => m.casa === 'SENADO').length

  // Contagem por UF, ordenada decrescente.
  const porUf = new Map<string, number>()
  for (const m of membros) {
    porUf.set(m.uf, (porUf.get(m.uf) ?? 0) + 1)
  }
  const topUfs = [...porUf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_UFS)

  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="font-bold text-2xl text-fg-primary tabular-nums">
            {camara}
          </p>
          <p className="text-fg-tertiary text-xs">na Câmara</p>
        </div>
        {senado > 0 && (
          <div>
            <p className="font-bold text-2xl text-fg-primary tabular-nums">
              {senado}
            </p>
            <p className="text-fg-tertiary text-xs">no Senado</p>
          </div>
        )}
      </div>

      {topUfs.length > 0 && (
        <div>
          <p className="mb-2 text-fg-tertiary text-xs uppercase tracking-wide">
            Maiores delegações estaduais
          </p>
          <ul className="space-y-1">
            {topUfs.map(([uf, count]) => (
              <li key={uf} className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-mono text-fg-secondary text-xs">
                  {uf}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.round((count / membros.length) * 100)}%`,
                      backgroundColor: 'var(--color-chart-2)',
                    }}
                    aria-hidden
                  />
                </div>
                <span className="w-5 shrink-0 text-right text-fg-tertiary text-xs tabular-nums">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
