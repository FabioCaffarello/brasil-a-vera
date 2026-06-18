// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import Link from 'next/link'

import { getTipoVotoStyle } from '@/lib/format'
import type { DivergenciaRow } from '@/lib/queries/votacoes'

interface Props {
  divergencias: readonly DivergenciaRow[]
  /** Quantos partidos têm orientação efetiva nesta votação. Quando >0 e
   * `divergencias.length === 0`, é sinal positivo (alinhamento total), não
   * ausência de dado — caller deve renderizar a seção mesmo assim. */
  partidosComOrientacao: number
}

const ORIENTACAO_LABEL: Record<string, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  OBSTRUCAO: 'Obstrução',
}

export function DivergenciasList({
  divergencias,
  partidosComOrientacao,
}: Props) {
  if (partidosComOrientacao === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Esta votação não teve orientações de bancada registradas.
      </p>
    )
  }

  if (divergencias.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Nenhum parlamentar votou diferente da orientação do próprio partido
        nesta votação. Alinhamento total entre as bancadas com orientação.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-fg-tertiary text-xs">
        {divergencias.length} parlamentar{divergencias.length === 1 ? '' : 'es'}{' '}
        votou diferente da orientação do próprio partido.
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {divergencias.map((r) => {
          const votoStyle = getTipoVotoStyle(r.votou)
          const orientacaoLabel = ORIENTACAO_LABEL[r.orientacao] ?? r.orientacao
          return (
            <li
              className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-raised"
              key={r.parlamentarId}
            >
              <Link
                className="min-w-0 flex-1 truncate rounded text-fg-primary underline decoration-dotted underline-offset-2 hover:text-fg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                href={`/parlamentares/${r.parlamentarId}`}
              >
                {r.nome}
              </Link>
              <span className="shrink-0 text-fg-tertiary text-xs">
                {r.partidoSigla}/{r.uf}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-xs ${votoStyle.classes}`}
                title={`Votou ${votoStyle.label} — orientação do partido era ${orientacaoLabel}`}
              >
                {votoStyle.label}
                <span className="ml-1 text-fg-quaternary">
                  vs {orientacaoLabel}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
