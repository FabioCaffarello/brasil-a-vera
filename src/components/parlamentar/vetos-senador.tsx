// Seção "Vetos presidenciais" no perfil do senador (ADR-059, Sprint 13.2).
// Um card por VETO (não por dispositivo — auditoria UX 2026-07-20, P0.3):
// o mesmo veto tem dezenas de dispositivos votados em bloco e a lista crua
// chegava a ~350 cards de título idêntico. Cada card resume os votos do
// senador nos dispositivos daquele veto; o detalhe por dispositivo vive em
// /vetos/[id]. Vetos além dos primeiros ficam em <details> nativo (zero-JS).

import { Card } from '@fabio.caffarello/react-design-system/server'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { agruparVetosPorVeto, type VetoAgrupado } from '@/lib/agrupar-vetos'
import type { VetoPorSenador } from '@/lib/queries/vetos'

const VETOS_VISIVEIS = 10

interface VetosStats {
  sim: number
  nao: number
  abstencao: number
}

interface Props {
  vetos: VetoPorSenador[]
  stats: VetosStats | null
}

function situacaoResumo(s: VetoAgrupado['situacoes']): string {
  const partes: string[] = []
  if (s.derrubados > 0) partes.push(`${s.derrubados} derrubados`)
  if (s.mantidos > 0) partes.push(`${s.mantidos} mantidos`)
  if (s.emTramitacao > 0) partes.push(`${s.emTramitacao} em tramitação`)
  return partes.join(' · ')
}

function VetoCard({ veto }: { veto: VetoAgrupado }) {
  return (
    <Card padding="none" className="p-3" variant="default">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            className="font-medium text-fg-primary text-sm hover:underline"
            href={`/vetos/${veto.vetoId}`}
          >
            VET {veto.vetoNumero}/{veto.vetoAno}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-fg-tertiary text-xs">
            {veto.vetoEmenta}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-fg-quaternary text-xs">
            <span>
              {veto.dispositivosTotal === 1
                ? '1 dispositivo votado'
                : `${veto.dispositivosTotal} dispositivos votados`}
            </span>
            {veto.dataSessao && <span>{veto.dataSessao}</span>}
            <span>{situacaoResumo(veto.situacoes)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {veto.votosSim > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300">
              <ThumbsUp className="h-3 w-3" aria-hidden />
              Sim × {veto.votosSim}
            </span>
          )}
          {veto.votosNao > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 text-xs dark:bg-red-900/30 dark:text-red-300">
              <ThumbsDown className="h-3 w-3" aria-hidden />
              Não × {veto.votosNao}
            </span>
          )}
          {veto.votosOutros > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-fg-tertiary text-xs">
              outros × {veto.votosOutros}
            </span>
          )}
        </div>
      </div>
    </Card>
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

  const grupos = agruparVetosPorVeto(vetos)
  const visiveis = grupos.slice(0, VETOS_VISIVEIS)
  const restantes = grupos.slice(VETOS_VISIVEIS)

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
        {visiveis.map((v) => (
          <li key={v.vetoId}>
            <VetoCard veto={v} />
          </li>
        ))}
      </ul>

      {restantes.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer rounded-md py-1 text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2">
            Mostrar mais {restantes.length}{' '}
            {restantes.length === 1 ? 'veto' : 'vetos'}
          </summary>
          <ul className="mt-2 space-y-2">
            {restantes.map((v) => (
              <li key={v.vetoId}>
                <VetoCard veto={v} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-fg-tertiary text-xs">
        Voto do senador nos dispositivos de cada veto presidencial, apreciados
        em sessão conjunta do Congresso. "Sim" mantém o veto; "Não" vota por
        derrubá-lo.
      </p>
    </div>
  )
}
