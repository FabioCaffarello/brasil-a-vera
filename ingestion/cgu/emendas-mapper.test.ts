import { describe, expect, it } from 'vitest'

import {
  ANO_MINIMO,
  centavosParaNumeric,
  createEmendaAggregator,
  criarVinculadorAutores,
  type EmendaRow,
  isEmendaIndividual,
  mapEmenda,
  normalizeNomeAutor,
  valorBRLParaCentavos,
} from './emendas-mapper'
import { cguEmendaRecordSchema } from './emendas-schema'

// Record realista do CSV da CGU (headers verificados em 2026-07-14 —
// princípio 13; ver ADR-066 e docs/audits/2026-07-probe-download-de-dados.md).
const RECORD_BASE = {
  'Código da Emenda': '202638190001',
  'Ano da Emenda': '2026',
  'Tipo de Emenda':
    'Emenda Individual - Transferências com Finalidade Definida',
  'Código do Autor da Emenda': '3819',
  'Nome do Autor da Emenda': 'NIKOLAS FERREIRA',
  'Número da emenda': '0001',
  'Localidade de aplicação do recurso': 'BELO HORIZONTE - MG',
  'Código Município IBGE': '3106200',
  Município: 'BELO HORIZONTE',
  'Código UF IBGE': '3100000',
  UF: 'MINAS GERAIS',
  'Valor Empenhado': '394200,00',
  'Valor Liquidado': '100000,00',
  'Valor Pago': '50000,50',
  'Valor Restos A Pagar Inscritos': '0,00',
  'Valor Restos A Pagar Pagos': '0,00',
}

function record(overrides: Partial<typeof RECORD_BASE> = {}) {
  return cguEmendaRecordSchema.parse({ ...RECORD_BASE, ...overrides })
}

function row(overrides: Partial<typeof RECORD_BASE> = {}): EmendaRow {
  return mapEmenda(record(overrides))
}

describe('valorBRLParaCentavos', () => {
  it('converte vírgula decimal para centavos', () => {
    expect(valorBRLParaCentavos('394200,00')).toBe(39420000)
    expect(valorBRLParaCentavos('50000,50')).toBe(5000050)
    expect(valorBRLParaCentavos('0,00')).toBe(0)
  })

  it('preserva sinal negativo (estornos)', () => {
    expect(valorBRLParaCentavos('-1500,25')).toBe(-150025)
  })

  it('trata vazio e sentinelas como zero', () => {
    expect(valorBRLParaCentavos('')).toBe(0)
    expect(valorBRLParaCentavos('Sem informação')).toBe(0)
  })
})

describe('centavosParaNumeric', () => {
  it('produz a string canônica do numeric', () => {
    expect(centavosParaNumeric(39420000)).toBe('394200.00')
    expect(centavosParaNumeric(5)).toBe('0.05')
    expect(centavosParaNumeric(-150025)).toBe('-1500.25')
    expect(centavosParaNumeric(0)).toBe('0.00')
  })
})

describe('normalizeNomeAutor', () => {
  it('remove acentos, caixa e espaços redundantes', () => {
    expect(normalizeNomeAutor('José  Guimarães ')).toBe('JOSE GUIMARAES')
    expect(normalizeNomeAutor('NIKOLAS FERREIRA')).toBe('NIKOLAS FERREIRA')
  })
})

describe('isEmendaIndividual', () => {
  it('aceita ambos os subtipos individuais e rejeita os demais', () => {
    expect(
      isEmendaIndividual(
        'Emenda Individual - Transferências com Finalidade Definida',
      ),
    ).toBe(true)
    expect(
      isEmendaIndividual('Emenda Individual - Transferências Especiais'),
    ).toBe(true)
    expect(isEmendaIndividual('Emenda de Bancada')).toBe(false)
    expect(isEmendaIndividual('Emenda de Comissão')).toBe(false)
    expect(isEmendaIndividual('Emenda de Relator')).toBe(false)
  })
})

describe('mapEmenda', () => {
  it('mapeia o record com município e deriva a sigla da UF pelo código IBGE', () => {
    const mapped = row()
    expect(mapped).toMatchObject({
      codigoEmenda: '202638190001',
      ano: 2026,
      autorNome: 'NIKOLAS FERREIRA',
      localidade: 'BELO HORIZONTE - MG',
      municipioIbgeCodigo: '3106200',
      municipioNome: 'BELO HORIZONTE',
      uf: 'MG',
      centavosEmpenhado: 39420000,
      centavosPago: 5000050,
    })
  })

  it('anula município para destinos múltiplos/estaduais/nacionais', () => {
    const multiplo = row({
      'Localidade de aplicação do recurso': 'MÚLTIPLO',
      'Código Município IBGE': '',
      Município: 'Sem informação',
    })
    expect(multiplo.municipioIbgeCodigo).toBeNull()
    expect(multiplo.municipioNome).toBeNull()

    const sentinela = row({ 'Código Município IBGE': '-1' })
    expect(sentinela.municipioIbgeCodigo).toBeNull()
  })

  it('anula a UF quando o código IBGE não é reconhecido', () => {
    expect(row({ 'Código UF IBGE': 'Sem informação' }).uf).toBeNull()
  })
})

