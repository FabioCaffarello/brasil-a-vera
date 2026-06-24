// Seção "Vetos presidenciais" no perfil do senador (ADR-059, Sprint 13.2).
// Mostra os vetos em que votou, com posição e resultado do dispositivo.

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import type { VetoPorSenador } from '@/lib/queries/vetos'

interface Props {
  vetos: VetoPorSenador[]
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

export function VetosSenador({ vetos }: Props) {
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
      <ul className="space-y-2">
        {vetos.map((v) => (
          <li
            key={`${v.dispositivoId}`}
            className="rounded-lg border border-line-default bg-surface-base p-3"
          >
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
