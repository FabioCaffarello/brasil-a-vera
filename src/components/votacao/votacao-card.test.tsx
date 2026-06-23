import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { VotacaoCard } from './votacao-card'

const BASE = {
  id: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
  casa: 'CAMARA',
  dataHora: '2025-03-10T14:00:00Z',
  descricao: 'Votação do requerimento de urgência.',
  orgao: 'PLEN',
  votosSim: 300,
  votosNao: 100,
  abstencoes: 5,
}

describe('VotacaoCard — badge de resultado via DataBadge (ADR-053)', () => {
  it('aprovada: rótulo "Aprovada" + soft-wash success do RDS', () => {
    const { container } = render(
      <VotacaoCard votacao={{ ...BASE, aprovada: true }} />,
    )
    expect(screen.getByText('Aprovada')).toBeInTheDocument()
    expect(container.querySelector('.bg-success-bg')).not.toBeNull()
  })

  it('rejeitada: rótulo "Rejeitada" + soft-wash error do RDS', () => {
    const { container } = render(
      <VotacaoCard votacao={{ ...BASE, aprovada: false }} />,
    )
    expect(screen.getByText('Rejeitada')).toBeInTheDocument()
    expect(container.querySelector('.bg-error-bg')).not.toBeNull()
  })

  it('não reintroduz o ternário de classes legado (bg-error/20 hardcoded)', () => {
    const { container } = render(
      <VotacaoCard votacao={{ ...BASE, aprovada: false }} />,
    )
    expect(container.querySelector('.bg-error\\/20')).toBeNull()
  })
})
