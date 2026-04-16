import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../http-client'
import { fetchAllPages } from '../pagination'

function createMockClient(pages: Record<string, unknown[]>): HttpClient {
  return {
    get: vi
      .fn()
      .mockImplementation((_path: string, params?: Record<string, string>) => {
        const page = params?.pagina ?? '1'
        const data = pages[page] ?? []
        return Promise.resolve({ dados: data, links: [] })
      }),
  } as unknown as HttpClient
}

describe('fetchAllPages', () => {
  it('should fetch a single page', async () => {
    const client = createMockClient({
      '1': [{ id: 1 }, { id: 2 }],
    })

    const results: Array<{ id: number }>[] = []
    for await (const page of fetchAllPages<{ id: number }>(
      client,
      '/items',
      {},
      { itemsPerPage: 100 },
    )) {
      results.push(page)
    }

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('should fetch multiple pages until empty', async () => {
    const client = createMockClient({
      '1': Array.from({ length: 10 }, (_, i) => ({ id: i })),
      '2': Array.from({ length: 10 }, (_, i) => ({ id: 10 + i })),
      '3': [{ id: 20 }],
    })

    const results: Array<{ id: number }>[] = []
    for await (const page of fetchAllPages<{ id: number }>(
      client,
      '/items',
      {},
      { itemsPerPage: 10 },
    )) {
      results.push(page)
    }

    expect(results).toHaveLength(3)
    expect(results[0]).toHaveLength(10)
    expect(results[1]).toHaveLength(10)
    expect(results[2]).toHaveLength(1)
  })

  it('should stop when page returns empty array', async () => {
    const client = createMockClient({
      '1': [{ id: 1 }],
    })

    const results: unknown[][] = []
    for await (const page of fetchAllPages(
      client,
      '/items',
      {},
      { itemsPerPage: 10 },
    )) {
      results.push(page)
    }

    expect(results).toHaveLength(1)
  })

  it('should pass additional params to client', async () => {
    const client = createMockClient({ '1': [] })

    const results: unknown[][] = []
    for await (const page of fetchAllPages(client, '/items', {
      idLegislatura: '57',
    })) {
      results.push(page)
    }

    expect(client.get).toHaveBeenCalledWith('/items', {
      idLegislatura: '57',
      pagina: '1',
      itens: '100',
    })
  })

  it('should use custom dataKey', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        resultados: [{ id: 1 }],
        links: [],
      }),
    } as unknown as HttpClient

    const results: unknown[][] = []
    for await (const page of fetchAllPages(
      client,
      '/items',
      {},
      { dataKey: 'resultados', itemsPerPage: 100 },
    )) {
      results.push(page)
    }

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual([{ id: 1 }])
  })
})
