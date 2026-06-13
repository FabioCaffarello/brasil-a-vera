// Cópia-rds de src/components/votacao/votacao-card.tsx — onda HeroSection
// (rota /busca). Reuso da tradução já feita na listagem /rds/votacoes
// (§3.16) — espelho verbatim, exceto este header. Original INTOCADO.
// /busca mantém suas próprias cópias (self-contained).
//
// Card de listagem (link-card simples: data/casa/órgão + badge
// aprovada/rejeitada + descrição line-clamp-3 + linha de votos nominais).
// href do card → /rds/votacoes/[id] (perfil migrado na piloto-4). Sem
// data-viz (regra 2 não disparada — sem SVG/chart/`hsl(var())`/`color-mix`;
// barra inexistente neste card). formatDataBR da lib preservado.
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border          → border-line-default
//   bg-surface             → bg-surface-base
//   hover:border-border-strong → hover:border-line-emphasis
//   hover:bg-surface-elevated  → hover:bg-surface-raised
//   focus-visible:ring-ring    → focus-visible:ring-line-focus
//   text-foreground        → text-fg-primary
//   text-foreground-muted  → text-fg-tertiary
//   bg-success/20 text-success    → bg-success/20 text-fg-success
//       (bg-success utility homônimo, ext. piloto-2; text-success→text-fg-success)
//   bg-destructive/20 text-destructive → bg-error/20 text-fg-error
//       (ext. piloto-2/3 — destructive→error)

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'

interface Props {
  votacao: {
    id: string
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    abstencoes: number
  }
}

export function VotacaoCard({ votacao: v }: Props) {
  const totalNominais = v.votosSim + v.votosNao + v.abstencoes
  return (
    <Link
      className="block rounded-lg border border-line-default bg-surface-base p-4 transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
      href={`/rds/votacoes/${v.id}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-xs">
        <span className="flex items-center gap-2">
          <span>{formatDataBR(v.dataHora)}</span>
          <span aria-hidden>·</span>
          <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
          <span aria-hidden>·</span>
          <span>{v.orgao}</span>
        </span>
        <span
          className={
            v.aprovada
              ? 'rounded bg-success/20 px-2 py-0.5 font-medium text-fg-success text-xs'
              : 'rounded bg-error/20 px-2 py-0.5 font-medium text-fg-error text-xs'
          }
        >
          {v.aprovada ? 'Aprovada' : 'Rejeitada'}
        </span>
      </div>
      <p className="line-clamp-3 text-fg-primary text-sm">{v.descricao}</p>
      {totalNominais > 0 && (
        <p className="mt-2 tabular-nums text-fg-tertiary text-xs">
          Sim: {v.votosSim} · Não: {v.votosNao} · Abstenção: {v.abstencoes}
        </p>
      )}
    </Link>
  )
}
