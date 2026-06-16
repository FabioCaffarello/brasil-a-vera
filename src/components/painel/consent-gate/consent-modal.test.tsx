import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsentModal } from './consent-modal'

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

describe('ConsentModal', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
    mockSignOut.mockReset()
    mockRouterRefresh.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza título, descrição, link para política e 2 botões', () => {
    render(<ConsentModal policyVersion="2026-05-19" />)
    expect(
      screen.getByText('Atualizamos nossa Política de Privacidade'),
    ).toBeDefined()
    const link = screen.getByRole('link', {
      name: /Abrir política de privacidade/,
    }) as HTMLAnchorElement
    expect(link.href).toContain('/privacidade')
    expect(link.target).toBe('_blank')
    expect(screen.getByText(/versão 2026-05-19/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeDefined()
  })

  it('clique em "Aceitar" chama POST e refresh', async () => {
    render(<ConsentModal policyVersion="2026-05-19" />)
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/consent/privacy-policy',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('clique em "Sair" chama Clerk signOut com redirect /', async () => {
    render(<ConsentModal policyVersion="2026-05-19" />)
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' })
    })
  })

  it('botões ficam desabilitados durante operação', async () => {
    // Promise pendente — simula fetch lento.
    global.fetch = vi.fn(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    )
    render(<ConsentModal policyVersion="2026-05-19" />)
    const accept = screen.getByRole('button', {
      name: 'Aceitar',
    }) as HTMLButtonElement
    const leave = screen.getByRole('button', {
      name: 'Sair',
    }) as HTMLButtonElement

    await userEvent.click(accept)

    await waitFor(() => {
      expect(accept.disabled).toBe(true)
      expect(leave.disabled).toBe(true)
    })
    expect(screen.getByText('Registrando...')).toBeDefined()
  })

  it('falha no POST mostra toast e reabilita botões', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal' }),
    } as Response)
    const { useToast } = await import('@/design-system/primitives/rds-toast')
    const toast = useToast()

    render(<ConsentModal policyVersion="2026-05-19" />)
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    const accept = screen.getByRole('button', {
      name: 'Aceitar',
    }) as HTMLButtonElement
    expect(accept.disabled).toBe(false)
  })
})
