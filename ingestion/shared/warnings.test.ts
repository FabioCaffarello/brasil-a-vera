import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { warnIfAtLimit } from './warnings'

describe('warnIfAtLimit', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    delete process.env.DISCORD_INGESTION_WEBHOOK_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.DISCORD_INGESTION_WEBHOOK_URL
  })

  it('não dispara warn quando count < limit', async () => {
    await warnIfAtLimit({ label: 'test', count: 999, limit: 1000 })
    expect(warnSpy).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('dispara warn estruturado quando count === limit', async () => {
    await warnIfAtLimit({
      label: 'senado_votacao',
      count: 1000,
      limit: 1000,
    })
    expect(warnSpy).toHaveBeenCalledOnce()
    const logged = JSON.parse(warnSpy.mock.calls[0]?.[0] as string)
    expect(logged).toMatchObject({
      event: 'warn_limit_reached',
      label: 'senado_votacao',
      count: 1000,
      limit: 1000,
    })
    expect(typeof logged.timestamp).toBe('string')
  })

  it('dispara warn quando count > limit (resilência)', async () => {
    await warnIfAtLimit({ label: 'test', count: 1500, limit: 1000 })
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('não chama fetch quando DISCORD_INGESTION_WEBHOOK_URL não está setado', async () => {
    await warnIfAtLimit({
      label: 'senado_votacao',
      count: 1000,
      limit: 1000,
    })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('chama fetch com payload Discord quando webhook URL está setado', async () => {
    process.env.DISCORD_INGESTION_WEBHOOK_URL =
      'https://discord.com/api/webhooks/fake'
    await warnIfAtLimit({
      label: 'senado_processo',
      count: 2000,
      limit: 2000,
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('https://discord.com/api/webhooks/fake')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    )
    const body = JSON.parse(init.body as string)
    expect(body.content).toContain('senado_processo')
    expect(body.content).toContain('2000/2000')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('loga erro estruturado quando webhook retorna status não-ok', async () => {
    process.env.DISCORD_INGESTION_WEBHOOK_URL =
      'https://discord.com/api/webhooks/fake'
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 })
    await warnIfAtLimit({ label: 'test', count: 10, limit: 10 })
    expect(errorSpy).toHaveBeenCalledOnce()
    const logged = JSON.parse(errorSpy.mock.calls[0]?.[0] as string)
    expect(logged).toMatchObject({
      event: 'ingestion_warn_discord_failed',
      status: 429,
    })
  })
})
