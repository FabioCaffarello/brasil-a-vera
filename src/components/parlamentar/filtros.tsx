// Server Component — `<form action="...">` submete via GET, RSC re-renderiza
// com os novos searchParams. Sem JS de client necessário.

interface Props {
  partidos: string[]
  ufs: string[]
  selecionado: {
    casa?: string
    partido?: string
    uf?: string
  }
}

const CASAS = [
  { value: '', label: 'Todas as casas' },
  { value: 'CAMARA', label: 'Câmara dos Deputados' },
  { value: 'SENADO', label: 'Senado Federal' },
]

export function Filtros({ partidos, ufs, selecionado }: Props) {
  return (
    <form
      action="/parlamentares"
      method="get"
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Casa
          </span>
          <select
            name="casa"
            defaultValue={selecionado.casa ?? ''}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            {CASAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Partido
          </span>
          <select
            name="partido"
            defaultValue={selecionado.partido ?? ''}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">Todos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            UF
          </span>
          <select
            name="uf"
            defaultValue={selecionado.uf ?? ''}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">Todas</option>
            {ufs.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <a
          href="/parlamentares"
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Limpar
        </a>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
