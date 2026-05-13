import { formatDataBR } from '@/lib/format'

interface Evento {
  id: string
  data: Date | string
  orgao: string
  descricaoResumida: string
  descricaoCompleta: string | null
  situacaoResultante: string | null
}

interface Props {
  eventos: Evento[]
}

export function TramitacaoTimeline({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nenhum evento de tramitação ingerido para esta proposição. A coleta de
        tramitação é semanal (domingo 03:00 UTC) e cobre apenas proposições com
        movimentação registrada na fonte oficial.
      </p>
    )
  }

  return (
    <ol className="relative space-y-3 border-zinc-200 border-l-2 pl-5 dark:border-zinc-700">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className="-left-[26px] absolute top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium tabular-nums">
              {formatDataBR(e.data)}
            </span>
            <span aria-hidden>·</span>
            <span>{e.orgao}</span>
            {e.situacaoResultante && (
              <>
                <span aria-hidden>·</span>
                <span className="italic">{e.situacaoResultante}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
            {e.descricaoResumida}
          </p>
          {e.descricaoCompleta && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                Ver despacho completo
              </summary>
              <p className="mt-1.5 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                {e.descricaoCompleta}
              </p>
            </details>
          )}
        </li>
      ))}
    </ol>
  )
}
