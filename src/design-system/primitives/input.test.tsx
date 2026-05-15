import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Input } from './input'

describe('Input primitive', () => {
  it('renderiza <input> nativo (sem use client)', () => {
    render(<Input placeholder="Buscar parlamentar" />)
    const el = screen.getByPlaceholderText('Buscar parlamentar')
    expect(el.tagName).toBe('INPUT')
  })

  it('aplica tokens do design system (border-strong + bg-background)', () => {
    render(<Input data-testid="input" />)
    const el = screen.getByTestId('input')
    expect(el.className).toContain('border-border-strong')
    expect(el.className).toContain('bg-background')
    expect(el.className).toContain('placeholder:text-foreground-subtle')
  })

  it('focus ring usa --ring + ring-offset-background (WCAG 2.4.7)', () => {
    render(<Input data-testid="input" />)
    const el = screen.getByTestId('input')
    expect(el.className).toContain('focus-visible:ring-ring')
    expect(el.className).toContain('focus-visible:ring-2')
    expect(el.className).toContain('focus-visible:ring-offset-2')
    expect(el.className).toContain('ring-offset-background')
  })

  it('digita texto e propaga via onChange', async () => {
    const user = userEvent.setup()
    let value = ''
    render(
      <Input
        data-testid="input"
        onChange={(e) => {
          value = e.currentTarget.value
        }}
      />,
    )
    await user.type(screen.getByTestId('input'), 'Lula')
    expect(value).toBe('Lula')
  })

  it('respeita prop disabled', () => {
    render(<Input disabled data-testid="input" />)
    const el = screen.getByTestId('input') as HTMLInputElement
    expect(el.disabled).toBe(true)
    expect(el.className).toContain('disabled:cursor-not-allowed')
    expect(el.className).toContain('disabled:opacity-50')
  })

  it('encaminha type para o elemento nativo (email, search, number)', () => {
    render(<Input type="email" data-testid="input" />)
    expect((screen.getByTestId('input') as HTMLInputElement).type).toBe('email')
  })

  it('encaminha ref para o input', () => {
    let captured: HTMLInputElement | null = null
    render(
      <Input
        ref={(el) => {
          captured = el
        }}
      />,
    )
    expect(captured).not.toBeNull()
    expect(captured?.tagName).toBe('INPUT')
  })

  it('h-10 garante tap target adequado (WCAG 2.5.5 boa prática)', () => {
    render(<Input data-testid="input" />)
    expect(screen.getByTestId('input').className).toContain('h-10')
  })
})
