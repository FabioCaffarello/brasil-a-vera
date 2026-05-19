import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OnboardingWizard } from './onboarding-wizard'

// Mocks: sonner (toast) e next/navigation (router.push/refresh).
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const routerPush = vi.fn()
const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}))

describe('OnboardingWizard', () => {
  beforeEach(() => {
    routerPush.mockClear()
    routerRefresh.mockClear()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, redirectTo: '/parlamentares?uf=SP' }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza passo 1 inicialmente', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Passo 1/3')).toBeDefined()
    expect(screen.getByText('De onde você acompanha a política?')).toBeDefined()
    expect(screen.getByText(/Personalize as recomendações/)).toBeDefined()
  })

  it('avança para passo 2 ao clicar em Próximo', async () => {
    render(<OnboardingWizard />)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))

    expect(screen.getByText('Passo 2/3')).toBeDefined()
    expect(screen.getByText('Quais temas mais te importam?')).toBeDefined()
  })

  it('volta ao passo anterior com Voltar', async () => {
    render(<OnboardingWizard />)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    expect(screen.getByText('Passo 2/3')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByText('Passo 1/3')).toBeDefined()
  })

  it('toggle de tema no passo 2 reflete aria-pressed', async () => {
    render(<OnboardingWizard />)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' })) // 1→2

    const educacao = screen.getByRole('button', { name: 'Educação' })
    expect(educacao.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(educacao)
    expect(educacao.getAttribute('aria-pressed')).toBe('true')

    await userEvent.click(educacao)
    expect(educacao.getAttribute('aria-pressed')).toBe('false')
  })

  it('Concluir no passo 3 desabilitado até pelo menos 1 topic', async () => {
    render(<OnboardingWizard />)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' })) // 1→2
    await userEvent.click(screen.getByRole('button', { name: 'Próximo' })) // 2→3

    const concluir = screen.getByRole('button', { name: 'Concluir' })
    // Sem escolha ainda — desabilitado.
    expect(concluir.hasAttribute('disabled')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Votações/ }))
    expect(concluir.hasAttribute('disabled')).toBe(false)
  })

  it('Concluir envia POST com escolhas completas e redireciona', async () => {
    render(<OnboardingWizard />)

    // Passo 1: seleciona SP
    const select = screen.getByLabelText(/De onde você acompanha/)
    await userEvent.selectOptions(select, 'SP')

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))

    // Passo 2: marca Educação
    await userEvent.click(screen.getByRole('button', { name: 'Educação' }))
    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))

    // Passo 3: marca Votações + Concluir
    await userEvent.click(screen.getByRole('button', { name: /Votações/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/onboarding',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody.uf).toBe('SP')
    expect(callBody.themes).toEqual(['educacao'])
    expect(callBody.topics).toMatchObject({ topicVotacoes: true })

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/parlamentares?uf=SP')
    })
  })

  it('"Pular tudo" no passo 3 envia POST com topics=null', async () => {
    render(<OnboardingWizard />)

    await userEvent.click(screen.getByRole('button', { name: 'Próximo' })) // 1→2
    await userEvent.click(screen.getByRole('button', { name: 'Próximo' })) // 2→3
    await userEvent.click(screen.getByRole('button', { name: 'Pular tudo' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody.topics).toBeNull()
    expect(callBody.uf).toBeNull()
    expect(callBody.themes).toEqual([])
  })
})
