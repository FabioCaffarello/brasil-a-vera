import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge, badgeVariants } from './badge'

describe('Badge primitive', () => {
  it('renderiza com variante default (brand)', () => {
    render(<Badge>Novo</Badge>)
    const el = screen.getByText('Novo')
    expect(el.className).toContain('bg-brand')
    expect(el.className).toContain('text-brand-foreground')
  })

  it.each([
    ['default', ['bg-brand', 'text-brand-foreground']],
    ['secondary', ['bg-surface-elevated', 'text-foreground']],
    ['destructive', ['bg-destructive', 'text-destructive-foreground']],
    ['outline', ['text-foreground']],
  ] as const)('aplica classes da variante %s', (variant, expectedClasses) => {
    render(<Badge variant={variant}>x</Badge>)
    const el = screen.getByText('x')
    for (const cls of expectedClasses) {
      expect(el.className).toContain(cls)
    }
  })

  it('usa rounded-full + tipografia compacta (text-xs font-semibold)', () => {
    render(<Badge>x</Badge>)
    const el = screen.getByText('x')
    expect(el.className).toContain('rounded-full')
    expect(el.className).toContain('text-xs')
    expect(el.className).toContain('font-semibold')
  })

  it('focus ring usa --ring (WCAG 2.4.7)', () => {
    render(<Badge>x</Badge>)
    const el = screen.getByText('x')
    expect(el.className).toContain('focus:ring-ring')
    expect(el.className).toContain('focus:ring-2')
  })

  it('preserva className do consumer', () => {
    render(<Badge className="ml-2">x</Badge>)
    const el = screen.getByText('x')
    expect(el.className).toContain('ml-2')
    expect(el.className).toContain('bg-brand')
  })

  it('encaminha props HTML (ex: aria-label, role)', () => {
    render(
      <Badge aria-label="status novo" role="status">
        x
      </Badge>,
    )
    const el = screen.getByLabelText('status novo')
    expect(el.getAttribute('role')).toBe('status')
  })

  it('badgeVariants export retorna string de classes', () => {
    const classes = badgeVariants({ variant: 'outline' })
    expect(classes).toContain('text-foreground')
    expect(classes).toContain('rounded-full')
  })
})
