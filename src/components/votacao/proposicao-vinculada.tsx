// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'

interface Props {
  proposicao: {
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
    temas?: Array<{ codigo: number; nome: string }>
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
      {p.temas && p.temas.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {p.temas.map((t) => (
            <li
              className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 text-fg-tertiary text-xs"
              key={t.codigo}
            >
              {t.nome}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
