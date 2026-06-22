// Feature de discursos (ADR-048). Server component.
//
// Mostra os principais TEMAS (frequência das keywords da fonte) e os discursos
// RECENTES (metadados + link ao inteiro teor). Determinístico, sem IA (D2).
// Copy honesta (D4): discurso ≠ posição/voto; tipos procedurais existem; os
// temas são indexação oficial, não juízo.

import { formatDataBR } from '@/lib/format'
import type { DiscursosResult } from '@/lib/queries/discursos'

interface Props {
  discursos: DiscursosResult
}

export function Discursos({ discursos }: Props) {
  if (discursos.total === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem discursos ingeridos para este parlamentar.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-fg-tertiary text-xs">
        {discursos.total} discursos ingeridos. São falas em plenário e comissão
        — não a posição oficial nem o voto. Tipos como "Pela Ordem" e "Breves
        Comunicações" são intervenções procedurais. Os temas vêm da indexação
        oficial da fonte.
      </p>

      {discursos.temas.length > 0 ? (
        <div>
          <h3 className="mb-2 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
            Principais temas
          </h3>
          <ul className="flex flex-wrap gap-2">
            {discursos.temas.map((t) => (
              <li
                className="rounded-full bg-surface-muted px-2.5 py-0.5 text-fg-secondary text-xs"
                key={t.termo}
              >
                {t.termo}{' '}
                <span className="text-fg-tertiary tabular-nums">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
          Discursos recentes
        </h3>
        <ul className="space-y-3">
          {discursos.recentes.map((d) => (
            <li
              className="rounded-lg border border-line-default p-3"
              key={`${d.data}-${d.tipo}-${d.sumario ?? ''}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
                <span className="tabular-nums">{formatDataBR(d.data)}</span>
                <span aria-hidden>·</span>
                <span className="uppercase tracking-wide">{d.tipo}</span>
              </div>
              {d.sumario ? (
                <p className="mt-1.5 text-fg-primary text-sm">{d.sumario}</p>
              ) : null}
              {d.urlTexto ? (
                <a
                  className="mt-1.5 inline-block text-fg-primary text-xs underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
                  href={d.urlTexto}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Inteiro teor na fonte →
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
