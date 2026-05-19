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
const PARLAMENTAR_NOME = 'Maria Souza'

// Wave 10 Hotfix 10.1 — `isAnonymous` removido do contrato. O gating
// para anônimos é server-side (a página simplesmente não renderiza
// o FollowButton). O ramo "link para /sign-in" foi deletado.

describe('FollowButton', () => {
  describe('quando não acompanhando', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renderiza botão "Acompanhar [Nome]" com aria-pressed=false', () => {
      render(
        <FollowButton
          initialIsFollowing={false}
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      const button = screen.getByRole('button', {
        name: `Acompanhar ${PARLAMENTAR_NOME}`,
      })
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })

    it('ao clicar, envia POST e troca para "Deixar de acompanhar"', async () => {
      render(
        <FollowButton
          initialIsFollowing={false}
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: `Acompanhar ${PARLAMENTAR_NOME}` }),
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/painel/follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId: PARLAMENTAR_ID }),
        })
      })

      const button = screen.getByRole('button', {
        name: `Deixar de acompanhar ${PARLAMENTAR_NOME}`,
      })
      expect(button.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('quando acompanhando', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renderiza botão "Deixar de acompanhar [Nome]" com aria-pressed=true', () => {
      render(
        <FollowButton
          initialIsFollowing={true}
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      const button = screen.getByRole('button', {
        name: `Deixar de acompanhar ${PARLAMENTAR_NOME}`,
      })
      expect(button.getAttribute('aria-pressed')).toBe('true')
    })

    it('ao clicar, envia DELETE e troca para "Acompanhar"', async () => {
      render(
        <FollowButton
          initialIsFollowing={true}
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', {
          name: `Deixar de acompanhar ${PARLAMENTAR_NOME}`,
        }),
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/painel/follows', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId: PARLAMENTAR_ID }),
        })
      })

      const button = screen.getByRole('button', {
        name: `Acompanhar ${PARLAMENTAR_NOME}`,
      })
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
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: `Acompanhar ${PARLAMENTAR_NOME}` }),
      )

      // Deveria voltar para "Acompanhar" após a falha
      await waitFor(() => {
        const button = screen.getByRole('button', {
          name: `Acompanhar ${PARLAMENTAR_NOME}`,
        })
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
          parlamentarId={PARLAMENTAR_ID}
          parlamentarNome={PARLAMENTAR_NOME}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: `Acompanhar ${PARLAMENTAR_NOME}` }),
      )

      await waitFor(() => {
        const button = screen.getByRole('button', {
          name: `Acompanhar ${PARLAMENTAR_NOME}`,
        })
        expect(button.getAttribute('aria-pressed')).toBe('false')
      })
    })
  })
})
