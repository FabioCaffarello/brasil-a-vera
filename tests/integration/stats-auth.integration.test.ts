import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('./setup/db'))

import { GET as statsHandler } from '@/app/api/stats/route'

import { truncateAll } from './setup/truncate'

// 32 chars: tamanho mínimo aceito pelo Zod em src/lib/admin-auth.ts.
const TEST_KEY = 'test-admin-key-12345678901234567'

function reqFor(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/stats', { headers })
}

describe('api/stats auth (integration)', () => {
  const originalKey = process.env.ADMIN_API_KEY

  beforeEach(async () => {
    await truncateAll()
    process.env.ADMIN_API_KEY = TEST_KEY
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ADMIN_API_KEY
    } else {
      process.env.ADMIN_API_KEY = originalKey
    }
  })

  it('sem header x-admin-key retorna 401 missing', async () => {
    const res = await statsHandler(reqFor())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('missing')
    expect(res.headers.get('cache-control')).toBe(
      'no-store, no-cache, must-revalidate',
    )
  })

  it('header com valor inválido retorna 401 invalid', async () => {
    const res = await statsHandler(
      reqFor({ 'x-admin-key': 'wrong-key-12345678901234567890ab' }),
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid')
  })

  it('header com chave válida retorna 200 + payload de stats', async () => {
    const res = await statsHandler(reqFor({ 'x-admin-key': TEST_KEY }))
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      timestamp: string
      database: { sizeBytes: number; sizeMb: number }
      rowCounts: Record<string, number>
      lastIngestion: Record<string, string | null>
      cache: unknown
    }
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.database.sizeBytes).toBeGreaterThan(0)
    expect(Object.keys(body.rowCounts).length).toBeGreaterThan(0)
    expect(body.lastIngestion).toBeDefined()
  })

  it('retorna 503 quando ADMIN_API_KEY ausente do ambiente', async () => {
    delete process.env.ADMIN_API_KEY
    const res = await statsHandler(reqFor({ 'x-admin-key': TEST_KEY }))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('admin-not-configured')
  })
})
