// Edição artificial para validação e2e do consolidation-guard (PR descartável — ver #371).
import type { TemaContagem } from '@/lib/queries/partidos'

interface Props {
  temas: TemaContagem[]
}

// Sprint 4.4 PR 1 commit 4/6 — refatorado para tokens semânticos.
// Lista ordenada simples (tema + contagem tabular).
export function TopTemasPartido({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Nenhuma proposição autorada por membros desta bancada na base atual.
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {temas.map((t) => (
        <li
          className="flex items-center justify-between gap-3 text-sm"
          key={t.nomeTema}
        >
          <span className="text-foreground">{t.nomeTema}</span>
          <span className="font-medium tabular-nums text-foreground-muted">
            {t.contagem}
          </span>
        </li>
      ))}
    </ol>
  )
}