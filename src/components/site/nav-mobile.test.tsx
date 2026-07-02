import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedPathname = vi.fn<() => string>(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: () => mockedPathname(),
}))

// Import after mock so the module sees the mocked usePathname.
import { NavMobile } from './nav-mobile'

describe('NavMobile', () => {
  beforeEach(() => {
    mockedPathname.mockReset()
    mockedPathname.mockReturnValue('/')
    document.body.style.overflow = ''
  })

  it('renderiza trigger com aria-expanded=false por default', () => {
    render(<NavMobile />)
    const trigger = screen.getByRole('button', { name: /abrir menu/i })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('clicar no trigger alterna aria-expanded para true', () => {
    render(<NavMobile />)
    const trigger = screen.getByRole('button', { name: /abrir menu/i })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-label')).toMatch(/fechar/i)
  })

  it('painel ganha role=dialog e aria-modal quando aberto', () => {
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    const dialog = screen.getByRole('dialog', { name: /menu principal/i })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('Escape fecha o painel', () => {
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    const trigger = screen.getByRole('button', { name: /abrir menu/i })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('aplica overflow:hidden no body enquanto aberto', () => {
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaura overflow ao fechar', () => {
    render(<NavMobile />)
    const trigger = screen.getByRole('button', { name: /abrir menu/i })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('lista todos os 5 links de navegação no painel', () => {
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('link', { name: /^parlamentares$/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Proposições' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Votações' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Temas' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeDefined()
  })

  it('inclui SearchForm dentro do painel', () => {
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    const search = screen.getByRole('searchbox')
    expect(search).toBeDefined()
  })

  it('link active no pathname recebe aria-current=page no painel', () => {
    mockedPathname.mockReturnValue('/proposicoes')
    render(<NavMobile />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    const active = screen.getByRole('link', { name: 'Proposições' })
    expect(active.getAttribute('aria-current')).toBe('page')
  })

  it('com personalLink renderiza Painel como primeiro item da lista (Hotfix 10.3)', () => {
    render(<NavMobile personalLink={{ href: '/painel', label: 'Painel' }} />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    const dialog = screen.getByRole('dialog', { name: /menu principal/i })
    const links = dialog.querySelectorAll('a[href]')
    expect(links).toHaveLength(7)
    expect(links[0].textContent).toBe('Painel')
  })

  it('sem personalLink, lista preserva 5 links públicos (paridade anônima)', () => {
    render(<NavMobile personalLink={null} />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    const dialog = screen.getByRole('dialog', { name: /menu principal/i })
    const links = dialog.querySelectorAll('a[href]')
    expect(links).toHaveLength(6)
    expect(dialog.querySelector('a[href="/painel"]')).toBeNull()
  })
})
