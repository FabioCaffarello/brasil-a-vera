import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Combobox, type ComboboxOption } from './combobox'

const OPTIONS: ComboboxOption[] = [
  { value: 'PT', label: 'Partido dos Trabalhadores' },
  { value: 'PL', label: 'Partido Liberal' },
  { value: 'PSDB', label: 'PSDB' },
]

describe('Combobox composition', () => {
  it('renderiza placeholder quando sem valor selecionado', () => {
    render(<Combobox options={OPTIONS} placeholder="Escolha um partido" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Escolha um partido')
  })

  it('mostra o label do option selecionado via defaultValue', () => {
    render(<Combobox defaultValue="PT" options={OPTIONS} />)
    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Partido dos Trabalhadores',
    )
  })

  it('renderiza hidden input com name quando provido', () => {
    const { container } = render(
      <Combobox defaultValue="PT" name="partido" options={OPTIONS} />,
    )
    const hidden = container.querySelector('input[type="hidden"]')
    expect(hidden).not.toBeNull()
    expect(hidden?.getAttribute('name')).toBe('partido')
    expect(hidden?.getAttribute('value')).toBe('PT')
  })

  it('NÃO renderiza hidden input quando name é omitido', () => {
    const { container } = render(<Combobox options={OPTIONS} />)
    expect(container.querySelector('input[type="hidden"]')).toBeNull()
  })

  it('abre popover e seleciona um option (teclado)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Combobox name="partido" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Item "Todos" + 3 options aparecem
    expect(screen.getByText('Partido dos Trabalhadores')).toBeDefined()

    // Clica em PSDB
    await user.click(screen.getByText('PSDB'))

    // Hidden input atualizado
    const hidden = container.querySelector('input[type="hidden"]')
    expect(hidden?.getAttribute('value')).toBe('PSDB')
    // Trigger reflete a seleção
    expect(trigger).toHaveTextContent('PSDB')
  })
})
