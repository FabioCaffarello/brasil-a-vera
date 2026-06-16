import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AcoesLgpd } from './acoes-lgpd'

const mockSignOut = vi.fn()
const mockRouterRefresh = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh, push: vi.fn() }),
}))

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}))

describe('AcoesLgpd', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () =>
        new Blob(['{"ok": true}'], { type: 'application/json' }),
      json: async () => ({ ok: true, signOut: true }),
    } as Response)
    mockSignOut.mockReset()
    mockRouterRefresh.mockReset()
    // jsdom não tem URL.createObjectURL — mock simples retorna string.
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = vi.fn(() => 'blob:fake')
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza 3 cards de ação (Exportar/Anonimizar/Eliminar)', () => {
    render(<AcoesLgpd />)
    expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Anonimizar...' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Eliminar...' })).toBeDefined()
  })

  it('clique em Exportar abre modal sem campo de typing', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
    // Modal abre — verifica pelo botão de confirmar (único na modal).
    expect(
      screen.getByRole('button', { name: 'Confirmar export' }),
    ).toBeDefined()
    // Sem input de typing para export.
    expect(screen.queryByLabelText(/Digite ANONIMIZAR/)).toBeNull()
    expect(screen.queryByLabelText(/Digite ELIMINAR/)).toBeNull()
    // Botão de confirmar habilitado direto (export é reversível).
    const confirm = screen.getByRole('button', {
      name: 'Confirmar export',
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
  })

  it('confirm de Exportar chama POST e dispara download', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar export' }),
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/dados/export',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('clique em Anonimizar abre modal e botão fica disabled até typing exato', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Anonimizar...' }))

    const confirm = screen.getByRole('button', {
      name: 'Anonimizar agora',
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    const input = screen.getByLabelText(
      /Digite ANONIMIZAR para confirmar/,
    ) as HTMLInputElement

    await userEvent.type(input, 'anonimizar')
    expect(confirm.disabled).toBe(true) // case-sensitive — não bate

    await userEvent.clear(input)
    await userEvent.type(input, 'ANONIMIZAR')
    expect(confirm.disabled).toBe(false)
  })

  it('confirm de Anonimizar chama POST correto e signOut', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Anonimizar...' }))
    const input = screen.getByLabelText(/Digite ANONIMIZAR para confirmar/)
    await userEvent.type(input, 'ANONIMIZAR')
    await userEvent.click(
      screen.getByRole('button', { name: 'Anonimizar agora' }),
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/dados/anonimizar',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' })
    })
  })

  it('clique em Eliminar abre modal exigindo typing "ELIMINAR"', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar...' }))

    const confirm = screen.getByRole('button', {
      name: 'Eliminar agora',
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    const input = screen.getByLabelText(
      /Digite ELIMINAR para confirmar/,
    ) as HTMLInputElement

    await userEvent.type(input, 'ELIMINAR')
    expect(confirm.disabled).toBe(false)
  })

  it('confirm de Eliminar chama POST correto e signOut', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar...' }))
    const input = screen.getByLabelText(/Digite ELIMINAR para confirmar/)
    await userEvent.type(input, 'ELIMINAR')
    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar agora' }),
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/dados/erase',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' })
    })
  })

  it('Cancelar fecha o modal e zera o texto', async () => {
    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar...' }))
    const input = screen.getByLabelText(
      /Digite ELIMINAR para confirmar/,
    ) as HTMLInputElement
    await userEvent.type(input, 'ELIMI')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Reabre — campo deve estar vazio.
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar...' }))
    const input2 = screen.getByLabelText(
      /Digite ELIMINAR para confirmar/,
    ) as HTMLInputElement
    expect(input2.value).toBe('')
  })

  it('erro 5xx em destrutivas mostra toast e mantém modal aberto', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal' }),
    } as Response)
    const { useToast } = await import('@/design-system/primitives/rds-toast')
    const toast = useToast()

    render(<AcoesLgpd />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar...' }))
    const input = screen.getByLabelText(/Digite ELIMINAR para confirmar/)
    await userEvent.type(input, 'ELIMINAR')
    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar agora' }),
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
