interface Props {
  defaultValue?: string
  variant?: 'header' | 'page'
}

// Server Component — `<form>` GET submete pra /busca, RSC re-renderiza.
// Sem JS de client.
//
// `<search>` é landmark HTML5 nativo para regiões de busca — substitui o
// `role="search"` no <form>.
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
            className="min-h-[44px] w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm placeholder:text-zinc-400 transition-all duration-150 focus:w-48 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500 sm:w-48 sm:focus:w-64"
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
          className="min-h-[44px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-md bg-primary-700 px-4 py-2 font-medium text-sm text-white transition-colors duration-150 hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-600 dark:hover:bg-primary-500"
        >
          Buscar
        </button>
      </form>
    </search>
  )
}
