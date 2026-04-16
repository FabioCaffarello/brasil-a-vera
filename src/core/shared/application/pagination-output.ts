import type { SearchResult } from '../domain/repository/search-result'

export type PaginationOutput<Item> = {
  items: Item[]
  total: number
  currentPage: number
  perPage: number
  lastPage: number
}

export function toPaginationOutput<Item>(
  items: Item[],
  result: SearchResult,
): PaginationOutput<Item> {
  return {
    items,
    total: result.total,
    currentPage: result.currentPage,
    perPage: result.perPage,
    lastPage: result.lastPage,
  }
}
