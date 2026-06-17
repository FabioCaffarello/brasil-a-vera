import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL } from '@/lib/format'
import {
  formatarCnpj,
  type GrafoParticipacao,
} from '@/modules/eleitoral/domain/grafo'
import { GrafoParticipacaoCanvas } from './grafo-participacao-canvas'

// Seção "Participação societária" do perfil (Eixo 2 — Camada D). O canvas
// ReactFlow (camada BaV, dynamic ssr:false) é a visualização; a LISTA abaixo é
// o detalhe acessível e a fonte de verdade (sempre presente, mesmo sem JS).
// Chrome (TrustBadge, notas) via RDS/tokens. Trust L3 (ADR-037).

const LISTA_TOP = 12

interface Props {
  grafo: GrafoParticipacao
  parlamentarNome: string
}

function anosDe(participacoes: { ano: number }[]): string {
  return [...new Set(participacoes.map((p) => p.ano))]
    .sort((a, b) => a - b)
    .join(', ')
}

export function GrafoParticipacaoBlock({ grafo, parlamentarNome }: Props) {
  const { empresas, totalEmpresas, nResolvidas } = grafo
  const top = empresas.slice(0, LISTA_TOP)
  const resto = totalEmpresas - top.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L3" />
        <span className="text-fg-tertiary text-xs">
          Empresas em que {parlamentarNome.split(' ')[0]} declarou participação
          (quotas/ações), extraídas da descrição do TSE.
        </span>
      </div>

      <GrafoParticipacaoCanvas
        grafo={grafo}
        parlamentarNome={parlamentarNome}
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-fg-tertiary text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-3 rounded-sm border border-[var(--color-chart-1)]"
          />
          com CNPJ ({nResolvidas})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-3 rounded-sm border border-fg-quaternary border-dashed"
          />
          sem CNPJ ({totalEmpresas - nResolvidas})
        </span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {top.map((e) => (
          <li
            className="flex items-baseline justify-between gap-3 border-line-subtle border-b pb-1.5 last:border-0"
            key={e.key}
          >
            <span className="min-w-0">
              <span className="block truncate text-fg-primary" title={e.label}>
                {e.nomeCurto}
              </span>
              <span className="text-fg-tertiary text-xs">
                {e.cnpj ? formatarCnpj(e.cnpj) : 'sem CNPJ declarado'} ·{' '}
                {anosDe(e.participacoes)}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-fg-secondary text-sm">
              {formatBRL(e.totalDeclarado)}
            </span>
          </li>
        ))}
      </ul>
      {resto > 0 ? (
        <p className="text-fg-tertiary text-xs">
          + {resto} {resto === 1 ? 'outra empresa' : 'outras empresas'} de menor
          valor declarado.
        </p>
      ) : null}

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Empresas identificadas pela <strong>descrição livre</strong> do TSE —{' '}
        {nResolvidas} de {totalEmpresas} com CNPJ. Sem resolução por
        similaridade: empresas sem CNPJ podem aparecer duplicadas ou imprecisas.
        Valores nominais declarados. Não consultamos a Receita nem fontes
        externas — só o que o parlamentar declarou.
      </p>
    </div>
  )
}
