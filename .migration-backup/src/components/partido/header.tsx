interface Props {
  sigla: string
  nomeOficial: string | null
  totalParlamentares: number
}

export function PartidoHeader({
  sigla,
  nomeOficial,
  totalParlamentares,
}: Props) {
  return (
    <header className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Partido
      </p>
      <h1 className="font-bold text-3xl text-zinc-900 dark:text-zinc-100">
        {sigla}
      </h1>
      {nomeOficial && nomeOficial !== sigla && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {nomeOficial}
        </p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {totalParlamentares === 0
          ? 'Nenhum parlamentar atualmente filiado nesta sigla.'
          : `${totalParlamentares} ${totalParlamentares === 1 ? 'parlamentar' : 'parlamentares'} no Brasil a Vera.`}
      </p>
    </header>
  )
}
