import { ExternalLink } from 'lucide-react'

import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL } from '@/lib/format'
import type { PatrimonioSnapshot } from '@/modules/eleitoral/domain/patrimonio'

// Seção "Patrimônio declarado" do perfil (Eixo 2 — Camada A). Server component,
// sem JS no cliente: a composição por categoria é renderizada como barras CSS
// (proporção = pct), não Recharts — mais leve e suficiente para share-of-total.
//
// Trust (EIXO-2 §7): total e composição % são agregação (L2); os valores
// individuais de bem são L1. O badge da seção é L2, com nota explícita.

interface Props {
  snapshot: PatrimonioSnapshot
}

// Quantas categorias mostrar antes de agregar o resto em "outras".
const TOP_N = 8

function formatDataIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export function PatrimonioBlock({ snapshot }: Props) {
  const { anoEleicao, total, nBens, dtUltAtualizacao, sourceUrl, categorias } =
    snapshot

  const top = categorias.slice(0, TOP_N)
  const resto = categorias.slice(TOP_N)
  const restoTotal = resto.reduce((acc, c) => acc + Number(c.total), 0)
  const restoN = resto.reduce((acc, c) => acc + c.n, 0)
  const restoPct =
    Math.round(resto.reduce((acc, c) => acc + c.pct, 0) * 10) / 10

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold text-2xl text-fg-primary">
          {formatBRL(total)}
        </span>
        <span className="text-fg-tertiary text-sm">
          em {nBens} {nBens === 1 ? 'bem declarado' : 'bens declarados'} ·
          candidatura de {anoEleicao}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-fg-tertiary text-xs">
          Total e composição são agregação determinística; os valores
          individuais de cada bem são L1 (bruto do TSE).
        </span>
      </div>

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Bens declarados na candidatura de {anoEleicao} ao TSE. Valores{' '}
        <strong className="font-medium text-fg-secondary">nominais</strong> —
        não corrigidos pela inflação. Patrimônio é declarado por candidatura
        (anos eleitorais), não de forma contínua.
      </p>

      <ul className="space-y-2.5">
        {top.map((c, idx) => (
          <li className="space-y-1" key={c.cdTipoBem}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-fg-primary">
                {c.dsTipoBem}
              </span>
              <span className="shrink-0 tabular-nums text-fg-tertiary">
                {formatBRL(c.total)}
                <span className="ml-1.5 text-fg-tertiary text-xs">
                  {c.pct.toLocaleString('pt-BR')}% · {c.n}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(c.pct, 0.5)}%`,
                  backgroundColor: 'var(--color-chart-2)',
                  // Hierarquia visual decrescente por ranking (igual ao chart de gastos).
                  opacity: Math.max(1 - idx * 0.09, 0.35),
                }}
              />
            </div>
          </li>
        ))}
        {resto.length > 0 && (
          <li className="flex items-baseline justify-between gap-3 border-line-default border-t pt-2 text-fg-tertiary text-sm">
            <span>
              + {resto.length} outra{resto.length === 1 ? '' : 's'} categoria
              {resto.length === 1 ? '' : 's'}
            </span>
            <span className="tabular-nums">
              {formatBRL(restoTotal)}
              <span className="ml-1.5 text-xs">
                {restoPct.toLocaleString('pt-BR')}% · {restoN}
              </span>
            </span>
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-line-default border-t pt-3 text-fg-tertiary text-xs">
        <a
          className="inline-flex items-center gap-1.5 text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          Fonte: TSE — declaração de bens {anoEleicao}
          <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
        {dtUltAtualizacao ? (
          <span>Atualizada no TSE em {formatDataIso(dtUltAtualizacao)}</span>
        ) : null}
      </div>
    </div>
  )
}
