import { describe, expect, it } from 'vitest'
import { ehNaoComissaoPorNome } from '../shared/membro-comissao'
import {
  extractCodigoTipoSenado,
  isComissaoSenado,
  isComissaoSenadoPorSigla,
  mapMembroComissaoSenado,
  mapTipoParticipacaoSenado,
} from './comissoes-mapper'
import {
  type SenadoComissaoParticipacao,
  senadoColegiadoDetalheSchema,
  senadoComissoesEnvelopeSchema,
} from './comissoes-schema'

const participacao: SenadoComissaoParticipacao = {
  IdentificacaoComissao: {
    CodigoComissao: '38',
    SiglaComissao: 'CAE',
    NomeComissao: 'Comissão de Assuntos Econômicos',
    SiglaCasaComissao: 'SF',
  },
  DescricaoParticipacao: 'Titular',
  DataInicio: '2023-02-27',
  DataFim: null,
}

describe('isComissaoSenado (keep-by-default)', () => {
  it('mantém comissão permanente SF (21) e mista CN (41)', () => {
    expect(isComissaoSenado(21)).toBe(true)
    expect(isComissaoSenado(41)).toBe(true)
  })
  it('exclui grupo parlamentar (129) e frente parlamentar (130)', () => {
    expect(isComissaoSenado(129)).toBe(false)
    expect(isComissaoSenado(130)).toBe(false)
  })
  it('mantém um tipo desconhecido (anti-#481)', () => {
    expect(isComissaoSenado(99999)).toBe(true)
  })
})

describe('mapTipoParticipacaoSenado', () => {
  it('Suplente → SUPLENTE; Titular → TITULAR; null → TITULAR', () => {
    expect(mapTipoParticipacaoSenado('Suplente')).toBe('SUPLENTE')
    expect(mapTipoParticipacaoSenado('Titular')).toBe('TITULAR')
    expect(mapTipoParticipacaoSenado(null)).toBe('TITULAR')
  })
})

describe('ehNaoComissaoPorNome (guarda cross-casa)', () => {
  it('exclui conselhos honoríficos, procuradoria, ouvidoria e grupos', () => {
    expect(
      ehNaoComissaoPorNome('Conselho da Ordem do Congresso Nacional'),
    ).toBe(true)
    expect(ehNaoComissaoPorNome('Comenda Zilda Arns')).toBe(true)
    expect(ehNaoComissaoPorNome('Procuradoria Especial da Mulher')).toBe(true)
    expect(ehNaoComissaoPorNome('Ouvidoria do Senado Federal')).toBe(true)
    expect(ehNaoComissaoPorNome('Grupo Brasileiro do Parlatino')).toBe(true)
    expect(ehNaoComissaoPorNome('Grupo de trabalho sobre mineração')).toBe(true)
  })
  it('mantém comissões, subcomissões, comitês e representações', () => {
    expect(ehNaoComissaoPorNome('Comissão de Assuntos Econômicos')).toBe(false)
    expect(ehNaoComissaoPorNome('Subcomissão Permanente de Mineração')).toBe(
      false,
    )
    expect(
      ehNaoComissaoPorNome('Comitê de Avaliação, Fiscalização e Controle'),
    ).toBe(false)
    expect(
      ehNaoComissaoPorNome(
        'Representação Brasileira no Parlamento do Mercosul',
      ),
    ).toBe(false)
    expect(
      ehNaoComissaoPorNome(
        'Comissão Parlamentar Mista de Inquérito - "Fundos de Pensão"',
      ),
    ).toBe(false)
  })
})

describe('mapMembroComissaoSenado exclui ruído por nome', () => {
  it('exclui Comenda mesmo com tipo autoritativo presente', () => {
    const row = mapMembroComissaoSenado(
      {
        ...participacao,
        IdentificacaoComissao: {
          ...participacao.IdentificacaoComissao,
          SiglaComissao: 'CZA',
          NomeComissao: 'Comenda Zilda Arns',
        },
      },
      21,
      'uuid-sen-1',
    )
    expect(row).toBeNull()
  })
  it('exclui Conselho mesmo via fallback (codigoTipo null)', () => {
    const row = mapMembroComissaoSenado(
      {
        ...participacao,
        IdentificacaoComissao: {
          ...participacao.IdentificacaoComissao,
          SiglaComissao: 'COCN',
          NomeComissao: 'Conselho da Ordem do Congresso Nacional',
        },
      },
      null,
      'uuid-sen-1',
    )
    expect(row).toBeNull()
  })
})

describe('isComissaoSenadoPorSigla (fallback p/ colegiado extinto)', () => {
  it('mantém CPIs/CPMIs encerradas (não começam com GP/FP)', () => {
    expect(isComissaoSenadoPorSigla('CPMI - 8 de Janeiro')).toBe(true)
    expect(isComissaoSenadoPorSigla('CPIBETS')).toBe(true)
    expect(isComissaoSenadoPorSigla('CAEM')).toBe(true)
  })
  it('exclui grupos (GP*) e frentes (FP*) extintos', () => {
    expect(isComissaoSenadoPorSigla('GPARGENTINA')).toBe(false)
    expect(isComissaoSenadoPorSigla('FPE')).toBe(false)
  })
})

