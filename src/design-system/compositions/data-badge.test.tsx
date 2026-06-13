import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataBadge } from './data-badge'

describe('DataBadge composition', () => {
  it('renderiza label', () => {
    render(<DataBadge label="L2" />)
    expect(screen.getByText('L2')).toBeDefined()
  })

  it('renderiza source com separador quando fornecido', () => {
    render(<DataBadge label="L2" source="Câmara" />)
    expect(screen.getByText('L2')).toBeDefined()
    expect(screen.getByText('Câmara')).toBeDefined()
    expect(screen.getByText('·')).toBeDefined()
  })

  it('NÃO renderiza separador quando source ausente', () => {
    render(<DataBadge label="L2" />)
    expect(screen.queryByText('·')).toBeNull()
  })

  it('renderiza ícone com aria-hidden', () => {
    const { container } = render(
      <DataBadge label="L2" icon={<span data-testid="db-icon">★</span>} />,
    )
    const hidden = container.querySelector('[aria-hidden="true"]')
    expect(hidden).not.toBeNull()
    expect(screen.getByTestId('db-icon')).toBeDefined()
  })

  it('aplica tone default por default', () => {
    const { container } = render(<DataBadge label="L2" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('border-line-default')
    expect(badge.className).toContain('bg-surface-base')
    expect(badge.className).toContain('text-fg-tertiary')
  })

  // Fase B (ADR-034): tokens RDS. success/warning mantêm bg/border do BaV
  // (neutralizados no globals), só o texto migra p/ fg-*; destructive converge
  // p/ a família error; accent (roxo) fica no token BaV.
  it.each([
    ['success', 'border-success/40', 'bg-success/10', 'text-fg-success'],
    ['warning', 'border-warning/40', 'bg-warning/10', 'text-fg-warning'],
    ['destructive', 'border-error/40', 'bg-error/10', 'text-fg-error'],
    ['accent', 'border-accent/40', 'bg-accent/10', 'text-accent'],
    ['brand', 'border-fg-brand/40', 'bg-fg-brand/10', 'text-fg-brand'],
  ] as const)('aplica tone %s', (tone, ...expectedClasses) => {
    const { container } = render(<DataBadge label="x" tone={tone} />)
    const className = (container.firstChild as HTMLElement).className
    for (const cls of expectedClasses) {
      expect(className).toContain(cls)
    }
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <DataBadge label="x" className="custom-badge" />,
    )
    expect((container.firstChild as HTMLElement).className).toContain(
      'custom-badge',
    )
  })
})
