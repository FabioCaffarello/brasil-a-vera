import { BarChart3 } from 'lucide-react'

import { TrustBadge } from '@/components/trust/trust-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/design-system/primitives/card'
import { formatNumeroAbreviado } from '@/lib/format-number'
import type { PublicStats } from '@/lib/queries/stats-public'

interface Props {
  stats: PublicStats
}

function formatUltimaAtualizacao(iso: string | null): string {
  if (!iso) return 'sem registro'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'sem registro'
  // Formato DD/MM HH:MM em PT-BR — relativo "há N horas" seria mais
  // amigável mas exige re-render no cliente (timezone do servidor não é
  // garantido). Absoluto evita inconsistência.
  const dia = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const hora = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  return `${dia} ${hora}`
}

/**
 * Card 3 da home — Sprint 4.1 PR 4 (refatorado).
 * Consome `Card` primitive + tokens semânticos. Trust badge L1 preservado.
 */
export function CardStats({ stats }: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-brand"
        >
          <BarChart3 className="size-5" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">A plataforma em números</CardTitle>
          <TrustBadge trustLevel="L1" />
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <dt className="text-foreground-muted text-xs">parlamentares</dt>
            <dd className="font-semibold text-2xl text-foreground tabular-nums">
              {formatNumeroAbreviado(stats.totalParlamentares)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted text-xs">votações</dt>
            <dd className="font-semibold text-2xl text-foreground tabular-nums">
              {formatNumeroAbreviado(stats.totalVotacoes)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted text-xs">proposições</dt>
            <dd className="font-semibold text-2xl text-foreground tabular-nums">
              {formatNumeroAbreviado(stats.totalProposicoes)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted text-xs">
              última atualização
            </dt>
            <dd className="font-semibold text-base text-foreground tabular-nums">
              {formatUltimaAtualizacao(stats.ultimaAtualizacaoVotacoes)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
