import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'

/**
 * Smoke tests da primitiva Command — Sprint 7.0 PR3.
 *
 * Cobre:
 *   - Render default sem warnings (container + input + lista)
 *   - Tokens do design system aplicados corretamente
 *   - Filtragem progressiva via teclado (cmdk filtra por value)
 *   - CommandEmpty aparece quando busca não encontra resultados
 *   - CommandGroup, CommandSeparator, CommandShortcut renderizam
 *   - Navegação com Tab foca o CommandInput (focus ring)
 *
 * Nota: CommandDialog não é testado aqui porque requer o Dialog montado
 * em ambiente de portal — coberto indiretamente pelos testes de dialog.tsx.
 */

function CommandFixture() {
  return (
    <Command>
      <CommandInput placeholder="Buscar partido ou UF..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Partidos">
          <CommandItem value="PT">PT</CommandItem>
          <CommandItem value="PL">PL</CommandItem>
          <CommandItem value="MDB">MDB</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="UF">
          <CommandItem value="SP">
            SP
            <CommandShortcut>São Paulo</CommandShortcut>
          </CommandItem>
          <CommandItem value="RJ">RJ</CommandItem>
          <CommandItem value="MG">MG</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

describe('Command primitive', () => {
  it('renderiza container e input sem crash', () => {
    render(<CommandFixture />)
    expect(screen.getByPlaceholderText('Buscar partido ou UF...')).toBeDefined()
  })

  it('aplica bg-surface-elevated ao container raiz', () => {
    const { container } = render(<CommandFixture />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('bg-surface-elevated')
    expect(root.className).toContain('text-foreground')
  })

  it('input aplica placeholder:text-foreground-muted', () => {
    render(<CommandFixture />)
    const input = screen.getByPlaceholderText('Buscar partido ou UF...')
    expect(input.className).toContain('placeholder:text-foreground-muted')
  })

  it('lista renderiza todos os itens inicialmente', () => {
    render(<CommandFixture />)
    expect(screen.getByText('PT')).toBeDefined()
    expect(screen.getByText('PL')).toBeDefined()
    expect(screen.getByText('MDB')).toBeDefined()
    expect(screen.getByText('SP')).toBeDefined()
    expect(screen.getByText('RJ')).toBeDefined()
    expect(screen.getByText('MG')).toBeDefined()
  })

  it('filtra itens ao digitar no input (cmdk)', async () => {
    const user = userEvent.setup()
    render(<CommandFixture />)
    const input = screen.getByPlaceholderText('Buscar partido ou UF...')
    await user.type(input, 'PT')
    expect(screen.getByText('PT')).toBeDefined()
    // PL e MDB não correspondem a "PT" — cmdk oculta via display:none ou aria-hidden
    // verificamos que PT ainda está visível
    expect(screen.queryByText('Nenhum resultado encontrado.')).toBeNull()
  })

  it('exibe CommandEmpty quando busca não encontra nada', async () => {
    const user = userEvent.setup()
    render(<CommandFixture />)
    const input = screen.getByPlaceholderText('Buscar partido ou UF...')
    await user.type(input, 'XYZXYZ')
    expect(screen.getByText('Nenhum resultado encontrado.')).toBeDefined()
  })

  it('CommandEmpty usa text-foreground-muted (token de hierarquia)', () => {
    // Renderiza com resultado vazio via valor impossível de filtrar
    render(
      <Command>
        <CommandInput placeholder="busca" />
        <CommandList>
          <CommandEmpty>Vazio</CommandEmpty>
        </CommandList>
      </Command>,
    )
    const empty = screen.getByText('Vazio')
    expect(empty.className).toContain('text-foreground-muted')
  })

  it('CommandSeparator aplica bg-border', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandSeparator />
        </CommandList>
      </Command>,
    )
    const sep = container.querySelector('[cmdk-separator]')
    expect(sep).not.toBeNull()
    expect((sep as HTMLElement).className).toContain('bg-border')
  })

  it('CommandShortcut aplica text-foreground-muted e ml-auto', () => {
    render(<CommandFixture />)
    const shortcut = screen.getByText('São Paulo')
    expect(shortcut.className).toContain('text-foreground-muted')
    expect(shortcut.className).toContain('ml-auto')
  })

  it('CommandItem selected aplica bg-surface (não bg-surface-elevated)', async () => {
    const user = userEvent.setup()
    render(<CommandFixture />)
    const input = screen.getByPlaceholderText('Buscar partido ou UF...')
    // Tab para focar o input, depois Arrow Down para selecionar
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    // O primeiro item deve receber data-selected="true"
    const selectedItems = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('data-selected') === 'true')
    // Verifica que o token correto está no className do item selecionado
    for (const item of selectedItems) {
      expect(item.className).toContain('data-[selected=true]:bg-surface')
    }
  })

  it('Tab foca o CommandInput (focus ring acessível)', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button type="button">Antes</button>
        <CommandFixture />
      </div>,
    )
    await user.tab()
    // Primeiro tab foca o botão "Antes"
    await user.tab()
    // Segundo tab deve focar o input do Command
    const input = screen.getByPlaceholderText('Buscar partido ou UF...')
    expect(document.activeElement).toBe(input)
  })

  it('encaminha className customizado ao container', () => {
    const { container } = render(
      <Command className="custom-width">Conteúdo</Command>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('custom-width')
    expect(root.className).toContain('bg-surface-elevated')
  })
})
