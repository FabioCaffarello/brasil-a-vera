import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_ALERT_POLICY } from '@/lib/constants/alert-policy'

import { FormPoliticas } from './form-politicas'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: vi.fn() }),
}))

describe('FormPoliticas', () => {
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

  it('renderiza cadence selecionada (default weekly)', () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)
    const semanal = screen.getByRole('radio', {
      name: /Semanal/,
    }) as HTMLInputElement
    expect(semanal.checked).toBe(true)
    const mensal = screen.getByRole('radio', {
      name: /Mensal/,
    }) as HTMLInputElement
    expect(mensal.checked).toBe(false)
  })

  it('Salvar desabilitado se nada mudou', () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)
    expect(
      screen
        .getByRole('button', { name: 'Salvar política' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('habilita Salvar ao trocar cadence', async () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)
    await userEvent.click(screen.getByRole('radio', { name: /Mensal/ }))
    expect(
      screen
        .getByRole('button', { name: 'Salvar política' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })

  it('habilita Salvar ao toggle de topic', async () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)
    // Gastos default é false; clicar liga
    await userEvent.click(screen.getByRole('checkbox', { name: /Gastos/ }))
    expect(
      screen
        .getByRole('button', { name: 'Salvar política' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })

  it('submete POST com policy completa atualizada', async () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)

    // Trocar para biweekly + ligar topicGastos + desligar topicVotacoes
    await userEvent.click(screen.getByRole('radio', { name: /Quinzenal/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Gastos/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Votações/ }))

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar política' }),
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/alertas/policy',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody.cadence).toBe('biweekly')
    expect(callBody.topicGastos).toBe(true)
    expect(callBody.topicVotacoes).toBe(false)
    // Demais defaults preservados
    expect(callBody.boostEleicoes).toBe(true)

    await waitFor(() => {
      expect(routerRefresh).toHaveBeenCalled()
    })
  })

  it('toggle de canal email é independente do inapp', async () => {
    render(<FormPoliticas initial={DEFAULT_ALERT_POLICY} />)

    // Default: ambos true. Desligar email não afeta inapp.
    await userEvent.click(screen.getByRole('checkbox', { name: /E-mail/ }))
    const inapp = screen.getByRole('checkbox', {
      name: /Caixa de entrada no painel/,
    }) as HTMLInputElement
    expect(inapp.checked).toBe(true)
  })
})
