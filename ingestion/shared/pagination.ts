import type { HttpClient } from './http-client'
import { logger } from './logger'

type PaginationOptions = {
  itemsPerPage?: number
  dataKey?: string
}

type PaginatedResponse = {
  dados: unknown[]
  links: Array<{ rel: string; href: string }>
  [key: string]: unknown
}

export async function* fetchAllPages<T>(
  client: HttpClient,
  path: string,
  params?: Record<string, string | string[]>,
  options?: PaginationOptions,
): AsyncGenerator<T[], void, unknown> {
  const itemsPerPage = options?.itemsPerPage ?? 100
  const dataKey = options?.dataKey ?? 'dados'
  let page = 1

  while (true) {
    const response = await client.get<PaginatedResponse>(path, {
      ...params,
      pagina: String(page),
      itens: String(itemsPerPage),
    })

    const data = response[dataKey] as T[] | undefined
    if (!data || data.length === 0) {
      break
    }

    yield data

    if (page % 5 === 0 || data.length < itemsPerPage) {
      logger.info('Paginação progresso', {
        page,
        itemsInPage: data.length,
        path,
      })
    }

    if (data.length < itemsPerPage) {
      break
    }

    page++
  }
}
