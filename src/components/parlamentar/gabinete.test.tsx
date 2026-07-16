import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { GabineteView } from '@/lib/queries/gabinete'
import { Gabinete } from './gabinete'

function pessoa(
  i: number,
  overrides: Partial<GabineteView['pessoas'][number]> = {},
) {
  return {
    sourceId: `P_${i}`,
    nome: `Servidor ${String(i).padStart(2, '0')}`,
    grupo: 'Secretário Parlamentar',
    cargo: 'SP09C',
    remuneracaoBasicaCentavos: null,
    ...overrides,
  }
}

describe('Gabinete', () => {
  it('Senado: exibe custo básico mensal com competência e R$ por pessoa', () => {
    const gabinete: GabineteView = {
      pessoas: [
        pessoa(1, {
          cargo: 'ASSESSOR TÉCNICO',
          remuneracaoBasicaCentavos: 1192800,
        }),
        pessoa(2, { cargo: null, remuneracaoBasicaCentavos: 78941 }),
      ],
      total: 2,
      custoBasicoMensalCentavos: 1271741,
      mesReferencia: '2026-06-01',
    }
    render(<Gabinete gabinete={gabinete} />)
    expect(screen.getByText(/comissionados no gabinete/)).toBeDefined()
    expect(screen.getByText(/R\$\s*12\.717,41/)).toBeDefined()
    expect(screen.getByText(/competência 06\/2026/)).toBeDefined()
    expect(screen.getByText(/R\$\s*11\.928,00/)).toBeDefined()
    expect(screen.getByText(/não inclui vantagens/)).toBeDefined()
  })

  it('Câmara (fase 1): sem R$, mostra grupo e a nota honesta do recorte', () => {
    const gabinete: GabineteView = {
      pessoas: [pessoa(1)],
      total: 1,
      custoBasicoMensalCentavos: null,
      mesReferencia: null,
    }
    render(<Gabinete gabinete={gabinete} />)
    expect(screen.queryByText(/competência/)).toBeNull()
    expect(screen.getByText('Secretário Parlamentar')).toBeDefined()
    expect(
      screen.getByText(/não a remuneração por nível em formato aberto/),
    ).toBeDefined()
  })

  it('lista longa colapsa o excedente em <details> (zero-JS)', () => {
    const gabinete: GabineteView = {
      pessoas: Array.from({ length: 14 }, (_, i) => pessoa(i + 1)),
      total: 14,
      custoBasicoMensalCentavos: null,
      mesReferencia: null,
    }
    const { container } = render(<Gabinete gabinete={gabinete} />)
    expect(container.querySelectorAll('details')).toHaveLength(1)
    expect(screen.getByText(/\+ 4\s+servidores/)).toBeDefined()
  })

  it('exibe TrustBadge L1 com nota da LAI', () => {
    const gabinete: GabineteView = {
      pessoas: [pessoa(1)],
      total: 1,
      custoBasicoMensalCentavos: null,
      mesReferencia: null,
    }
    render(<Gabinete gabinete={gabinete} />)
    expect(
      screen.getByRole('button', { name: /Nível de confiança L1/ }),
    ).toBeDefined()
    expect(screen.getByText(/públicos por força da LAI/)).toBeDefined()
  })
})
