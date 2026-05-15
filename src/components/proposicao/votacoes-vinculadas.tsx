import { formatDataBR } from '@/lib/format'

interface Votacao {
  id: string
  casa: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
}

interface Props {
  votacoes: Votacao[]
}

export function VotacoesVinculadas({ votacoes }: Props) {
  if (votacoes.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Nenhuma votação foi vinculada a esta proposição na base atual. Isso pode
        acontecer se a votação correspondente não foi ingerida, ou se ainda não
        houve votação registrada.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {votacoes.map((v) => (
        <li className="rounded-lg border border-border p-3" key={v.id}>
          <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
            <span>{formatDataBR(v.dataHora)}</span>
            <span aria-hidden>·</span>
            <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
            <span aria-hidden>·</span>
            <span>{v.orgao}</span>
            <span aria-hidden>·</span>
            <span
              className={
                v.aprovada
                  ? 'font-medium text-success'
                  : 'font-medium text-destructive'
              }
            >
              {v.aprovada ? 'Aprovada' : 'Rejeitada'}
            </span>
          </div>
          <p className="mt-1.5 text-foreground text-sm">{v.descricao}</p>
          {(v.votosSim > 0 || v.votosNao > 0) && (
            <p className="mt-1 tabular-nums text-foreground-muted text-xs">
              Sim: {v.votosSim} · Não: {v.votosNao}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