describe('mapMembroComissaoSenado', () => {
  it('mapeia comissão preservando sigla e descrição crua', () => {
    const row = mapMembroComissaoSenado(participacao, 21, 'uuid-sen-1')
    expect(row).toEqual({
      parlamentarId: 'uuid-sen-1',
      comissaoSourceId: '38',
      comissaoNome: 'Comissão de Assuntos Econômicos',
      comissaoSigla: 'CAE',
      cargoOrigem: 'Titular',
      tipoParticipacao: 'TITULAR',
      dataInicio: '2023-02-27',
      dataFim: null,
    })
  })

  it('retorna null para grupo parlamentar (tipo 129)', () => {
    const row = mapMembroComissaoSenado(
      {
        ...participacao,
        IdentificacaoComissao: {
          ...participacao.IdentificacaoComissao,
          SiglaComissao: 'GPARGENTINA',
        },
      },
      129,
      'uuid-sen-1',
    )
    expect(row).toBeNull()
  })

  it('retorna null quando falta DataInicio', () => {
    const row = mapMembroComissaoSenado(
      { ...participacao, DataInicio: null },
      21,
      'uuid-sen-1',
    )
    expect(row).toBeNull()
  })

  it('codigoTipo null + sigla de CPI extinta → mantém via fallback', () => {
    const row = mapMembroComissaoSenado(
      {
        ...participacao,
        IdentificacaoComissao: {
          ...participacao.IdentificacaoComissao,
          CodigoComissao: '2606',
          SiglaComissao: 'CPMI - 8 de Janeiro',
          NomeComissao: 'Comissão Parlamentar Mista de Inquérito dos Atos…',
        },
      },
      null,
      'uuid-sen-1',
    )
    expect(row?.comissaoSourceId).toBe('2606')
    expect(row?.comissaoSigla).toBe('CPMI - 8 de Janeiro')
  })

  it('codigoTipo null + sigla de grupo extinto → exclui via fallback', () => {
    const row = mapMembroComissaoSenado(
      {
        ...participacao,
        IdentificacaoComissao: {
          ...participacao.IdentificacaoComissao,
          SiglaComissao: 'GPARGENTINA',
        },
      },
      null,
      'uuid-sen-1',
    )
    expect(row).toBeNull()
  })
})

describe('senadoColegiadoDetalheSchema + extractCodigoTipoSenado', () => {
  it('extrai CodigoTipo do detalhe (objeto único de Colegiado)', () => {
    const detalhe = senadoColegiadoDetalheSchema.parse({
      ComissoesCongressoNacional: {
        Colegiados: {
          Colegiado: {
            TipoColegiado: {
              TipoColegiado: 'Comissão Permanente',
              CodigoTipo: '21',
              SiglaCasa: 'SF',
            },
          },
        },
      },
    })
    expect(extractCodigoTipoSenado(detalhe)).toBe(21)
  })

  it('identifica grupo parlamentar (CodigoTipo 129)', () => {
    const detalhe = senadoColegiadoDetalheSchema.parse({
      ComissoesCongressoNacional: {
        Colegiados: {
          Colegiado: [
            {
              TipoColegiado: {
                TipoColegiado: 'Grupo Parlamentar',
                CodigoTipo: 129,
              },
            },
          ],
        },
      },
    })
    const cod = extractCodigoTipoSenado(detalhe)
    expect(cod).toBe(129)
    expect(isComissaoSenado(cod as number)).toBe(false)
  })

  it('retorna null quando o tipo está ausente', () => {
    const detalhe = senadoColegiadoDetalheSchema.parse({
      ComissoesCongressoNacional: { Colegiados: {} },
    })
    expect(extractCodigoTipoSenado(detalhe)).toBeNull()
  })
})

describe('senadoComissoesEnvelopeSchema (XML→JSON one-or-many)', () => {
  it('normaliza Comissao único para array', () => {
    const parsed = senadoComissoesEnvelopeSchema.parse({
      MembroComissaoParlamentar: {
        Parlamentar: {
          Codigo: '5672',
          MembroComissoes: { Comissao: participacao },
        },
      },
    })
    const lista =
      parsed.MembroComissaoParlamentar.Parlamentar.MembroComissoes?.Comissao
    expect(Array.isArray(lista)).toBe(true)
    expect(lista).toHaveLength(1)
  })

  it('aceita senador sem participações (MembroComissoes nulo)', () => {
    const parsed = senadoComissoesEnvelopeSchema.parse({
      MembroComissaoParlamentar: {
        Parlamentar: { Codigo: '1', MembroComissoes: null },
      },
    })
    expect(
      parsed.MembroComissaoParlamentar.Parlamentar.MembroComissoes,
    ).toBeNull()
  })
})
