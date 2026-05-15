import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, buttonVariants } from './button'

describe('Button primitive', () => {
  it('renderiza com variante default', () => {
    render(<Button>Salvar</Button>)
    const btn = screen.getByRole('button', { name: 'Salvar' })
    expect(btn).toBeDefined()
    expect(btn.className).toContain('bg-brand')
    expect(btn.className).toContain('text-brand-foreground')
  })

  it.each([
    ['default', ['bg-brand', 'text-brand-foreground']],
    ['destructive', ['bg-destructive', 'text-destructive-foreground']],
    ['outline', ['border', 'border-border-strong', 'bg-background']],
    ['secondary', ['bg-surface-elevated', 'text-foreground']],
    ['ghost', ['hover:bg-surface-elevated']],
    ['link', ['text-brand', 'underline-offset-4']],
  ] as const)('aplica classes da variante %s', (variant, expectedClasses) => {
    render(<Button variant={variant}>label</Button>)
    const btn = screen.getByRole('button', { name: 'label' })
    for (const cls of expectedClasses) {
      expect(btn.className).toContain(cls)
    }
  })

  it.each([
    ['default', 'h-10'],
    ['sm', 'h-9'],
    ['lg', 'h-11'],
    ['icon', 'h-10'],
  ] as const)('aplica tamanho %s', (size, expectedClass) => {
    render(<Button size={size}>x</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain(expectedClass)
  })

  it('preserva classes do consumer via prop className', () => {
    render(<Button className="custom-class">x</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('inclui focus ring usando token --ring', () => {
    render(<Button>x</Button>)
    const btn = screen.getByRole('button')
    // WCAG 2.4.7 — focus visível via token --ring (não --color-primary HEX)
    expect(btn.className).toContain('focus-visible:ring-ring')
    expect(btn.className).toContain('focus-visible:ring-2')
    expect(btn.className).toContain('focus-visible:ring-offset-2')
  })

  it('é desabilitado quando disabled', () => {
    render(<Button disabled>x</Button>)
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.className).toContain('disabled:opacity-50')
  })

  it('asChild renderiza Slot ao invés de button (polimórfico)', () => {
    render(
      <Button asChild>
        <a href="/parlamentares">Ver parlamentares</a>
      </Button>,
    )
    // Quando asChild, o elemento raiz é o <a>, não <button>.
    const link = screen.getByRole('link', { name: 'Ver parlamentares' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/parlamentares')
    // E as classes do button ficam aplicadas no <a>.
    expect(link.className).toContain('bg-brand')
  })

  it('encaminha ref para o elemento raiz', () => {
    let captured: HTMLButtonElement | null = null
    render(
      <Button
        ref={(el) => {
          captured = el
        }}
      >
        x
      </Button>,
    )
    expect(captured).not.toBeNull()
    expect(captured?.tagName).toBe('BUTTON')
  })

  it('buttonVariants export pode ser usado externamente (asChild com link cru, etc.)', () => {
    const classes = buttonVariants({ variant: 'outline', size: 'sm' })
    expect(classes).toContain('border-border-strong')
    expect(classes).toContain('h-9')
  })
})
