import { describe, expect, it } from 'vitest'

import {
  centavosParaNumeric,
  criarVinculadorSenadores,
  extrairNomeSenador,
  indexarRemuneracoes,
  mapComissionadoSenado,
  remuneracaoParaCentavos,
} from './comissionados-mapper'
import { senadoComissionadoItemSchema } from './comissionados-schema'

const SENADORES = [
  { id: 'id-izalci', nome: 'Izalci Lucas', nomeCivil: 'Izalci Lucas Ferreira' },
  { id: 'id-jorge', nome: 'Jorge Viana', nomeCivil: null },
]

// Item literal do payload real (probe Fase C, 2026-07-14).
function item(overrides: Record<string, unknown> = {}) {
  return senadoComissionadoItemSchema.parse({
    sequencial: 2735954,
    nome: 'ABENILIO AIRES CIRQUEIRA',
    vinculo: 'COMISSIONADO',
    situacao: 'ATIVO',
    cargo: null,
    funcao: null,
    lotacao: { sigla: 'GSIZALCI', nome: 'Gabinete do Senador Izalci Lucas' },
    ...overrides,
  })
}

describe('extrairNomeSenador', () => {
  it('extrai de Gabinete do Senador / da Senadora', () => {
    expect(extrairNomeSenador('Gabinete do Senador Izalci Lucas')).toBe(
      'Izalci Lucas',
    )
    expect(extrairNomeSenador('Gabinete da Senadora Teresa Leitão')).toBe(
      'Teresa Leitão',
    )
  })

  it('extrai de Escritório de Apoio N do Senador', () => {
    expect(
      extrairNomeSenador('Escritório de Apoio 1 do Senador Jorge Viana'),
    ).toBe('Jorge Viana')
  })

  it('null para lotações administrativas', () => {
    expect(extrairNomeSenador('Secretaria de Gestão de Pessoas')).toBeNull()
    expect(extrairNomeSenador('')).toBeNull()
  })
})

describe('criarVinculadorSenadores', () => {
  it('vincula por nome e nome civil, normalizado', () => {
    const v = criarVinculadorSenadores(SENADORES)
    expect(v.match('Izalci Lucas')).toBe('id-izalci')
    expect(v.match('IZALCI LUCAS FERREIRA')).toBe('id-izalci')
  })

  it('fail-closed em homônimos', () => {
    const v = criarVinculadorSenadores([
      ...SENADORES,
      { id: 'id-outro', nome: 'Jorge Viana', nomeCivil: null },
    ])
    expect(v.match('Jorge Viana')).toBeNull()
    expect(v.ambiguos()).toEqual(['JORGE VIANA'])
  })
})

describe('remuneração', () => {
  it('parse de vírgula decimal da fonte para centavos', () => {
    expect(remuneracaoParaCentavos('789,41')).toBe(78941)
    expect(remuneracaoParaCentavos('-110,52')).toBe(-11052)
    expect(remuneracaoParaCentavos('')).toBe(0)
  })

  it('indexa por NOME normalizado somando folhas; homônimo é descartado', () => {
    const idx = indexarRemuneracoes([
      // Mesma pessoa (mesmo sequencial), duas folhas → soma.
      {
        sequencial: '100',
        nome: 'João da Silva',
        tipo_folha: 'Normal',
        remuneracao_basica: '1000,00',
      },
      {
        sequencial: '100',
        nome: 'JOÃO DA SILVA',
        tipo_folha: 'Suplementar',
        remuneracao_basica: '789,41',
      },
      {
        sequencial: '200',
        nome: 'Maria Souza',
        tipo_folha: 'Normal',
        remuneracao_basica: '500,00',
      },
      // Homônimo: mesmo nome, sequenciais DISTINTOS → fail-closed (fora).
      {
        sequencial: '300',
        nome: 'Pedro Homônimo',
        tipo_folha: 'Normal',
        remuneracao_basica: '100,00',
      },
      {
        sequencial: '301',
        nome: 'PEDRO HOMÔNIMO',
        tipo_folha: 'Normal',
        remuneracao_basica: '200,00',
      },
    ])
    expect(idx.get('JOAO DA SILVA')).toBe(178941)
    expect(idx.get('MARIA SOUZA')).toBe(50000)
    expect(idx.has('PEDRO HOMONIMO')).toBe(false)
  })

  it('centavosParaNumeric produz a string canônica', () => {
    expect(centavosParaNumeric(178941)).toBe('1789.41')
    expect(centavosParaNumeric(5)).toBe('0.05')
  })
})

describe('mapComissionadoSenado', () => {
  const vinculador = criarVinculadorSenadores(SENADORES)

  it('mapeia comissionado ativo de gabinete', () => {
    expect(mapComissionadoSenado(item(), vinculador)).toEqual({
      parlamentarId: 'id-izalci',
      sequencial: '2735954',
      nome: 'ABENILIO AIRES CIRQUEIRA',
      grupo: 'COMISSIONADO',
      cargo: null,
    })
  })

  it('descarta desligados, lotações administrativas e sem match', () => {
    expect(
      mapComissionadoSenado(item({ situacao: 'DESLIGADO' }), vinculador),
    ).toBe('desligado')
    expect(
      mapComissionadoSenado(
        item({ lotacao: { sigla: 'SGP', nome: 'Secretaria de Gestão' } }),
        vinculador,
      ),
    ).toBe('fora_de_gabinete')
    expect(
      mapComissionadoSenado(
        item({
          lotacao: {
            sigla: 'GSX',
            nome: 'Gabinete do Senador Inexistente Silva',
          },
        }),
        vinculador,
      ),
    ).toBe('sem_match_senador')
  })

  it('usa funcao.nome como cargo quando presente (cargo/funcao são objetos)', () => {
    const comFuncao = item({
      funcao: { codigo: 95, nome: 'AJUDANTE PARLAMENTAR INTERMEDIÁRIO' },
      cargo: { nome: 'OUTRO' },
    })
    const mapped = mapComissionadoSenado(comFuncao, vinculador)
    expect(typeof mapped === 'object' && mapped.cargo).toBe(
      'AJUDANTE PARLAMENTAR INTERMEDIÁRIO',
    )
  })
})
