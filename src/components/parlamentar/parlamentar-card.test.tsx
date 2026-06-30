import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ParlamentarCard } from './parlamentar-card'

const BASE = {
  id: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
  nome: 'Maria Souza',
  casa: 'CAMARA',
  partidoSigla: 'PT',
  uf: 'SP',
  urlFoto: null,
}

describe('ParlamentarCard — contrato de fallback (Sprint 7.1 PR4)', () => {
  it('com_amostra: renderiza barra + linha "X% alinhado · N votações"', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          pctAlinhamento: '73.00',
          votacoesAnalisadas: 120,
        }}
      />,
    )
    expect(screen.getByText('73% alinhado')).toBeDefined()
    expect(screen.getByText(/120 votações/)).toBeDefined()
    // Não há texto de "amostra insuficiente" nem de "sem votações"
    expect(screen.queryByText(/Amostra insuficiente/)).toBeNull()
    expect(screen.queryByText(/Sem votações/)).toBeNull()
  })

  it('amostra_insuficiente: 0 < votacoes < 50 → texto subtle, sem barra', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          pctAlinhamento: '100.00',
          votacoesAnalisadas: 3,
        }}
      />,
    )
    expect(
      screen.getByText(/Amostra insuficiente · 3 votações no período/),
    ).toBeDefined()
    expect(screen.queryByText(/% alinhado/)).toBeNull()
  })

  it('amostra_insuficiente: pct null mesmo com votacoes >= 50 cai em insuficiente', () => {
    // Edge: agregado calculou votacoes mas não conseguiu computar pct
    // (cenário raro mas precisa ser honesto — não renderiza barra sem pct).
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          pctAlinhamento: null,
          votacoesAnalisadas: 80,
        }}
      />,
    )
    expect(
      screen.getByText(/Amostra insuficiente · 80 votações no período/),
    ).toBeDefined()
    expect(screen.queryByText(/% alinhado/)).toBeNull()
  })

  it('sem_dado: votacoesAnalisadas = 0 (partido fora de federação) → "Sem votações nominais registradas"', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          partidoSigla: 'PL',
          pctAlinhamento: null,
          votacoesAnalisadas: 0,
        }}
      />,
    )
    expect(screen.getByText('Sem votações nominais registradas')).toBeDefined()
  })

  it('sem_dado quando agregado nunca rodou (undefined) também cai em sem_dado', () => {
    render(<ParlamentarCard parlamentar={{ ...BASE, partidoSigla: 'PL' }} />)
    expect(screen.getByText('Sem votações nominais registradas')).toBeDefined()
  })

  it('casa_senado_legacy: sem_dado em SENADO adiciona title tooltip', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          partidoSigla: 'PL',
          casa: 'SENADO',
          pctAlinhamento: null,
          votacoesAnalisadas: 0,
        }}
      />,
    )
    const text = screen.getByText('Sem votações nominais registradas')
    expect(text.getAttribute('title')).toBe(
      'Senado: cobertura parcial de orientação partidária',
    )
  })

  it('sem_dado em CAMARA NÃO adiciona title tooltip', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          partidoSigla: 'PL',
          casa: 'CAMARA',
          pctAlinhamento: null,
          votacoesAnalisadas: 0,
        }}
      />,
    )
    const text = screen.getByText('Sem votações nominais registradas')
    expect(text.getAttribute('title')).toBeNull()
  })

  it('federacao: partido em federação com votacoesAnalisadas=0 → "partido em federação"', () => {
    render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          partidoSigla: 'PT',
          pctAlinhamento: null,
          votacoesAnalisadas: 0,
        }}
      />,
    )
    expect(
      screen.getByText(/Alinhamento indisponível · partido em federação/),
    ).toBeDefined()
    expect(screen.queryByText('Sem votações nominais registradas')).toBeNull()
  })

  it('pluraliza votações corretamente (1 votação vs N votações)', () => {
    const { rerender } = render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          pctAlinhamento: '50.00',
          votacoesAnalisadas: 1,
        }}
      />,
    )
    expect(screen.getByText(/1 votação no período/)).toBeDefined()

    rerender(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          pctAlinhamento: '100.00',
          votacoesAnalisadas: 100,
        }}
      />,
    )
    expect(screen.getByText(/100 votações/)).toBeDefined()
  })

  it('expõe aria-label de listagem (nome + cargo + partido-UF) no <article>', () => {
    render(<ParlamentarCard parlamentar={BASE} />)
    expect(
      screen.getByRole('article', { name: 'Maria Souza — Deputado PT-SP' }),
    ).toBeInTheDocument()
  })

  it('avatar: foto remota com loading="lazy" (RDS #247); null → iniciais', () => {
    const { container, rerender } = render(
      <ParlamentarCard
        parlamentar={{
          ...BASE,
          urlFoto: 'https://www.camara.leg.br/foto/123.jpg',
        }}
      />,
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('loading')).toBe('lazy')
    expect(img?.getAttribute('src')).toContain('camara.leg.br')

    // Sem foto → fallback de iniciais do Avatar, sem <img>.
    rerender(<ParlamentarCard parlamentar={{ ...BASE, urlFoto: null }} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('MS')).toBeInTheDocument()
  })
})
