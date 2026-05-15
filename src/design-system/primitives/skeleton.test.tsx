import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from './skeleton'

describe('Skeleton primitive', () => {
  it('renderiza div com animate-pulse + token de surface', () => {
    const { container } = render(<Skeleton data-testid="sk" />)
    const el = container.querySelector('[data-testid="sk"]')
    expect(el).not.toBeNull()
    expect(el?.tagName).toBe('DIV')
    expect(el?.className).toContain('animate-pulse')
    expect(el?.className).toContain('bg-surface-elevated')
    expect(el?.className).toContain('rounded-md')
  })

  it('aceita dimensões via className do consumer', () => {
    const { container } = render(
      <Skeleton className="h-4 w-32" data-testid="sk" />,
    )
    const el = container.querySelector('[data-testid="sk"]')
    expect(el?.className).toContain('h-4')
    expect(el?.className).toContain('w-32')
    // sem perder defaults
    expect(el?.className).toContain('animate-pulse')
  })

  it('encaminha props HTML (ex: aria-busy, role="status")', () => {
    const { container } = render(
      <Skeleton aria-busy aria-label="carregando" role="status" />,
    )
    const el = container.querySelector('[role="status"]')
    expect(el?.getAttribute('aria-busy')).toBe('true')
    expect(el?.getAttribute('aria-label')).toBe('carregando')
  })
})
