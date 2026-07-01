// Seção "Vetos presidenciais" no perfil do senador (ADR-059, Sprint 13.2).
// Mostra os vetos em que votou, com posição e resultado do dispositivo.

import { Card } from '@fabio.caffarello/react-design-system/server'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import type { VetoPorSenador } from '@/lib/queries/vetos'

interface VetosStats {
  sim: number
  nao: number
  abstencao: number
}

interface Props {
  vetos: VetoPorSenador[]
  stats: VetosStats | null
}

function VotoChip({ voto }: { voto: string }) {
  if (voto === 'SIM') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300">
        <ThumbsUp className="h-3 w-3" aria-hidden />
        Sim
      </span>
    )
  }
  if (voto === 'NAO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 text-xs dark:bg-red-900/30 dark:text-red-300">
        <ThumbsDown className="h-3 w-3" aria-hidden />
        Não
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-fg-tertiary text-xs">
      {voto.toLowerCase()}
    </span>
  )
}

function SituacaoLabel({ situacao }: { situacao: string | null }) {
  if (situacao === 'Mantido')
    return <span className="text-red-700 dark:text-red-400">Veto mantido</span>
  if (situacao === 'Rejeitado')
    return (
      <span className="text-green-700 dark:text-green-400">Veto derrubado</span>
    )
  return (
    <span className="text-amber-700 dark:text-amber-400">Em tramitação</span>
  )
}

export function VetosSenador({ vetos, stats }: Props) {
  if (vetos.length === 0) {
    return (
      <EmptyState
        description="Não há votos em vetos presidenciais registrados para este senador. A ingestão cobre a legislatura atual (2023–hoje)."
        title="Nenhum voto em veto"
      />
    )
  }

  return (
    <div className="space-y-3">
      {stats && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-medium text-green-800 text-sm dark:bg-green-900/30 dark:text-green-300">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            Sim — {stats.sim}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 font-medium text-red-800 text-sm dark:bg-red-900/30 dark:text-red-300">
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
            Não — {stats.nao}
          </span>
          {stats.abstencao > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-3 py-1 text-fg-tertiary text-sm">
              Abstenção — {stats.abstencao}
            </span>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {vetos.map((v) => (
          <li key={`${v.dispositivoId}`}>
            <Card padding="none" className="p-3" variant="default">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    className="font-medium text-fg-primary text-sm hover:underline"
                    href={`/vetos/${v.vetoId}`}
                  >
                    VET {v.vetoNumero}/{v.vetoAno}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-fg-tertiary text-xs">
                    {v.vetoEmenta}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-fg-quaternary">
                      {v.dispositivoIdentificador}
                    </span>
                    {v.dataSessao && (
                      <span className="text-fg-quaternary">{v.dataSessao}</span>
                    )}
                    <SituacaoLabel situacao={v.situacao} />
                  </div>
                </div>
                <VotoChip voto={v.voto} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-fg-tertiary text-xs">
        Voto do senador em cada dispositivo vetado pelo presidente, apreciado em
        sessão conjunta do Congresso. ADR-059.
      </p>
    </div>
  )
}
