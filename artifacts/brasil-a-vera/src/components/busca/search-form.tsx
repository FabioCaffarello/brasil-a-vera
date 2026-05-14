interface Props {
  defaultValue?: string
  variant?: 'header' | 'page'
}

export function SearchForm({ defaultValue, variant = 'header' }: Props) {
  if (variant === 'header') {
    return (
      <search>
        <form action="/busca" method="get" className="flex items-center">
          <label htmlFor="search-header" className="sr-only">
            Buscar parlamentares, proposições e votações
          </label>
          <input
            id="search-header"
            type="search"
            name="q"
            defaultValue={defaultValue}
            placeholder="Buscar…"
            autoComplete="off"
            className="min-h-[44px] w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm placeholder:text-zinc-400 focus:w-48 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500 sm:w-48 sm:focus:w-64"
          />
        </form>
      </search>
    )
  }

  return (
    <search>
      <form action="/busca" method="get" className="flex items-center gap-2">
        <label htmlFor="search-page" className="sr-only">
          Buscar parlamentares, proposições e votações
        </label>
        <input
          id="search-page"
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Nome do parlamentar, ementa, descrição da votação ou PL 1234/2025"
          autoComplete="off"
          className="min-h-[44px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Buscar
        </button>
      </form>
    </search>
  )
}
