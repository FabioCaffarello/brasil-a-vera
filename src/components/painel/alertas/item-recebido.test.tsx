import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemRecebido } from './item-recebido'

const DELIVERY_ID = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'

const BASE_PROPS = {
  id: DELIVERY_ID,
  subject: 'Brasil à Vera · Resumo 10/05–17/05',
  scheduledFor: '2026-05-17T21:00:00.000Z',
  bodyHtml: '<h1>Resumo</h1><p>conteúdo do report</p>',
}

/**
 * Simula expandir o `<details>` programaticamente.
 * jsdom não implementa o evento `toggle` automaticamente em response
 * a click no `<summary>`; setamos `open=true` e disparamos o evento
 * `toggle` manualmente, que é o que o browser real faria.
 */
function expandDetails(container: HTMLElement) {
  const details = container.querySelector('details')
  if (!details) throw new Error('expected <details> in container')
  details.open = true
  fireEvent(details, new Event('toggle', { bubbles: true }))
  return details
}

describe('ItemRecebido', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exibe badge "Novo" quando initialReadAt é null', () => {
    render(<ItemRecebido {...BASE_PROPS} initialReadAt={null} />)
    expect(screen.getByText('Novo')).toBeDefined()
  })

  it('não exibe badge "Novo" quando initialReadAt está setado', () => {
    render(
      <ItemRecebido {...BASE_PROPS} initialReadAt="2026-05-18T10:00:00.000Z" />,
    )
    expect(screen.queryByText('Novo')).toBeNull()
  })

  it('mostra subject e data', () => {
    render(<ItemRecebido {...BASE_PROPS} initialReadAt={null} />)
    expect(screen.getByText(BASE_PROPS.subject)).toBeDefined()
    expect(screen.getByText('17/05')).toBeDefined()
  })

  it('expande mostrando body HTML', () => {
    const { container } = render(
      <ItemRecebido {...BASE_PROPS} initialReadAt={null} />,
    )
    expandDetails(container)
    expect(screen.getByText('Resumo')).toBeDefined()
    expect(screen.getByText('conteúdo do report')).toBeDefined()
  })

  it('chama POST ao expandir (primeira vez)', async () => {
    const { container } = render(
      <ItemRecebido {...BASE_PROPS} initialReadAt={null} />,
    )
    expandDetails(container)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/painel/alertas/recebidos/${DELIVERY_ID}/read`,
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('NÃO chama API se já estava lido (initialReadAt setado)', async () => {
    const { container } = render(
      <ItemRecebido {...BASE_PROPS} initialReadAt="2026-05-18T10:00:00.000Z" />,
    )
    expandDetails(container)

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('remove badge "Novo" otimisticamente ao expandir', () => {
    const { container } = render(
      <ItemRecebido {...BASE_PROPS} initialReadAt={null} />,
    )
    expect(screen.getByText('Novo')).toBeDefined()

    expandDetails(container)
    expect(screen.queryByText('Novo')).toBeNull()
  })

  it('reverte badge "Novo" se servidor retorna erro', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal' }),
    } as Response)

    const { container } = render(
      <ItemRecebido {...BASE_PROPS} initialReadAt={null} />,
    )
    expandDetails(container)

    await waitFor(() => {
      expect(screen.getByText('Novo')).toBeDefined()
    })
  })
})
