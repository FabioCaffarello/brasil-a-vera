import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FollowButton } from './follow-button'

// Mock sonner — não temos toast container montado no test env.
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const PARLAMENTAR_ID = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'

describe('FollowButton', () => {
  describe('quando anônimo', () => {
    it('renderiza link para /sign-in', () => {
      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={true}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      const link = screen.getByRole('link', { name: /acompanhar/i })
      expect(link.getAttribute('href')).toBe('/sign-in')
    })

    it('NÃO chama fetch ao clicar', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')
      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={true}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      const link = screen.getByRole('link', { name: /acompanhar/i })
      await userEvent.click(link)

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('quando autenticado e não acompanhando', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renderiza botão "Acompanhar" com aria-pressed=false', () => {
      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      const button = screen.getByRole('button', { name: /acompanhar/i })
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })

    it('ao clicar, envia POST e troca para "Acompanhando"', async () => {
      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /acompanhar/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/painel/follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId: PARLAMENTAR_ID }),
        })
      })

      const button = screen.getByRole('button', { name: /acompanhando/i })
      expect(button.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('quando autenticado e acompanhando', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renderiza botão "Acompanhando" com aria-pressed=true', () => {
      render(
        <FollowButton
          initialIsFollowing={true}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      const button = screen.getByRole('button', { name: /acompanhando/i })
      expect(button.getAttribute('aria-pressed')).toBe('true')
    })

    it('ao clicar, envia DELETE e troca para "Acompanhar"', async () => {
      render(
        <FollowButton
          initialIsFollowing={true}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: /acompanhando/i }),
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/painel/follows', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId: PARLAMENTAR_ID }),
        })
      })

      const button = screen.getByRole('button', { name: /acompanhar/i })
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('quando fetch falha', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('reverte estado optimistic se servidor retorna erro', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'internal' }),
      } as Response)

      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /acompanhar/i }))

      // Deveria voltar para "Acompanhar" após a falha
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /acompanhar/i })
        expect(button.getAttribute('aria-pressed')).toBe('false')
      })
    })

    it('reverte estado se cap_exceeded', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: 'cap_exceeded', cap: 200 }),
      } as Response)

      render(
        <FollowButton
          initialIsFollowing={false}
          isAnonymous={false}
          parlamentarId={PARLAMENTAR_ID}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /acompanhar/i }))

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /acompanhar/i })
        expect(button.getAttribute('aria-pressed')).toBe('false')
      })
    })
  })
})
