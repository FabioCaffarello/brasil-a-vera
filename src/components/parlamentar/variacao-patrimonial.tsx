// Variação patrimonial real durante o mandato + percentil vs pares (ADR-047).
// Server component.
//
// Copy neutra e honesta (ADR-047 D3): contagem factual, sem juízo de ilicitude,
// sem cor de juízo. Nota de fonte obrigatória — é a DECLARAÇÃO de bens à Justiça
// Eleitoral, não renda nem movimentação. Distinto de gastos (CEAP) — D4.

import Link from 'next/link'
import { formatBRL } from '@/lib/format'
import type { VariacaoPatrimonial } from '@/lib/queries/variacao-patrimonial'

interface Props {
  variacao: VariacaoPatrimonial
}

export function VariacaoPatrimonialBlock({ variacao }: Props) {
  const delta = Number(variacao.deltaRealAbs)
  const sinal = delta > 0 ? '+' : ''

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-2xl text-fg-primary tabular-nums">
          {sinal}
          {formatBRL(delta)}
        </span>
        <span className="text-fg-tertiary text-sm">
          de variação real entre {variacao.pleitoDe} e {variacao.pleitoAte}
          {variacao.deltaPct !== null
            ? ` (${variacao.deltaPct > 0 ? '+' : ''}${variacao.deltaPct}% real)`
            : ''}
        </span>
      </div>

      {variacao.percentil !== null ? (
        <p className="text-fg-secondary text-sm">
          Variou mais que <strong>{variacao.percentil}%</strong> dos{' '}
          {variacao.nPares} parlamentares da casa com o mesmo par de pleitos.
        </p>
      ) : null}

      <p className="text-fg-tertiary text-xs">
        Valores corrigidos por IPCA para preços de dez/2022. É a{' '}
        <strong>declaração de bens à Justiça Eleitoral</strong> nas candidaturas
        de {variacao.pleitoDe} e {variacao.pleitoAte} — não é renda nem
        movimentação bancária, e reflete o que foi declarado em cada eleição.
      </p>

      <Link
        className="text-fg-tertiary text-xs underline decoration-dotted underline-offset-2 hover:text-fg-primary"
        href="/rankings/patrimonio"
      >
        Ver ranking de variação patrimonial →
      </Link>
    </div>
  )
}
