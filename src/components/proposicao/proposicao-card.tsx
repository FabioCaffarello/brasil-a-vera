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
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

/**
 * Mapeamento situação → tokens semânticos.
 *
 * - TRAMITANDO: active, em progresso → bg-brand/20 + text-brand (subtle)
 * - APROVADA: outcome positivo → bg-success/20 + text-success (subtle)
 * - REJEITADA: outcome negativo → bg-destructive/20 + text-destructive
 * - ARQUIVADA: inativo → bg-surface-elevated + text-foreground-muted
 * - TRANSFORMADA_EM_NORMA: pinnacle outcome (lei!) → bg-success solid
 *   text-success-foreground. Visual hierarchy: solid > subtle.
 */
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-brand/20 text-brand',
  APROVADA: 'bg-success/20 text-success',
  REJEITADA: 'bg-destructive/20 text-destructive',
  ARQUIVADA: 'bg-surface-elevated text-foreground-muted',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

/**
 * Card de listagem de proposição — Sprint 4.2 PR 2 (refatorado).
 * Migra de zinc/blue/emerald/rose/violet HEX para tokens semânticos.
 * Mapeamento das 5 situações documentado em SITUACAO_CLASSES acima.
 */
export function ProposicaoCard({ proposicao }: Props) {
  const { tipo, numero, ano, ementa, situacao } = proposicao
  const href = `/proposicoes/${tipo}/${numero}/${ano}`
  const situacaoClasses =
    SITUACAO_CLASSES[situacao] ?? SITUACAO_CLASSES.ARQUIVADA
  return (
    <Link
      className="block rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={href}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium font-mono text-foreground-muted text-sm">
          {formatProposicaoRef(tipo, numero, ano)}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${situacaoClasses}`}
        >
          {SITUACAO_LABELS[situacao] ?? situacao}
        </span>
      </div>
      <p className="line-clamp-3 text-foreground text-sm">
        {ementa || (
          <span className="text-foreground-subtle italic">(sem ementa)</span>
        )}
      </p>
    </Link>
  )
}
