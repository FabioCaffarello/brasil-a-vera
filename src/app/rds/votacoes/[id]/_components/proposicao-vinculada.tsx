// Cópia-rds de src/components/votacao/proposicao-vinculada.tsx
// (piloto-4). Server Component puro. Tokens traduzidos pela tabela
// canônica. Link aponta pra rota de PRODUÇÃO (precedente piloto-3:
// cross-links de entidade não ficam sob /rds/).

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

export function ProposicaoVinculada({ proposicao: p }: Props) {
  return (
    <Link
      className="block rounded-lg border border-line-default p-3 transition hover:border-line-emphasis"
      href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-xs">
        <span className="font-medium font-mono text-fg-primary">
          {formatProposicaoRef(p.tipo, p.numero, p.ano)}
        </span>
        <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
      </div>
      <p className="line-clamp-2 text-fg-primary text-sm">
        {p.ementa || (
          <span className="text-fg-quaternary italic">(sem ementa)</span>
        )}
      </p>
    </Link>
  )
}
