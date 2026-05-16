import Link from 'next/link'

import { getTipoVotoStyle } from '@/lib/format'
import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  votos: VotoIndividual[]
  filtroAtual?: string
  totalSemFiltro?: number
  votacaoId: string
}

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
  { value: 'ABSTENCAO', label: 'Abstenção' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'OBSTRUCAO', label: 'Obstrução' },
]

// Sprint 4.2 PR 5 commit 7/8 — filter tabs + list refatorados para
// tokens semânticos. Badge de cada voto usa `getTipoVotoStyle` em
// `format.ts` (commit 1/8), que já está em tokens.
//
// Filter pill ativo: variant `inverse` (foreground/background trocados)
// para destacar seleção sem ressaltar com cor — semelhante ao pattern
// de Button variant=default.
export function VotosIndividuais({
  votos,
  filtroAtual,
  totalSemFiltro,
  votacaoId,
}: Props) {
  return (
    <div>
      <nav
        aria-label="Filtrar por voto"
        className="mb-3 flex flex-wrap gap-1.5 text-xs"
      >
        {TIPOS.map((t) => {
          const isAtivo = (filtroAtual ?? '') === t.value
          const href = t.value
            ? `/votacoes/${votacaoId}?voto=${t.value}`
            : `/votacoes/${votacaoId}`
          return (
            <Link
              className={
                isAtivo
                  ? 'rounded bg-foreground px-2.5 py-1 font-medium text-background'
                  : 'rounded border border-border-strong px-2.5 py-1 text-foreground hover:bg-surface-elevated'
              }
              href={href}
              key={t.value}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      {votos.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          {filtroAtual
            ? 'Nenhum voto deste tipo registrado nesta votação.'
            : 'Sem votos individuais.'}
        </p>
      ) : (
        <>
          <p className="mb-2 text-foreground-muted text-xs">
            {votos.length}
            {totalSemFiltro != null && filtroAtual && ` de ${totalSemFiltro}`}{' '}
            voto{votos.length === 1 ? '' : 's'}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {votos.map((v) => {
              const style = getTipoVotoStyle(v.voto)
              return (
                <li
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-elevated"
                  key={v.id}
                >
                  <Link
                    className="min-w-0 flex-1 truncate text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground-muted"
                    href={`/parlamentares/${v.parlamentarId}`}
                  >
                    {v.parlamentarNome}
                  </Link>
                  <span className="shrink-0 text-foreground-muted text-xs">
                    {v.parlamentarPartidoSigla}/{v.parlamentarUf}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-xs ${style.classes}`}
                  >
                    {style.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
