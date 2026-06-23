import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProposicaoCard } from './proposicao-card'

const BASE = {
  tipo: 'PL',
  numero: 1234,
  ano: 2025,
  ementa: 'Dispõe sobre transparência de dados legislativos.',
}

describe('ProposicaoCard — badge de situação via DataBadge (ADR-053)', () => {
  it('APROVADA: rótulo "Aprovada" + soft-wash success do RDS', () => {
    const { container } = render(
      <ProposicaoCard proposicao={{ ...BASE, situacao: 'APROVADA' }} />,
    )
    expect(screen.getByText('Aprovada')).toBeInTheDocument()
    expect(container.querySelector('.bg-success-bg')).not.toBeNull()
  })

  it('REJEITADA: rótulo "Rejeitada" + soft-wash error do RDS', () => {
    const { container } = render(
      <ProposicaoCard proposicao={{ ...BASE, situacao: 'REJEITADA' }} />,
    )
    expect(screen.getByText('Rejeitada')).toBeInTheDocument()
    expect(container.querySelector('.bg-error-bg')).not.toBeNull()
  })

  it('TRANSFORMADA_EM_NORMA: rótulo curto "Virou norma" (fonte única)', () => {
    render(
      <ProposicaoCard
        proposicao={{ ...BASE, situacao: 'TRANSFORMADA_EM_NORMA' }}
      />,
    )
    expect(screen.getByText('Virou norma')).toBeInTheDocument()
  })

  it('expõe aria-label de listagem (ref + situação) no <article> raiz', () => {
    render(<ProposicaoCard proposicao={{ ...BASE, situacao: 'APROVADA' }} />)
    expect(
      screen.getByRole('article', {
        name: 'Proposição PL 1234/2025 — Aprovada',
      }),
    ).toBeInTheDocument()
  })

  it('não reintroduz o badge-span legado (bg-success/20 hardcoded)', () => {
    const { container } = render(
      <ProposicaoCard proposicao={{ ...BASE, situacao: 'APROVADA' }} />,
    )
    expect(container.querySelector('.bg-success\\/20')).toBeNull()
  })
})
