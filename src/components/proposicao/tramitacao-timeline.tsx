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
      <p className="text-foreground-muted text-sm">
        Nenhum evento de tramitação ingerido para esta proposição. A coleta de
        tramitação é semanal (domingo 03:00 UTC) e cobre apenas proposições com
        movimentação registrada na fonte oficial.
      </p>
    )
  }

  return (
    <ol className="relative space-y-3 border-border border-l-2 pl-5">
      {eventos.map((e) => (
        <li className="relative" key={e.id}>
          <span
            aria-hidden
            className="-left-[26px] absolute top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-surface"
          />
          <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
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
          <p className="mt-1 text-foreground text-sm">{e.descricaoResumida}</p>
          {e.descricaoCompleta && (
            <details className="mt-1">
              <summary className="cursor-pointer text-foreground-muted text-xs hover:text-foreground">
                Ver despacho completo
              </summary>
              <p className="mt-1.5 whitespace-pre-line text-foreground text-sm">
                {e.descricaoCompleta}
              </p>
            </details>
          )}
        </li>
      ))}
    </ol>
  )
}
