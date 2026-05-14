import type { TemaContagem } from '@/lib/queries/partidos'

interface Props {
  temas: TemaContagem[]
}

export function TopTemasPartido({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma proposição autorada por membros desta bancada na base atual.
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {temas.map((t) => (
        <li
          key={t.nomeTema}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="text-zinc-800 dark:text-zinc-200">{t.nomeTema}</span>
          <span className="font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            {t.contagem}
          </span>
        </li>
      ))}
    </ol>
  )
}
