import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ConfrontoEmendasColegio, EmendasAno } from '@/lib/queries/emendas'
import { Emendas } from './emendas'

function ano(overrides: Partial<EmendasAno> = {}): EmendasAno {
  return {
    ano: 2026,
    emendas: 6,
    centavosEmpenhado: 3027725715,
    centavosPago: 1454568042,
    semMunicipioCentavosEmpenhado: 500000000,
    semMunicipioCentavosPago: 200000000,
    topMunicipios: [
      {
        codigoIbge: '3106200',
        nome: 'BELO HORIZONTE',
        uf: 'MG',
        centavosPago: 100000000,
        centavosEmpenhado: 150000000,
      },
      {
        codigoIbge: '3118601',
        nome: 'CONTAGEM',
        uf: 'MG',
        centavosPago: 0,
        centavosEmpenhado: 80000000,
      },
    ],
    ...overrides,
  }
}

describe('Emendas', () => {
  it('exibe totais do ano mais recente com valores em BRL', () => {
    render(<Emendas anos={[ano()]} />)
    expect(screen.getByText(/6 emendas individuais/)).toBeDefined()
    expect(screen.getByText(/R\$\s*30\.277\.257,15/)).toBeDefined()
    expect(screen.getByText(/R\$\s*14\.545\.680,42/)).toBeDefined()
  })

  it('exibe municípios em title-case com UF e marca fallback empenhado', () => {
    render(<Emendas anos={[ano()]} />)
    expect(screen.getByText('Belo Horizonte')).toBeDefined()
    expect(screen.getByText('Contagem')).toBeDefined()
    // Contagem tem pago = 0 → exibe valor empenhado com sufixo explícito.
    expect(screen.getByText(/· empenhado/)).toBeDefined()
  })

  it('reporta o bucket sem município específico com honestidade', () => {
    render(<Emendas anos={[ano()]} />)
    expect(
      screen.getByText(/sem\s+município específico na fonte/),
    ).toBeDefined()
  })

  it('anos anteriores ficam em <details> colapsável (zero-JS)', () => {
    const { container } = render(
      <Emendas anos={[ano(), ano({ ano: 2025, emendas: 12 })]} />,
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(1)
    expect(screen.getByText(/Orçamento de 2025/)).toBeDefined()
  })

  it('exibe o TrustBadge L2 com a nota de vínculo L3', () => {
    render(<Emendas anos={[ano()]} />)
    expect(
      screen.getByRole('button', { name: /Nível de confiança L2/ }),
    ).toBeDefined()
    expect(screen.getByText(/vínculo autor→parlamentar por nome/)).toBeDefined()
  })

  it('omite a lista de municípios quando o ano só tem destino sem município', () => {
    const { container } = render(
      <Emendas anos={[ano({ topMunicipios: [] })]} />,
    )
    expect(container.querySelectorAll('li')).toHaveLength(0)
    expect(
      screen.getByText(/sem\s+município específico na fonte/),
    ).toBeDefined()
  })

  describe('confronto emendas×colégio (ADR-066 D5)', () => {
    const confronto: ConfrontoEmendasColegio = {
      anoPleito: 2022,
      centavosEmpenhadoComMunicipio: 10000000,
      centavosEmpenhadoNoColegio: 7500000,
      centavosPagoComMunicipio: 6000000,
      centavosPagoNoColegio: 5000000,
      municipiosNoColegio: 3,
      municipiosComDestino: 8,
    }

    it('exibe o percentual e o recorte com copy neutra', () => {
      render(<Emendas anos={[ano()]} confronto={confronto} />)
      expect(screen.getByText('75,0%')).toBeDefined()
      expect(
        screen.getByText(/20\s+maiores do colégio eleitoral de\s+2022/),
      ).toBeDefined()
      expect(screen.getByText(/não acusação/)).toBeDefined()
      expect(
        screen.getByRole('link', { name: /Fórmula na metodologia/ }),
      ).toBeDefined()
    })

    it('sem confronto, o bloco não existe (fail-closed)', () => {
      render(<Emendas anos={[ano()]} confronto={null} />)
      expect(screen.queryByText(/colégio eleitoral de/)).toBeNull()
    })
  })

  describe('export CSV (export = autenticação)', () => {
    it('renderiza o link quando exportHref chega (usuário autenticado)', () => {
      render(
        <Emendas
          anos={[ano()]}
          exportHref="/api/export/emendas?parlamentar=x"
        />,
      )
      expect(screen.getByRole('link', { name: /Exportar CSV/ })).toBeDefined()
    })

    it('sem exportHref (anônimo), o botão não existe no HTML', () => {
      render(<Emendas anos={[ano()]} />)
      expect(screen.queryByRole('link', { name: /Exportar CSV/ })).toBeNull()
    })
  })
})
