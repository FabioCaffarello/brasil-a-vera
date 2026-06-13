// Cópia-rds de src/components/home/card-votacoes-semana.tsx — onda HeroSection
// (home /). Card de entrada da home (votações recentes, fallback 7d → 30d via
// prop diasJanela). Original INTOCADO. Comportamento preservado.
//
// Card primitive → cópia local ./card (ver ./card.tsx). hrefs do card e
// "Ver todas" → /rds/votacoes/[id] e /rds/votacoes (perfil/listagem migrados).
// formatDataBR da lib preservado (lógica de domínio única, NÃO duplicada).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   bg-surface-elevated     → bg-surface-raised
//   text-brand              → text-fg-brand (byte-idêntico pós-#358)
//   border-border           → border-line-default
//   text-foreground{,-muted}→ text-fg-{primary,tertiary}
//   ring-ring               → ring-line-focus
//   bg-success/20 text-success     → bg-success/20 text-fg-success
//     (bg-success/N homônimo ext. piloto-2; text-success→text-fg-success)
//   bg-destructive/20 text-destructive → bg-error/20 text-fg-error
//     (ext. piloto-2/3, destructive→error)

import { Vote } from 'lucide-react'
import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { VotacaoRecente } from '@/lib/queries/votacoes'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card'

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

      <CardContent className="flex-1">
        {votacoes.length === 0 ? (
          <p className="text-fg-tertiary text-sm leading-relaxed">
            Nenhuma votação registrada nos últimos {diasJanela} dias. Atualize
            em alguns dias — o cron ingere 4×/dia.
          </p>
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
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[10px] uppercase ${
                      v.aprovada
                        ? 'bg-success/20 text-fg-success'
                        : 'bg-error/20 text-fg-error'
                    }`}
                  >
                    {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                  </span>
                </div>
                <Link
                  className="line-clamp-2 text-fg-primary hover:text-fg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                  href={`/rds/votacoes/${v.id}`}
                >
                  {truncar(v.descricao, 100)}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2">
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
          href="/rds/votacoes"
        >
          Ver todas <span aria-hidden>→</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
