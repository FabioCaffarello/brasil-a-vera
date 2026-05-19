import { describe, expect, it } from 'vitest'

import { composeReportMarkdown } from './compose-markdown'
import type {
  DivergenciaItem,
  GastoItem,
  ProposicaoItem,
  VotacaoItem,
} from './types'
import { isAggregateEmpty } from './types'

const META = {
  periodStart: new Date('2026-05-10T21:00:00.000Z'),
  periodEnd: new Date('2026-05-17T21:00:00.000Z'),
  followsCount: 3,
  displayName: 'Fabio',
}

const VOTACAO_BASE: VotacaoItem = {
  votacaoId: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
  descricao: 'PL 4242/2025 — Reforma tributária',
  casa: 'CAMARA',
  dataHora: new Date('2026-05-12T18:00:00.000Z'),
  aprovada: true,
  votosSim: 350,
  votosNao: 120,
  porParlamentar: [
    {
      parlamentarId: 'p1',
      parlamentarNome: 'Maria Souza',
      partidoSigla: 'PT',
      voto: 'SIM',
    },
  ],
}

const DIVERGENCIA_BASE: DivergenciaItem = {
  votacaoId: '019e184f-0cdd-7109-ab34-bbfa9f92bd14',
  votacaoDescricao: 'PL 999/2025 — Marco temporal',
  votacaoDataHora: new Date('2026-05-13T16:00:00.000Z'),
  parlamentarId: 'p2',
  parlamentarNome: 'João Silva',
  partidoSigla: 'PSDB',
  orientacaoBancada: 'SIM',
  votoIndividual: 'NAO',
}

const PROPOSICAO_BASE: ProposicaoItem = {
  proposicaoId: '019e184f-0cdd-7109-ab34-bbfa9f92bd15',
  tipo: 'PL',
  numero: 1234,
  ano: 2026,
  ementa: 'Dispõe sobre incentivos a energias renováveis no Nordeste.',
  autorParlamentarId: 'p1',
  autorNome: 'Maria Souza',
  ultimaTramitacaoData: new Date('2026-05-14T10:00:00.000Z'),
  ultimaTramitacaoDescricao: 'Encaminhado à CCJ',
}

const GASTO_BASE: GastoItem = {
  parlamentarId: 'p3',
  parlamentarNome: 'Carlos Pereira',
  valor: '12345.67',
  categoriaDescricao: 'Combustível',
  fornecedorNome: 'Posto XYZ',
  dataEmissao: new Date('2026-05-15T00:00:00.000Z'),
}

describe('isAggregateEmpty', () => {
  it('vazio quando todas as listas são undefined', () => {
    expect(isAggregateEmpty({})).toBe(true)
  })

  it('vazio quando todas as listas têm length 0', () => {
    expect(
      isAggregateEmpty({
        votacoes: [],
        divergencias: [],
        proposicoes: [],
        gastos: [],
      }),
    ).toBe(true)
  })

  it('não-vazio se votações têm itens', () => {
    expect(
      isAggregateEmpty({
        votacoes: [VOTACAO_BASE],
        divergencias: [],
        proposicoes: [],
        gastos: [],
      }),
    ).toBe(false)
  })

  it('não-vazio se apenas gastos têm itens', () => {
    expect(isAggregateEmpty({ gastos: [GASTO_BASE] })).toBe(false)
  })
})

describe('composeReportMarkdown', () => {
  it('cabeçalho inclui período + greeting + follows count', () => {
    const md = composeReportMarkdown({}, META)
    expect(md).toContain('# Brasil à Vera · Resumo 10/05–17/05')
    expect(md).toContain('Olá, Fabio.')
    expect(md).toContain('Você acompanha 3 parlamentares.')
  })

  it('singular quando 1 follow', () => {
    const md = composeReportMarkdown({}, { ...META, followsCount: 1 })
    expect(md).toContain('Você acompanha 1 parlamentar.')
  })

  it('greeting genérico quando displayName é null', () => {
    const md = composeReportMarkdown({}, { ...META, displayName: null })
    expect(md).toContain('Olá.')
    expect(md).not.toContain('Olá,')
  })

  it('KPI strip mostra contagens e total de gasto', () => {
    const md = composeReportMarkdown(
      {
        votacoes: [VOTACAO_BASE, VOTACAO_BASE],
        divergencias: [DIVERGENCIA_BASE],
        proposicoes: [PROPOSICAO_BASE, PROPOSICAO_BASE, PROPOSICAO_BASE],
        gastos: [GASTO_BASE, { ...GASTO_BASE, valor: '1000.00' }],
      },
      META,
    )
    expect(md).toMatch(/2 votações/)
    expect(md).toMatch(/3 proposições/)
    expect(md).toMatch(/1 divergência\b/)
    // 12345.67 + 1000 = 13345.67 → "R$ 13.345,67"
    expect(md).toMatch(/R\$\s?13\.345,67/)
  })

  it('bloco Votações lista descrição, placar e votos individuais', () => {
    const md = composeReportMarkdown({ votacoes: [VOTACAO_BASE] }, META)
    expect(md).toContain('## Votações')
    expect(md).toContain('PL 4242/2025 — Reforma tributária')
    expect(md).toContain('Placar 350 × 120')
    expect(md).toContain('✓ Aprovada')
    expect(md).toContain('Maria Souza (PT)')
    expect(md).toContain('**Sim**')
  })

  it('bloco Divergências detalha voto individual vs orientação', () => {
    const md = composeReportMarkdown({ divergencias: [DIVERGENCIA_BASE] }, META)
    expect(md).toContain('## Divergências da bancada')
    expect(md).toContain('João Silva')
    expect(md).toContain('votou **Não**')
    expect(md).toContain('contra a orientação **Sim**')
    expect(md).toContain('PL 999/2025')
  })

  it('bloco Proposições inclui ementa + tramitação', () => {
    const md = composeReportMarkdown({ proposicoes: [PROPOSICAO_BASE] }, META)
    expect(md).toContain('## Proposições')
    expect(md).toContain('PL 1234/2026')
    expect(md).toContain('autor: Maria Souza')
    expect(md).toContain('Encaminhado à CCJ')
  })

  it('bloco Gastos formata em BRL', () => {
    const md = composeReportMarkdown({ gastos: [GASTO_BASE] }, META)
    expect(md).toContain('## Gastos')
    expect(md).toContain('Carlos Pereira')
    expect(md).toMatch(/R\$\s?12\.345,67/)
    expect(md).toContain('Combustível')
  })

  it('omite blocos sem itens (sem header vazio)', () => {
    const md = composeReportMarkdown({ votacoes: [VOTACAO_BASE] }, META)
    expect(md).toContain('## Votações')
    expect(md).not.toContain('## Divergências')
    expect(md).not.toContain('## Proposições')
    expect(md).not.toContain('## Gastos')
  })

  it('cap top N com nota dos restantes', () => {
    const manyVotacoes = Array.from({ length: 8 }, (_, i) => ({
      ...VOTACAO_BASE,
      votacaoId: `v${i}`,
      descricao: `Votação ${i}`,
    }))
    const md = composeReportMarkdown({ votacoes: manyVotacoes }, META)
    // 8 votações, cap 5 → mostra 5 + nota "_+ 3 outras_"
    expect(md).toContain('+ 3 outras votações no período')
  })

  it('footer inclui DPO + links principais', () => {
    const md = composeReportMarkdown({}, META)
    expect(md).toContain('Gerenciar alertas')
    expect(md).toContain('lgpd@brasilavera.org')
    expect(md).toContain('Encarregado (DPO)')
  })
})
