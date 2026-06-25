import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  DataBadge,
} from '@fabio.caffarello/react-design-system/server'
import { Vote } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { resultadoStatus } from '@/components/votacao/resultado'
import { formatDataBR } from '@/lib/format'
import type { VotacaoRecente } from '@/lib/queries/votacoes'

interface Props {
  votacoes: VotacaoRecente[]
  /** Janela temporal usada para encontrar essas votações (7 ou 30 dias). */
  diasJanela: number
}

function truncar(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trim()}…`
}

/**
 * Card 2 da home — Sprint 4.1 PR 4 (refatorado).
 * Consome `Card` primitive + tokens semânticos. Comportamento preservado
 * de Sprint 3.1 Tarefa 2 (fallback 7d → 30d via prop diasJanela).
 */
export function CardVotacoesSemana({ votacoes, diasJanela }: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-raised text-fg-brand"
        >
          <Vote className="size-5" />
        </div>
        <CardTitle className="text-lg">Votações da semana</CardTitle>
      </CardHeader>

      <CardBody className="flex-1">
        {votacoes.length === 0 ? (
          <EmptyState
            description={`Nenhuma votação registrada nos últimos ${diasJanela} dias. O cron ingere 4×/dia.`}
            icon={Vote}
            title="Nenhuma votação recente"
          />
        ) : (
          <ol className="space-y-3 text-sm">
            {votacoes.map((v) => (
              <li
                className="border-line-default border-b pb-2 last:border-0"
                key={v.id}
              >
                <div className="mb-1 flex items-center gap-2 text-fg-tertiary text-xs">
                  <span className="tabular-nums">
                    {formatDataBR(v.dataHora)}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="font-medium uppercase tracking-wide">
                    {v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
                  </span>
                  <span aria-hidden>·</span>
                  <DataBadge size="sm" {...resultadoStatus(v.aprovada)} />
                </div>
                <Link
                  className="line-clamp-2 text-fg-primary hover:text-fg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                  href={`/votacoes/${v.id}`}
                >
                  {truncar(v.descricao, 100)}
                </Link>
                {v.proposicaoTipo && v.proposicaoNumero && v.proposicaoAno ? (
                  <Link
                    className="mt-0.5 inline-block text-fg-tertiary text-xs decoration-dotted underline-offset-2 hover:text-fg-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                    href={`/proposicoes/${v.proposicaoTipo}/${v.proposicaoNumero}/${v.proposicaoAno}`}
                  >
                    {v.proposicaoTipo} {v.proposicaoNumero}/{v.proposicaoAno} →
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardBody>

      <CardActions className="flex flex-col items-start gap-2">
        {votacoes.length > 0 && (
          <p className="text-fg-tertiary text-xs">
            {votacoes.length}{' '}
            {votacoes.length === 1
              ? 'votação nos últimos'
              : 'votações nos últimos'}{' '}
            {diasJanela} dias. Atualizado conforme novos votos são ingeridos.
          </p>
        )}
        <Link
          className="inline-flex items-center font-medium text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href="/votacoes"
        >
          Ver todas <span aria-hidden>→</span>
        </Link>
      </CardActions>
    </Card>
  )
}
