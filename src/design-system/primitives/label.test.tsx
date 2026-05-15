import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Label } from './label'

describe('Label primitive', () => {
  it('renderiza com tipografia compacta (text-sm font-medium)', () => {
    render(<Label data-testid="lbl">Buscar</Label>)
    const lbl = screen.getByTestId('lbl')
    expect(lbl.className).toContain('text-sm')
    expect(lbl.className).toContain('font-medium')
    expect(lbl.className).toContain('leading-none')
  })

  it('aplica peer-disabled:* (visual quando input peer está disabled)', () => {
    render(<Label data-testid="lbl">x</Label>)
    expect(screen.getByTestId('lbl').className).toContain(
      'peer-disabled:cursor-not-allowed',
    )
    expect(screen.getByTestId('lbl').className).toContain(
      'peer-disabled:opacity-70',
    )
  })

  it('htmlFor vincula a um input → click no Label foca o input', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Label htmlFor="busca">Termo de busca</Label>
        <input id="busca" type="search" />
      </div>,
    )
    const lbl = screen.getByText('Termo de busca')
    const input = screen.getByRole('searchbox')
    expect(input).not.toHaveFocus()
    await user.click(lbl)
    expect(input).toHaveFocus()
  })

  it('preserva className do consumer + encaminha ref', () => {
    let captured: HTMLLabelElement | null = null
    render(
      <Label
        className="text-foreground-muted"
        data-testid="lbl"
        ref={(el) => {
          captured = el
        }}
      >
        x
      </Label>,
    )
    expect(captured).not.toBeNull()
    expect(screen.getByTestId('lbl').className).toContain(
      'text-foreground-muted',
    )
    expect(screen.getByTestId('lbl').className).toContain('text-sm')
  })
})
