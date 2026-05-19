import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormPerfil } from './form-perfil'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: vi.fn() }),
}))

describe('FormPerfil', () => {
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

  it('botão Salvar desabilitado quando nada mudou', () => {
    render(
      <FormPerfil
        email="fabio@example.com"
        initialDisplayName="Fabio Caffarello"
        initialUf="SP"
      />,
    )
    const button = screen.getByRole('button', { name: 'Salvar perfil' })
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('habilita Salvar ao mudar o nome', async () => {
    render(
      <FormPerfil
        email="fabio@example.com"
        initialDisplayName="Fabio Caffarello"
        initialUf="SP"
      />,
    )

    const input = screen.getByLabelText('Nome') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'Fabio Caffarello Jr')

    const button = screen.getByRole('button', { name: 'Salvar perfil' })
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('e-mail é read-only', () => {
    render(
      <FormPerfil
        email="fabio@example.com"
        initialDisplayName={null}
        initialUf={null}
      />,
    )
    const email = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(email.readOnly).toBe(true)
    expect(email.value).toBe('fabio@example.com')
  })

  it('submete só dirty fields (PATCH parcial)', async () => {
    render(
      <FormPerfil
        email="fabio@example.com"
        initialDisplayName="Fabio Caffarello"
        initialUf="SP"
      />,
    )

    // Mudar só a UF
    await userEvent.selectOptions(screen.getByLabelText('UF'), 'MG')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody).toEqual({ uf: 'MG' })
    expect('displayName' in callBody).toBe(false)
  })
})
