import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  type VotacaoPreviewData,
  VotacaoPreviewDrawer,
  VotacaoPreviewLink,
  VotacaoPreviewProvider,
} from './preview-drawer'

const DATA: VotacaoPreviewData = {
  id: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
  casa: 'CAMARA',
  dataHora: '2024-03-15T13:00:00Z',
  descricao: 'PL 1234/2024 — Marco legal da transparência',
  orgao: 'Plenário',
  aprovada: true,
  votosSim: 320,
  votosNao: 140,
  abstencoes: 12,
}

function Harness({ data = DATA }: { data?: VotacaoPreviewData }) {
  return (
    <VotacaoPreviewProvider>
      <VotacaoPreviewLink data={data} href={`/votacoes/${data.id}`}>
        <span>{data.descricao}</span>
      </VotacaoPreviewLink>
      <VotacaoPreviewDrawer />
    </VotacaoPreviewProvider>
  )
}

describe('VotacaoPreviewLink + Drawer — abrir/fechar', () => {
  it('drawer começa fechado (sem CTA no DOM)', () => {
    render(<Harness />)
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })

  it('clique simples no card abre o drawer (não navega)', async () => {
    render(<Harness />)
    const link = screen.getByRole('link', {
      name: /Marco legal da transparência/,
    })
    // preventDefault foi chamado → navegação cancelada, drawer abre.
    const evt = fireEvent.click(link)
    expect(evt).toBe(false)

    const cta = await screen.findByText('Ver perfil completo')
    expect(cta.closest('a')?.getAttribute('href')).toBe(
      '/votacoes/019e184f-0cdd-7109-ab34-bbfa9f92bd13',
    )
    // Conteúdo derivado dos campos do card (zero fetch novo): margem + resumo.
    expect(screen.getByText('Margem da decisão')).toBeDefined()
    expect(screen.getByText('+180 votos a favor')).toBeDefined()
    expect(screen.getByText('Resumo dos votos')).toBeDefined()
    expect(screen.getByText('SIM')).toBeDefined()
  })

  it('cmd/ctrl-clique NÃO sequestra o gesto (deixa navegar/nova aba)', () => {
    render(<Harness />)
    const link = screen.getByRole('link', {
      name: /Marco legal da transparência/,
    })
    const evt = fireEvent.click(link, { metaKey: true })
    expect(evt).toBe(true)
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })

  it('sem Provider, continua um <a href> normal (rotas tipo /busca)', () => {
    render(
      <VotacaoPreviewLink data={DATA} href="/votacoes/x">
        <span>Marco legal da transparência</span>
      </VotacaoPreviewLink>,
    )
    const link = screen.getByRole('link', {
      name: /Marco legal da transparência/,
    })
    expect(link.getAttribute('href')).toBe('/votacoes/x')
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })
})
