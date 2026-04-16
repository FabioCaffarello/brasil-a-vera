export type SortDirection = 'asc' | 'desc'

export type SearchParamsConstructorProps<Filter = string> = {
  page?: number
  perPage?: number
  sort?: string | null
  sortDir?: SortDirection | null
  filter?: Filter | null
}

export class SearchParams<Filter = string> {
  private _page: number
  private _perPage: number
  private _sort: string | null
  private _sortDir: SortDirection | null
  private _filter: Filter | null

  constructor(props: SearchParamsConstructorProps<Filter> = {}) {
    this._page = SearchParams.sanitizePage(props.page)
    this._perPage = SearchParams.sanitizePerPage(props.perPage)
    this._sort = props.sort ?? null
    this._sortDir = this._sort
      ? SearchParams.sanitizeSortDir(props.sortDir)
      : null
    this._filter = props.filter ?? null
  }

  get page(): number {
    return this._page
  }

  get perPage(): number {
    return this._perPage
  }

  get sort(): string | null {
    return this._sort
  }

  get sortDir(): SortDirection | null {
    return this._sortDir
  }

  get filter(): Filter | null {
    return this._filter
  }

  private static sanitizePage(value?: number): number {
    if (value === undefined || value === null) return 1
    let page = +value
    if (Number.isNaN(page) || page <= 0 || !Number.isInteger(page)) {
      page = 1
    }
    return page
  }

  private static sanitizePerPage(value?: number): number {
    if (value === undefined || value === null) return 15
    let perPage = +value
    if (Number.isNaN(perPage) || perPage <= 0 || !Number.isInteger(perPage)) {
      perPage = 15
    }
    return perPage
  }

  private static sanitizeSortDir(value?: SortDirection | null): SortDirection {
    if (!value) return 'asc'
    const dir = value.toLowerCase()
    return dir === 'desc' ? 'desc' : 'asc'
  }
}