describe('criarVinculadorAutores', () => {
  const parlamentares = [
    {
      id: 'id-nikolas',
      nome: 'Nikolas Ferreira',
      nomeCivil: 'Nikolas Ferreira de Oliveira',
    },
    { id: 'id-jose', nome: 'José Guimarães', nomeCivil: null },
    { id: 'id-a', nome: 'João Silva', nomeCivil: null },
    { id: 'id-b', nome: 'JOAO SILVA', nomeCivil: null },
  ]

  it('vincula por nome eleitoral e por nome civil', () => {
    const v = criarVinculadorAutores(parlamentares)
    expect(v.match('NIKOLAS FERREIRA')).toBe('id-nikolas')
    expect(v.match('NIKOLAS FERREIRA DE OLIVEIRA')).toBe('id-nikolas')
    expect(v.match('JOSE GUIMARAES')).toBe('id-jose')
  })

  it('fail-closed em homônimos: nunca vincula nome ambíguo', () => {
    const v = criarVinculadorAutores(parlamentares)
    expect(v.match('JOAO SILVA')).toBeNull()
    expect(v.ambiguos()).toEqual(['JOAO SILVA'])
  })

  it('nome igual do mesmo parlamentar não é ambiguidade', () => {
    const v = criarVinculadorAutores([
      { id: 'id-x', nome: 'Fulano', nomeCivil: 'Fulano' },
    ])
    expect(v.match('FULANO')).toBe('id-x')
    expect(v.ambiguos()).toEqual([])
  })

  it('não vincula autor desconhecido', () => {
    const v = criarVinculadorAutores(parlamentares)
    expect(v.match('EX-DEPUTADO QUALQUER')).toBeNull()
  })
})

describe('createEmendaAggregator', () => {
  const vinculador = criarVinculadorAutores([
    { id: 'id-nikolas', nome: 'Nikolas Ferreira', nomeCivil: null },
  ])

  it('agrega classificações da mesma emenda×localidade somando valores', () => {
    const agg = createEmendaAggregator(vinculador)
    expect(agg.add(row({ 'Valor Empenhado': '100,00' }))).toBeNull()
    expect(agg.add(row({ 'Valor Empenhado': '23,50' }))).toBeNull()
    const [emenda] = agg.snapshot()
    expect(agg.snapshot()).toHaveLength(1)
    expect(emenda.centavosEmpenhado).toBe(12350)
    expect(emenda.parlamentarId).toBe('id-nikolas')
  })

  it('mesma emenda em localidades distintas gera linhas distintas', () => {
    const agg = createEmendaAggregator(vinculador)
    agg.add(row())
    agg.add(
      row({
        'Localidade de aplicação do recurso': 'CONTAGEM - MG',
        'Código Município IBGE': '3118601',
        Município: 'CONTAGEM',
      }),
    )
    expect(agg.snapshot()).toHaveLength(2)
  })

  it('descarta não-individuais, anos antigos e autor sem informação', () => {
    const agg = createEmendaAggregator(vinculador)
    expect(agg.add(row({ 'Tipo de Emenda': 'Emenda de Bancada' }))).toBe(
      'nao_individual',
    )
    expect(agg.add(row({ 'Ano da Emenda': String(ANO_MINIMO - 1) }))).toBe(
      'ano_antigo',
    )
    expect(agg.add(row({ 'Nome do Autor da Emenda': 'Sem informação' }))).toBe(
      'sem_autor',
    )
    expect(agg.snapshot()).toHaveLength(0)
  })

  it('conta match e sem-match por ano (taxa D3 do ADR-066)', () => {
    const agg = createEmendaAggregator(vinculador)
    agg.add(row())
    agg.add(
      row({
        'Nome do Autor da Emenda': 'EX-DEPUTADO QUALQUER',
        'Código da Emenda': '202699990001',
      }),
    )
    expect(agg.matchPorAno()).toEqual({
      2026: { vinculadas: 1, semMatch: 1 },
    })
    expect(agg.autoresSemMatch()).toEqual(['EX-DEPUTADO QUALQUER'])
  })
})
