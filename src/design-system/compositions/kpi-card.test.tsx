import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { KpiCard, type KpiCardItem } from './kpi-card'

const baseItems: KpiCardItem[] = [
  { label: 'Deputados', value: '513' },
  { label: 'Proposições', value: '+250k' },
  { label: 'Votações', value: '+30k' },
  { label: 'Frequência', value: 'Diária' },
]

describe('KpiCard composition', () => {
  it('renderiza vazio quando items=[]', () => {
    const { container } = render(<KpiCard items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza N items passados via prop (label + value)', () => {
    render(<KpiCard items={baseItems} />)
    expect(screen.getByText('513')).toBeDefined()
    expect(screen.getByText('Deputados')).toBeDefined()
    expect(screen.getByText('+250k')).toBeDefined()
    expect(screen.getByText('Diária')).toBeDefined()
  })

  it('usa role="list" e role="listitem" para acessibilidade', () => {
    render(<KpiCard items={baseItems} />)
    const list = screen.getByRole('list')
    expect(list).toBeDefined()
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBe(baseItems.length)
  })

  it('aplica aria-label customizado quando fornecido', () => {
    render(<KpiCard aria-label="Métricas do Brasil à Vera" items={baseItems} />)
    const list = screen.getByRole('list', {
      name: 'Métricas do Brasil à Vera',
    })
    expect(list).toBeDefined()
  })

  it('omite aria-label quando ausente', () => {
    const { container } = render(<KpiCard items={baseItems} />)
    const list = container.querySelector('[role="list"]')
    expect(list?.getAttribute('aria-label')).toBeNull()
  })

  it('renderiza hint quando fornecido, omite quando ausente', () => {
    render(
      <KpiCard
        items={[
          { label: 'Deputados', value: '513', hint: 'L1 · Câmara' },
          { label: 'Sem hint', value: '42' },
        ]}
      />,
    )
    expect(screen.getByText('L1 · Câmara')).toBeDefined()
    // segundo item não tem hint — confirma que nenhum nó com texto
    // de hint aparece para ele
    const itemSemHint = screen.getByText('Sem hint').parentElement
    expect(itemSemHint?.querySelectorAll('div').length).toBe(2)
  })

  it('aceita className adicional sem sobrescrever classes internas', () => {
    const { container } = render(
      <KpiCard className="custom-card" items={baseItems} />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('custom-card')
    expect(wrapper.className).toContain('bg-surface-elevated')
    expect(wrapper.className).toContain('rounded-2xl')
  })

  it('usa tokens semânticos (sem hardcode de cor zinc/gray/white)', () => {
    const { container } = render(<KpiCard items={baseItems} />)
    const html = container.innerHTML
    expect(html).not.toMatch(/bg-zinc-\d/)
    expect(html).not.toMatch(/bg-gray-\d/)
    expect(html).not.toMatch(/text-white\b/)
    expect(html).not.toMatch(/text-black\b/)
    expect(html).not.toMatch(/border-gray-\d/)
  })
})
