import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

function DialogFixture({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger>Abrir</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancelar</DialogClose>
          <button type="button">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog primitive', () => {
  it('renderiza Trigger sem abrir o conteúdo (fechado por padrão)', () => {
    render(<DialogFixture />)
    expect(screen.getByText('Abrir')).toBeDefined()
    expect(screen.queryByText('Confirmar exclusão')).toBeNull()
  })

  it('abre o dialog ao clicar no Trigger', async () => {
    const user = userEvent.setup()
    render(<DialogFixture />)
    await user.click(screen.getByText('Abrir'))
    expect(screen.getByText('Confirmar exclusão')).toBeDefined()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeDefined()
  })

  it('fecha com Esc (Radix garante)', async () => {
    const user = userEvent.setup()
    render(<DialogFixture defaultOpen />)
    expect(screen.getByText('Confirmar exclusão')).toBeDefined()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Confirmar exclusão')).toBeNull()
  })

  it('fecha ao clicar em DialogClose', async () => {
    const user = userEvent.setup()
    render(<DialogFixture defaultOpen />)
    await user.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('Confirmar exclusão')).toBeNull()
  })

  it('aria-labelledby vincula DialogTitle (a11y, Radix)', () => {
    render(<DialogFixture defaultOpen />)
    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).not.toBeNull()
    const title = document.getElementById(labelledBy ?? '')
    expect(title?.textContent).toBe('Confirmar exclusão')
  })

  it('aria-describedby vincula DialogDescription (a11y, Radix)', () => {
    render(<DialogFixture defaultOpen />)
    const dialog = screen.getByRole('dialog')
    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    const desc = document.getElementById(describedBy ?? '')
    expect(desc?.textContent).toBe('Esta ação não pode ser desfeita.')
  })

  it('DialogContent aplica tokens do design system', () => {
    render(<DialogFixture defaultOpen />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('bg-background')
    expect(dialog.className).toContain('border-border')
    expect(dialog.className).toContain('shadow-lg')
  })

  it('botão X (close interno do Content) tem aria-label e ring-ring', () => {
    render(<DialogFixture defaultOpen />)
    const closeBtn = screen.getByText('Fechar') // .sr-only span
    expect(closeBtn.className).toContain('sr-only')
    // O botão pai tem a classe de focus ring
    const button = closeBtn.parentElement as HTMLElement
    expect(button.className).toContain('focus:ring-ring')
    expect(button.className).toContain('ring-offset-background')
  })

  it('DialogDescription usa text-foreground-muted', () => {
    render(<DialogFixture defaultOpen />)
    const desc = screen.getByText('Esta ação não pode ser desfeita.')
    expect(desc.className).toContain('text-foreground-muted')
  })
})
