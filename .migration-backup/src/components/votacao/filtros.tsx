interface Props {
  anos: number[]
  selecionado: {
    casa?: string
    ano?: string
    resultado?: string
    somenteNominais?: boolean
  }
}

const CASAS = [
  { value: '', label: 'Câmara + Senado' },
  { value: 'CAMARA', label: 'Câmara dos Deputados' },
  { value: 'SENADO', label: 'Senado Federal' },
]

const RESULTADOS = [
  { value: '', label: 'Aprovadas + rejeitadas' },
  { value: 'aprovadas', label: 'Só aprovadas' },
  { value: 'rejeitadas', label: 'Só rejeitadas' },
]

export function FiltrosVotacao({ anos, selecionado }: Props) {
  return (
    <form
      action="/votacoes"
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
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
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
            Ano
          </span>
          <select
            name="ano"
            defaultValue={selecionado.ano ?? ''}
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Resultado
          </span>
          <select
            name="resultado"
            defaultValue={selecionado.resultado ?? ''}
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            {RESULTADOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="somenteNominais"
          value="1"
          defaultChecked={Boolean(selecionado.somenteNominais)}
          className="size-5 rounded border-zinc-300 dark:border-zinc-600"
        />
        Só votações nominais (com voto individual registrado)
      </label>

      <div className="mt-3 flex justify-end gap-2">
        <a
          href="/votacoes"
          className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Limpar
        </a>
        <button
          type="submit"
          className="min-h-[44px] rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
