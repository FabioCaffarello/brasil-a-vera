import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function TabsFixture({ defaultValue = 'votos' }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="votos">Votos</TabsTrigger>
        <TabsTrigger value="proposicoes">Proposições</TabsTrigger>
        <TabsTrigger value="gastos">Gastos</TabsTrigger>
      </TabsList>
      <TabsContent value="votos">Lista de votações nominais</TabsContent>
      <TabsContent value="proposicoes">Lista de proposições</TabsContent>
      <TabsContent value="gastos">Resumo de gastos CEAP</TabsContent>
    </Tabs>
  )
}

describe('Tabs primitive', () => {
  it('renderiza TabsList com role="tablist" e tokens adaptados', () => {
    render(<TabsFixture />)
    const list = screen.getByRole('tablist')
    expect(list.className).toContain('bg-surface-elevated')
    expect(list.className).toContain('text-foreground-muted')
  })

  it('renderiza 3 tabs com role="tab" e aria-selected correto', () => {
    render(<TabsFixture />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true') // Votos default
    expect(tabs[1].getAttribute('aria-selected')).toBe('false')
    expect(tabs[2].getAttribute('aria-selected')).toBe('false')
  })

  it('só renderiza o TabsContent ativo (Radix oculta os outros)', () => {
    render(<TabsFixture />)
    expect(screen.getByText('Lista de votações nominais')).toBeDefined()
    expect(screen.queryByText('Lista de proposições')).toBeNull()
    expect(screen.queryByText('Resumo de gastos CEAP')).toBeNull()
  })

  it('clicar em outro tab muda o conteúdo ativo', async () => {
    const user = userEvent.setup()
    render(<TabsFixture />)
    await user.click(screen.getByText('Proposições'))
    expect(screen.queryByText('Lista de votações nominais')).toBeNull()
    expect(screen.getByText('Lista de proposições')).toBeDefined()
  })

  it('TabsTrigger ativo aplica bg-background + text-foreground via data-state', () => {
    render(<TabsFixture defaultValue="gastos" />)
    const tabs = screen.getAllByRole('tab')
    // Tab "Gastos" deve estar ativo
    const ativo = tabs[2]
    expect(ativo.getAttribute('data-state')).toBe('active')
    // As classes responsivas a data-state estão presentes na string
    expect(ativo.className).toContain('data-[state=active]:bg-background')
    expect(ativo.className).toContain('data-[state=active]:text-foreground')
  })

  it('TabsTrigger tem focus ring via --ring (WCAG 2.4.7)', () => {
    render(<TabsFixture />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].className).toContain('focus-visible:ring-ring')
    expect(tabs[0].className).toContain('ring-offset-background')
  })

  it('TabsContent tem role="tabpanel" com aria-labelledby vinculado', () => {
    render(<TabsFixture />)
    const panel = screen.getByRole('tabpanel')
    expect(panel.textContent).toBe('Lista de votações nominais')
    expect(panel.getAttribute('aria-labelledby')).not.toBeNull()
  })

  it('keyboard navigation: ArrowRight move para próximo tab (Radix)', async () => {
    const user = userEvent.setup()
    render(<TabsFixture />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()
  })
})
