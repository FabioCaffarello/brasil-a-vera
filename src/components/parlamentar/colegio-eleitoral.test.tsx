import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ColegioEleitoralPleito } from '@/lib/queries/colegio-eleitoral'
import { ColegioEleitoral } from './colegio-eleitoral'

const PLEITO_2022: ColegioEleitoralPleito = {
  anoEleicao: 2022,
  dsCargo: 'DEPUTADO FEDERAL',
  totalVotos: 100_000,
  municipios: [
    { codigo: '41238', nome: 'BELO HORIZONTE', uf: 'MG', votos: 40_000 },
    { codigo: '41785', nome: 'APARECIDA DE GOIÂNIA', uf: 'GO', votos: 20_000 },
    { codigo: '40126', nome: 'ÁGUA BOA', uf: 'MG', votos: 10_000 },
  ],
}

const PLEITO_2018: ColegioEleitoralPleito = {
  anoEleicao: 2018,
  dsCargo: 'DEPUTADO FEDERAL',
  totalVotos: 50_000,
  municipios: [
    { codigo: '41238', nome: 'BELO HORIZONTE', uf: 'MG', votos: 25_000 },
  ],
}

describe('ColegioEleitoral', () => {
  it('exibe concentração do top-N sobre o total oficial do pleito', () => {
    render(<ColegioEleitoral pleitos={[PLEITO_2022]} />)
    // (40k + 20k + 10k) / 100k = 70,0%
    expect(screen.getByText('70,0%')).toBeDefined()
    expect(screen.getByText(/dos 100\.000 votos nominais/)).toBeDefined()
    expect(screen.getByText(/deputado federal em 2022/)).toBeDefined()
  })

  it('title-case unicode-aware com conectivos minúsculos', () => {
    render(<ColegioEleitoral pleitos={[PLEITO_2022]} />)
    expect(screen.getByText('Belo Horizonte')).toBeDefined()
    expect(screen.getByText('Aparecida de Goiânia')).toBeDefined()
    expect(screen.getByText('Água Boa')).toBeDefined()
  })

  it('pleitos anteriores ficam em <details> colapsável', () => {
    const { container } = render(
      <ColegioEleitoral pleitos={[PLEITO_2022, PLEITO_2018]} />,
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(1)
    expect(screen.getByText(/Pleito de 2018/)).toBeDefined()
  })

  it('sem total oficial (null) exibe votos absolutos e omite percentuais', () => {
    render(
      <ColegioEleitoral pleitos={[{ ...PLEITO_2022, totalVotos: null }]} />,
    )
    expect(screen.queryByText(/70,0%/)).toBeNull()
    expect(screen.getByText('40.000')).toBeDefined()
  })
})
