import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Toaster } from './sonner'

describe('Toaster primitive', () => {
  it('renderiza sem crashar', () => {
    expect(() => render(<Toaster />)).not.toThrow()
  })

  it('renderiza <section> com atributos ARIA esperados (a11y)', () => {
    const { container } = render(<Toaster />)
    const section = container.querySelector('section')
    expect(section).not.toBeNull()
    // Sonner rotula como "Notifications" para leitores de tela
    expect(section?.getAttribute('aria-label')).toContain('Notifications')
    // Anúncio polite (não interrompe leitor)
    expect(section?.getAttribute('aria-live')).toBe('polite')
    // Apenas novos toasts são anunciados, não snapshot inteiro
    expect(section?.getAttribute('aria-relevant')).toBe('additions text')
    expect(section?.getAttribute('aria-atomic')).toBe('false')
    // Mantém foco navegável via Tab (tabindex=-1 = só por programa)
    expect(section?.getAttribute('tabindex')).toBe('-1')
  })

  it('aceita props customizadas via spread (position, duration)', () => {
    // Smoke test: Toaster aceita props sem crash. Verificação visual do
    // posicionamento é feita em /dev/design (PR 7) — jsdom não posiciona.
    expect(() =>
      render(<Toaster position="bottom-right" duration={3000} />),
    ).not.toThrow()
  })
})
