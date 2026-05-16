import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'

interface Props {
  proposicao: {
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
  }
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Em tramitação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

// Sprint 4.2 PR 5 commit 4/8 — link-card refatorado para tokens
// semânticos. Mesmo padrão hover dos outros cards de listagem
// (parlamentar/proposicao/votacao): border-border → border-border-strong.
export function ProposicaoVinculada({ proposicao: p }: Props) {
  return (
    <Link
      className="block rounded-lg border border-border p-3 transition hover:border-border-strong"
      href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-xs">
        <span className="font-medium font-mono text-foreground">
          {formatProposicaoRef(p.tipo, p.numero, p.ano)}
        </span>
        <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
      </div>
      <p className="line-clamp-2 text-foreground text-sm">
        {p.ementa || (
          <span className="text-foreground-subtle italic">(sem ementa)</span>
        )}
      </p>
    </Link>
  )
}
