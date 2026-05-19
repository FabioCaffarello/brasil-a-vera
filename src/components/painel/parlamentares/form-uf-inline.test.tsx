import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormUfInline } from './form-uf-inline'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: vi.fn() }),
}))

describe('FormUfInline', () => {
  beforeEach(() => {
    routerRefresh.mockClear()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('botão Salvar desabilitado enquanto UF não selecionada', () => {
    render(<FormUfInline />)
    const button = screen.getByRole('button', { name: 'Salvar UF' })
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('habilita botão ao selecionar UF', async () => {
    render(<FormUfInline />)

    await userEvent.selectOptions(screen.getByLabelText(/Sua UF/), 'SP')

    const button = screen.getByRole('button', { name: 'Salvar UF' })
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('submete POST e chama router.refresh', async () => {
    render(<FormUfInline />)

    await userEvent.selectOptions(screen.getByLabelText(/Sua UF/), 'SP')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar UF' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/painel/profile/uf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uf: 'SP' }),
      })
    })
    await waitFor(() => {
      expect(routerRefresh).toHaveBeenCalled()
    })
  })
})
