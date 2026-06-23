import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DetailLayout, type DetailSection } from './detail-layout'

const SECTIONS: DetailSection[] = [
  { id: 'a', navLabel: 'Alpha', content: <p>conteúdo alpha</p> },
  {
    id: 'b',
    navLabel: 'Beta',
    title: 'Beta Longo',
    subtitle: 'sub beta',
    content: <p>conteúdo beta</p>,
  },
]

describe('DetailLayout — casca de detalhe dirigida por sections (ADR-053)', () => {
  it('gera o SectionNav (âncoras #id) a partir do array', () => {
    render(
      <DetailLayout
        breadcrumb={<nav>bc</nav>}
        header={<h1>H</h1>}
        sections={SECTIONS}
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Alpha' }).getAttribute('href'),
    ).toBe('#a')
    expect(
      screen.getByRole('link', { name: 'Beta' }).getAttribute('href'),
    ).toBe('#b')
  })

  it('renderiza slots (breadcrumb/header/footer) e o conteúdo das seções', () => {
    render(
      <DetailLayout
        breadcrumb={<nav>migalha</nav>}
        footer={<footer>rodapé</footer>}
        header={<h1>cabeçalho</h1>}
        sections={SECTIONS}
      />,
    )
    expect(screen.getByText('migalha')).toBeInTheDocument()
    expect(screen.getByText('cabeçalho')).toBeInTheDocument()
    expect(screen.getByText('rodapé')).toBeInTheDocument()
    // Conteúdo aparece no card desktop E no accordion mobile (fonte única).
    expect(screen.getAllByText('conteúdo alpha').length).toBeGreaterThanOrEqual(
      1,
    )
  })

  it('desktopGridIds: renderiza um grid 2-col no desktop', () => {
    const { container } = render(
      <DetailLayout
        breadcrumb={null}
        desktopGridIds={['a', 'b']}
        header={null}
        sections={SECTIONS}
      />,
    )
    expect(container.querySelector('.md\\:grid-cols-2')).not.toBeNull()
  })

  it('sem desktopGridIds: sem grid (pilha linear)', () => {
    const { container } = render(
      <DetailLayout breadcrumb={null} header={null} sections={SECTIONS} />,
    )
    expect(container.querySelector('.md\\:grid-cols-2')).toBeNull()
  })

  it('título do card/accordion usa `title` quando presente, senão `navLabel`', () => {
    render(<DetailLayout breadcrumb={null} header={null} sections={SECTIONS} />)
    // Seção 'b' tem title "Beta Longo" (card + accordion); o nav usa "Beta".
    expect(screen.getAllByText('Beta Longo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: 'Beta' })).toBeInTheDocument()
  })
})
