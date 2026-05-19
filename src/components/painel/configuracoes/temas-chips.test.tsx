import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TemasChips } from './temas-chips'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

describe('TemasChips', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('chips iniciais refletem initialThemes', () => {
    render(<TemasChips initialThemes={['educacao', 'saude']} />)
    expect(
      screen
        .getByRole('button', { name: 'Educação' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Saúde' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Economia' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('Salvar desabilitado se nada mudou', () => {
    render(<TemasChips initialThemes={['educacao']} />)
    expect(
      screen
        .getByRole('button', { name: 'Salvar temas' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('toggle de chip habilita Salvar', async () => {
    render(<TemasChips initialThemes={['educacao']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Saúde' }))
    expect(
      screen
        .getByRole('button', { name: 'Salvar temas' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })

  it('Salvar envia POST com array final', async () => {
    render(<TemasChips initialThemes={['educacao']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Saúde' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar temas' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/profile/themes',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody.themes).toContain('educacao')
    expect(callBody.themes).toContain('saude')
  })

  it('descarta themes inválidos do initialThemes', () => {
    // Algum theme antigo que não existe mais em TEMA_IDS — não deve quebrar
    render(
      <TemasChips initialThemes={['educacao', 'theme_legado_inexistente']} />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Educação' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // O outro temas devem estar todos unselected
    expect(
      screen
        .getByRole('button', { name: 'Saúde' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })
})
