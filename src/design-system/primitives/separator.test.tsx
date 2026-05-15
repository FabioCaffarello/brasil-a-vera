import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Separator } from './separator'

describe('Separator primitive', () => {
  it('renderiza horizontal por default (h-[1px] w-full + bg-border)', () => {
    render(<Separator data-testid="sep" />)
    const sep = screen.getByTestId('sep')
    expect(sep.className).toContain('h-[1px]')
    expect(sep.className).toContain('w-full')
    expect(sep.className).toContain('bg-border')
    expect(sep.className).toContain('shrink-0')
  })

  it('renderiza vertical com orientation="vertical" (h-full w-[1px])', () => {
    render(<Separator orientation="vertical" data-testid="sep" />)
    const sep = screen.getByTestId('sep')
    expect(sep.className).toContain('h-full')
    expect(sep.className).toContain('w-[1px]')
  })

  it('default decorative=true → role="none" (sem semântica para leitor)', () => {
    render(<Separator data-testid="sep" />)
    const sep = screen.getByTestId('sep')
    expect(sep.getAttribute('role')).toBe('none')
  })

  it('decorative=false → role="separator" (semântica para leitor)', () => {
    render(<Separator decorative={false} data-testid="sep" />)
    const sep = screen.getByTestId('sep')
    expect(sep.getAttribute('role')).toBe('separator')
  })

  it('decorative=false + vertical → aria-orientation="vertical"', () => {
    render(
      <Separator decorative={false} orientation="vertical" data-testid="sep" />,
    )
    // Radix omite aria-orientation pra horizontal (default WCAG), inclui pra vertical
    expect(screen.getByTestId('sep').getAttribute('aria-orientation')).toBe(
      'vertical',
    )
  })

  it('preserva className + encaminha ref', () => {
    let captured: HTMLElement | null = null
    render(
      <Separator
        className="my-4"
        data-testid="sep"
        ref={(el) => {
          captured = el
        }}
      />,
    )
    expect(captured).not.toBeNull()
    expect(screen.getByTestId('sep').className).toContain('my-4')
    expect(screen.getByTestId('sep').className).toContain('bg-border')
  })
})
