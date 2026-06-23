import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { EntryCard } from './entry-card'

describe('EntryCard', () => {
  it('renderiza título como h3 e descrição', () => {
    render(
      <EntryCard
        description="Explore deputados e senadores em exercício."
        href="/parlamentares"
        icon={<Users />}
        title="Quem está no Congresso"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Quem está no Congresso' }),
    ).toBeDefined()
    expect(
      screen.getByText('Explore deputados e senadores em exercício.'),
    ).toBeDefined()
  })

  it('o CTA aponta para o href e usa o rótulo default "Explorar"', () => {
    render(
      <EntryCard
        description="desc"
        href="/proposicoes"
        icon={<Users />}
        title="Proposições"
      />,
    )
    const link = screen.getByRole('link', { name: /Proposições/ })
    expect(link.getAttribute('href')).toBe('/proposicoes')
    expect(link.textContent).toContain('Explorar')
  })

  it('aceita rótulo de CTA customizado', () => {
    render(
      <EntryCard
        cta="Buscar pelo CEP"
        description="desc"
        href="/quem-me-representa"
        icon={<Users />}
        title="Quem me representa?"
      />,
    )
    expect(screen.getByRole('link').textContent).toContain('Buscar pelo CEP')
  })

  it('ícone é decorativo (aria-hidden)', () => {
    const { container } = render(
      <EntryCard description="desc" href="/x" icon={<Users />} title="X" />,
    )
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
