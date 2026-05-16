import { formatDataBR, getTipoVotoStyle } from '@/lib/format'

interface Voto {
  voto: string
  votacaoId: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
}

interface Props {
  votos: Voto[]
}

// Sprint 4.3 PR 2 commit 1/4 — refatorado para tokens semânticos.
// Badge do tipo de voto consome `getTipoVotoStyle` em `lib/format.ts`
// (já em tokens desde Sprint 4.2 PR 5).
export function VotosRecentes({ votos }: Props) {
  if (votos.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem votos nominais registrados no período coberto pela base.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {votos.map((v) => {
        const style = getTipoVotoStyle(v.voto)
        return (
          <li className="rounded-lg border border-border p-3" key={v.votacaoId}>
            <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
              <span>{formatDataBR(v.dataHora)}</span>
              <span aria-hidden>·</span>
              <span>{v.orgao}</span>
              <span aria-hidden>·</span>
              <span>
                Resultado:{' '}
                <span className="font-medium">
                  {v.aprovada ? 'aprovada' : 'rejeitada'}
                </span>
              </span>
            </div>
            <div className="mt-1.5 flex items-start gap-3">
              <span
                className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 font-semibold text-xs ${style.classes}`}
              >
                {style.label}
              </span>
              <p className="text-foreground text-sm">{v.descricao}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
