import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TramitacaoTimeline } from './tramitacao-timeline'

const EVENTOS = [
  {
    id: '1',
    data: '2025-03-10T12:00:00Z',
    orgao: 'CCJ',
    descricaoResumida: 'Recebimento pela Comissão',
    descricaoCompleta: 'Despacho completo do relator.',
    situacaoResultante: 'Aguardando Parecer',
  },
  {
    id: '2',
    data: '2025-03-12T12:00:00Z',
    orgao: 'PLEN',
    descricaoResumida: 'Aprovado em plenário',
    descricaoCompleta: null,
    situacaoResultante: null,
  },
]

describe('TramitacaoTimeline — RDS Timeline (ADR-053)', () => {
  it('renderiza cada evento como item (título + órgão/situação)', () => {
    render(<TramitacaoTimeline eventos={EVENTOS} />)
    expect(screen.getByText('Recebimento pela Comissão')).toBeInTheDocument()
    expect(screen.getByText('Aprovado em plenário')).toBeInTheDocument()
    expect(screen.getByText('CCJ · Aguardando Parecer')).toBeInTheDocument()
    // Sem situação resultante → só o órgão.
    expect(screen.getByText('PLEN')).toBeInTheDocument()
  })

  it('despacho completo apenas quando há descricaoCompleta', () => {
    render(<TramitacaoTimeline eventos={EVENTOS} />)
    expect(screen.getAllByText('Ver despacho completo')).toHaveLength(1)
  })

  it('empty state honesto quando não há eventos', () => {
    render(<TramitacaoTimeline eventos={[]} />)
    expect(
      screen.getByText(/Nenhum evento de tramitação ingerido/),
    ).toBeInTheDocument()
  })
})
