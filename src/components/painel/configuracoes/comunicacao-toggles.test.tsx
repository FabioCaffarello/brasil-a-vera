import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ComunicacaoToggles } from './comunicacao-toggles'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

describe('ComunicacaoToggles', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checkboxes refletem o estado inicial', () => {
    render(
      <ComunicacaoToggles
        initialMarketingOptedIn={true}
        initialSurveyOptedIn={false}
      />,
    )
    const marketing = screen.getByLabelText(
      /Comunicações esporádicas/,
    ) as HTMLInputElement
    const survey = screen.getByLabelText(
      /Convite para survey/,
    ) as HTMLInputElement
    expect(marketing.checked).toBe(true)
    expect(survey.checked).toBe(false)
  })

  it('Salvar desabilitado se nada mudou', () => {
    render(
      <ComunicacaoToggles
        initialMarketingOptedIn={false}
        initialSurveyOptedIn={false}
      />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Salvar preferências' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('toggle habilita Salvar e envia POST', async () => {
    render(
      <ComunicacaoToggles
        initialMarketingOptedIn={false}
        initialSurveyOptedIn={false}
      />,
    )

    await userEvent.click(screen.getByLabelText(/Comunicações esporádicas/))
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar preferências' }),
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/painel/profile/comunicacao',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    )
    expect(callBody).toEqual({ marketingOptedIn: true, surveyOptedIn: false })
  })
})
