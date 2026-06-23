import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VotoIndividual } from '@/lib/queries/votacoes'

const mockGet = vi.fn<(key: string) => string | null>(() => null)

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

// Import after mock so o componente enxerga o useSearchParams mockado.
import { VotosDrawer } from './votos-drawer'

const VOTOS: VotoIndividual[] = [
  {
    id: 'v1',
    voto: 'SIM',
    parlamentarId: 'p1',
    parlamentarNome: 'Maria Souza',
    parlamentarPartidoSigla: 'PT',
    parlamentarUf: 'SP',
  },
  {
    id: 'v2',
    voto: 'SIM',
    parlamentarId: 'p2',
    parlamentarNome: 'João Lima',
    parlamentarPartidoSigla: 'PSD',
    parlamentarUf: 'MG',
  },
  {
    id: 'v3',
    voto: 'NAO',
    parlamentarId: 'p3',
    parlamentarNome: 'Ana Dias',
    parlamentarPartidoSigla: 'NOVO',
    parlamentarUf: 'RS',
  },
]

const EXPORT_HREF = '/api/export/votacoes/abc/votos'

describe('VotosDrawer', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockReturnValue(null)
  })

  it('mostra o CTA com a contagem e mantém a lista fora do DOM enquanto fechado', () => {
    render(
      <VotosDrawer canExport={false} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    expect(
      screen.getByRole('button', { name: /Ver todos os 3 votos/ }),
    ).toBeDefined()
    // Lista pesada não montada até abrir (desafoga o DOM).
    expect(screen.queryByText('Maria Souza')).toBeNull()
    expect(screen.queryByRole('button', { name: 'NÃO' })).toBeNull()
  })

  it('abre pelo CTA e o filtro local muda a contagem', async () => {
    render(
      <VotosDrawer canExport={false} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Ver todos os 3 votos/ }),
    )

    expect(await screen.findByText('Maria Souza')).toBeDefined()
    expect(screen.getByText('3 votos')).toBeDefined()

    // Filtra "NÃO" → 1 de 3; só Ana permanece.
    fireEvent.click(screen.getByRole('button', { name: 'NÃO' }))
    expect(screen.getByText('1 de 3 voto')).toBeDefined()
    expect(screen.getByText('Ana Dias')).toBeDefined()
    expect(screen.queryByText('Maria Souza')).toBeNull()
  })

  it('deep-link ?voto=NAO abre o drawer já filtrado', async () => {
    mockGet.mockImplementation((k) => (k === 'voto' ? 'NAO' : null))
    render(
      <VotosDrawer canExport={false} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    expect(await screen.findByText('Ana Dias')).toBeDefined()
    expect(screen.getByText('1 de 3 voto')).toBeDefined()
    expect(screen.queryByText('Maria Souza')).toBeNull()
  })

  it('seed inválido em ?voto é ignorado (drawer fechado)', () => {
    mockGet.mockImplementation((k) => (k === 'voto' ? 'BANANA' : null))
    render(
      <VotosDrawer canExport={false} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    expect(screen.queryByText('Ana Dias')).toBeNull()
  })

  it('expõe export CSV (sem ?voto) só quando canExport', () => {
    const { rerender } = render(
      <VotosDrawer canExport={false} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Ver todos os 3 votos/ }),
    )
    expect(screen.queryByText('Exportar todos (CSV)')).toBeNull()

    rerender(
      <VotosDrawer canExport={true} exportHref={EXPORT_HREF} votos={VOTOS} />,
    )
    const exportLink = screen.getByText('Exportar todos (CSV)').closest('a')
    expect(exportLink?.getAttribute('href')).toBe(EXPORT_HREF)
    expect(exportLink?.getAttribute('href')).not.toContain('voto=')
  })
})
