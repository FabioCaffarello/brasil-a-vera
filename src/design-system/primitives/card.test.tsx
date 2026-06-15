import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

describe('Card primitive', () => {
  it('renderiza Card com tokens de surface + border + foreground', () => {
    const { container } = render(<Card data-testid="root">x</Card>)
    const el = container.querySelector('[data-testid="root"]')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('bg-surface-base')
    expect(el?.className).toContain('border-line-default')
    expect(el?.className).toContain('text-fg-primary')
    expect(el?.className).toContain('rounded-lg')
    expect(el?.className).toContain('shadow-sm')
  })

  it('CardTitle renderiza com classe de título', () => {
    render(<CardTitle>Quem representa</CardTitle>)
    const title = screen.getByText('Quem representa')
    expect(title.className).toContain('text-2xl')
    expect(title.className).toContain('font-semibold')
  })

  it('CardDescription usa fg-tertiary (secundário)', () => {
    render(<CardDescription>Eleitor de SP</CardDescription>)
    const desc = screen.getByText('Eleitor de SP')
    expect(desc.className).toContain('text-fg-tertiary')
    expect(desc.className).toContain('text-sm')
  })

  it('CardHeader, CardContent e CardFooter aplicam paddings padronizados', () => {
    const { container } = render(
      <Card>
        <CardHeader data-testid="header">h</CardHeader>
        <CardContent data-testid="content">c</CardContent>
        <CardFooter data-testid="footer">f</CardFooter>
      </Card>,
    )
    expect(
      container.querySelector('[data-testid="header"]')?.className,
    ).toContain('p-6')
    expect(
      container.querySelector('[data-testid="content"]')?.className,
    ).toContain('p-6 pt-0')
    expect(
      container.querySelector('[data-testid="footer"]')?.className,
    ).toContain('p-6 pt-0')
  })

  it('composição completa renderiza estrutura semântica esperada', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Quem representa seu estado?</CardTitle>
          <CardDescription>Encontre seus parlamentares</CardDescription>
        </CardHeader>
        <CardContent>Lista de UFs</CardContent>
        <CardFooter>Ação</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Quem representa seu estado?')).toBeDefined()
    expect(screen.getByText('Encontre seus parlamentares')).toBeDefined()
    expect(screen.getByText('Lista de UFs')).toBeDefined()
    expect(screen.getByText('Ação')).toBeDefined()
  })

  it('preserva className do consumer e encaminha ref', () => {
    let captured: HTMLDivElement | null = null
    render(
      <Card
        className="custom-elevated"
        ref={(el) => {
          captured = el
        }}
      >
        x
      </Card>,
    )
    expect(captured).not.toBeNull()
    expect(captured?.tagName).toBe('DIV')
    expect(captured?.className).toContain('custom-elevated')
    expect(captured?.className).toContain('bg-surface-base')
  })
})
