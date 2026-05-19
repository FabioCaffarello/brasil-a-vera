import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ModalRevisarUfAntiga } from './modal-revisar-uf-antiga'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: vi.fn() }),
}))

const FIRST_FOLLOW_ID = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'
const SECOND_FOLLOW_ID = '019e184f-0cdd-7109-ab34-bbfa9f92bd14'
const FOREIGN_FOLLOWS = [
  {
    id: FIRST_FOLLOW_ID,
    nome: 'Maria Souza',
    partidoSigla: 'PT',
    uf: 'MG',
    urlFoto: null,
  },
  {
    id: SECOND_FOLLOW_ID,
    nome: 'João da Silva',
    partidoSigla: 'PSDB',
    uf: 'RJ',
    urlFoto: null,
  },
]

function getFirstCheckbox() {
  const checkboxes = screen.getAllByRole('checkbox')
  const first = checkboxes[0]
  if (!first) throw new Error('expected at least one checkbox')
  return first
}

describe('ModalRevisarUfAntiga', () => {
  beforeEach(() => {
    routerRefresh.mockClear()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, removed: 1 }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza lista de acompanhados fora da nova UF', () => {
    render(
      <ModalRevisarUfAntiga
        followsForeign={FOREIGN_FOLLOWS}
        newUf="SP"
        onOpenChange={() => {}}
        open={true}
      />,
    )

    expect(screen.getByText('Maria Souza')).toBeDefined()
    expect(screen.getByText('João da Silva')).toBeDefined()
    expect(screen.getByText(/Você mudou para SP/)).toBeDefined()
  })

  it('checkboxes começam unchecked (preserva intenção)', () => {
    render(
      <ModalRevisarUfAntiga
        followsForeign={FOREIGN_FOLLOWS}
        newUf="SP"
        onOpenChange={() => {}}
        open={true}
      />,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes.every((cb) => !(cb as HTMLInputElement).checked)).toBe(
      true,
    )
  })

  it('botão "Desacompanhar" desabilitado até selecionar ao menos 1', async () => {
    render(
      <ModalRevisarUfAntiga
        followsForeign={FOREIGN_FOLLOWS}
        newUf="SP"
        onOpenChange={() => {}}
        open={true}
      />,
    )

    const button = screen.getByRole('button', { name: /Desacompanhar/ })
    expect(button.hasAttribute('disabled')).toBe(true)

    await userEvent.click(getFirstCheckbox())
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('"Manter todos" chama onOpenChange(false) sem fetch', async () => {
    const onOpenChange = vi.fn()
    render(
      <ModalRevisarUfAntiga
        followsForeign={FOREIGN_FOLLOWS}
        newUf="SP"
        onOpenChange={onOpenChange}
        open={true}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Manter todos' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('"Desacompanhar selecionados" envia DELETE batch + refresh', async () => {
    const onOpenChange = vi.fn()
    render(
      <ModalRevisarUfAntiga
        followsForeign={FOREIGN_FOLLOWS}
        newUf="SP"
        onOpenChange={onOpenChange}
        open={true}
      />,
    )

    await userEvent.click(getFirstCheckbox())
    await userEvent.click(screen.getByRole('button', { name: /Desacompanhar/ }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/painel/follows', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parlamentarIds: [FIRST_FOLLOW_ID] }),
      })
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(routerRefresh).toHaveBeenCalled()
    })
  })
})
