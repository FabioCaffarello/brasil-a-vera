import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  type ParlamentarPreviewData,
  ParlamentarPreviewDrawer,
  ParlamentarPreviewLink,
  ParlamentarPreviewProvider,
} from './preview-drawer'

const DATA: ParlamentarPreviewData = {
  id: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
  nome: 'Maria Souza',
  casa: 'CAMARA',
  partidoSigla: 'PT',
  uf: 'SP',
  urlFoto: null,
  pctAlinhamento: '73.00',
  votacoesAnalisadas: 120,
  proposicoesCount: 42,
  gastoTotalAno: '123456.78',
  percentilGastoCasa: '88.00',
}

function Harness({ data = DATA }: { data?: ParlamentarPreviewData }) {
  return (
    <ParlamentarPreviewProvider>
      <ParlamentarPreviewLink data={data} href={`/parlamentares/${data.id}`}>
        <span>{data.nome}</span>
      </ParlamentarPreviewLink>
      <ParlamentarPreviewDrawer />
    </ParlamentarPreviewProvider>
  )
}

describe('ParlamentarPreviewLink + Drawer — abrir/fechar', () => {
  it('drawer começa fechado (sem CTA no DOM)', () => {
    render(<Harness />)
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })

  it('clique simples no card abre o drawer (não navega)', async () => {
    render(<Harness />)
    const link = screen.getByRole('link', { name: /Maria Souza/ })
    const evt = fireEvent.click(link)
    // preventDefault foi chamado → navegação cancelada, drawer abre.
    expect(evt).toBe(false)

    const cta = await screen.findByText('Ver perfil completo')
    expect(cta.closest('a')?.getAttribute('href')).toBe(
      '/parlamentares/019e184f-0cdd-7109-ab34-bbfa9f92bd13',
    )
    expect(screen.getByText('73% alinhado')).toBeDefined()
    // KPIs enriquecidos (mesma agregada, sem fetch novo)
    expect(screen.getByText('Proposições')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
    expect(screen.getByText(/123\.456,78/)).toBeDefined()
    expect(screen.getByText(/percentil 88 na Câmara/)).toBeDefined()
  })

  it('cmd/ctrl-clique NÃO sequestra o gesto (deixa navegar/nova aba)', () => {
    render(<Harness />)
    const link = screen.getByRole('link', { name: /Maria Souza/ })
    // metaKey: navegação default preservada (preventDefault não chamado).
    const evt = fireEvent.click(link, { metaKey: true })
    expect(evt).toBe(true)
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })

  it('sem Provider, continua um <a href> normal (rotas tipo /busca)', () => {
    render(
      <ParlamentarPreviewLink data={DATA} href="/parlamentares/x">
        <span>Maria Souza</span>
      </ParlamentarPreviewLink>,
    )
    // Fora do Provider o onClick é no-op; o link permanece navegável (href
    // preservado) — zero-JS/SEO intactos onde não há preview.
    const link = screen.getByRole('link', { name: /Maria Souza/ })
    expect(link.getAttribute('href')).toBe('/parlamentares/x')
    expect(screen.queryByText('Ver perfil completo')).toBeNull()
  })
})
