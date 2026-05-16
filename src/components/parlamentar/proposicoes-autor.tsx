import { formatProposicaoRef } from '@/lib/format'

interface Proposicao {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  situacao: string
  tipoAutoria: string
}

interface Props {
  proposicoes: Proposicao[]
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

// Sprint 4.3 PR 2 commit 3/4 — refatorado para tokens semânticos.
// Densidade reduzida (lista compacta dentro de Section) — situação como
// label textual neutro, mesmo padrão de `proposicao-vinculada` em
// /votacoes/[id] (Sprint 4.2 PR 5 commit 4/8).
export function ProposicoesAutor({ proposicoes }: Props) {
  if (proposicoes.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem proposições onde este parlamentar consta como autor ou coautor na
        base atual.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {proposicoes.map((p) => (
        <li
          className="rounded-lg border border-border p-3"
          key={p.proposicaoId}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-xs">
            <span className="font-medium font-mono text-foreground">
              {formatProposicaoRef(p.tipo, p.numero, p.ano)}
            </span>
            <span className="flex items-center gap-2">
              <span>{p.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}</span>
              <span aria-hidden>·</span>
              <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
            </span>
          </div>
          <p className="mt-1.5 text-foreground text-sm">{p.ementa}</p>
        </li>
      ))}
    </ul>
  )
}
