import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'

/**
 * Fixture com múltiplos itens — replica o uso real em
 * src/app/parlamentares/[id]/page.tsx (Sprint 7.2 PR 4):
 * type="multiple", defaultValue=["votos","alinhamento"].
 */
function AccordionFixture({
  type = 'multiple',
  defaultValue,
}: {
  type?: 'single' | 'multiple'
  defaultValue?: string | string[]
}) {
  return (
    <Accordion type={type} defaultValue={defaultValue as string & string[]}>
      <AccordionItem value="votos">
        <AccordionTrigger>Votos Recentes</AccordionTrigger>
        <AccordionContent>Conteúdo de votos recentes</AccordionContent>
      </AccordionItem>
      <AccordionItem value="alinhamento">
        <AccordionTrigger>Alinhamento Partidário</AccordionTrigger>
        <AccordionContent>Conteúdo de alinhamento</AccordionContent>
      </AccordionItem>
      <AccordionItem value="gastos">
        <AccordionTrigger>Gastos CEAP</AccordionTrigger>
        <AccordionContent>Conteúdo de gastos</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion primitive', () => {
  it('renderiza os 3 triggers com role="button" e aria-expanded correto', () => {
    render(<AccordionFixture type="single" />)
    const triggers = screen.getAllByRole('button')
    expect(triggers).toHaveLength(3)
    // Sem defaultValue: todos colapsados
    for (const trigger of triggers) {
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('type="multiple" com defaultValue abre "votos" e "alinhamento" por default', () => {
    render(<AccordionFixture defaultValue={['votos', 'alinhamento']} />)
    expect(screen.getByText('Conteúdo de votos recentes')).toBeDefined()
    expect(screen.getByText('Conteúdo de alinhamento')).toBeDefined()
    // "gastos" começa colapsado — conteúdo não visível
    expect(screen.queryByText('Conteúdo de gastos')).toBeNull()
  })

  it('AccordionItem aplica border-border nos tokens do projeto', () => {
    render(<AccordionFixture />)
    // AccordionItem renderiza como div[data-state]; sobe dois níveis a partir
    // do Trigger (Trigger → Header → Item)
    const triggers = screen.getAllByRole('button')
    const header = triggers[0].parentElement // AccordionPrimitive.Header
    const item = header?.parentElement // AccordionPrimitive.Item
    expect(item?.className).toContain('border-border')
  })

  it('AccordionTrigger tem focus ring via --ring (WCAG 2.4.7)', () => {
    render(<AccordionFixture />)
    const triggers = screen.getAllByRole('button')
    expect(triggers[0].className).toContain('focus-visible:ring-ring')
    expect(triggers[0].className).toContain(
      'focus-visible:ring-offset-background',
    )
  })

  it('AccordionTrigger usa text-foreground (token próprio, não text-primary)', () => {
    render(<AccordionFixture />)
    const triggers = screen.getAllByRole('button')
    expect(triggers[0].className).toContain('text-foreground')
    expect(triggers[0].className).not.toContain('text-primary')
  })

  it('clicar no trigger colapsa item expandido (type=single collapsible)', async () => {
    const user = userEvent.setup()
    // collapsible={true} é necessário para permitir fechar o item ativo
    // clicando nele de novo em mode single — Radix não permite sem esta prop.
    render(
      <Accordion type="single" collapsible defaultValue="votos">
        <AccordionItem value="votos">
          <AccordionTrigger>Votos Recentes</AccordionTrigger>
          <AccordionContent>Conteúdo de votos recentes</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole('button', { name: /votos recentes/i })
    // "votos" começa aberto: aria-expanded=true
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // Clicar deve colapsar: aria-expanded=false, data-state=closed
    await user.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('data-state')).toBe('closed')
  })

  it('clicar em trigger fechado abre o item correspondente', async () => {
    const user = userEvent.setup()
    render(<AccordionFixture type="single" />)
    // Antes: tudo colapsado
    expect(screen.queryByText('Conteúdo de gastos')).toBeNull()
    await user.click(screen.getByText('Gastos CEAP'))
    expect(screen.getByText('Conteúdo de gastos')).toBeDefined()
  })

  it('type="multiple" permite manter dois itens abertos ao mesmo tempo', async () => {
    const user = userEvent.setup()
    render(<AccordionFixture type="multiple" />)
    await user.click(screen.getByText('Votos Recentes'))
    await user.click(screen.getByText('Alinhamento Partidário'))
    expect(screen.getByText('Conteúdo de votos recentes')).toBeDefined()
    expect(screen.getByText('Conteúdo de alinhamento')).toBeDefined()
  })

  it('AccordionTrigger tem ChevronDown como ícone (SVG presente)', () => {
    render(<AccordionFixture />)
    const triggers = screen.getAllByRole('button')
    const svg = triggers[0].querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('keyboard: Enter/Space ativa trigger focado', async () => {
    const user = userEvent.setup()
    render(<AccordionFixture type="single" />)
    const triggers = screen.getAllByRole('button')
    triggers[0].focus()
    expect(screen.queryByText('Conteúdo de votos recentes')).toBeNull()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Conteúdo de votos recentes')).toBeDefined()
  })
})
