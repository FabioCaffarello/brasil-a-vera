import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Popover, PopoverContent, PopoverTrigger } from './popover'

describe('Popover primitive', () => {
  it('renders trigger and toggles content on click', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Abrir popover</PopoverTrigger>
        <PopoverContent>Conteúdo do popover</PopoverContent>
      </Popover>,
    )

    expect(screen.getByText('Abrir popover')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo do popover')).not.toBeInTheDocument()

    await user.click(screen.getByText('Abrir popover'))
    expect(screen.getByText('Conteúdo do popover')).toBeVisible()
  })

  it('closes content on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent>Conteúdo</PopoverContent>
      </Popover>,
    )

    expect(screen.getByText('Conteúdo')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument()
  })

  it('accepts custom className on content', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PopoverContent className="custom-class">Conteúdo</PopoverContent>
      </Popover>,
    )

    await user.click(screen.getByText('Abrir'))
    const content = screen.getByText('Conteúdo')
    expect(content.className).toContain('custom-class')
    expect(content.className).toContain('bg-surface-elevated')
  })
})
