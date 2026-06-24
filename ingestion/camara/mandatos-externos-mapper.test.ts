import { describe, expect, it } from 'vitest'
import { mapMandatosExternos } from './mandatos-externos-mapper'
import { mandatosExternosResponseSchema } from './mandatos-externos-schema'

// Fixture real: deputado 73440 (Luiza Erundina - SP, 3 mandatos como prefeita)
const FIXTURE_COM_MANDATOS = {
  dados: [
    {
      cargo: 'Prefeito(a)',
      siglaUf: 'SP',
      municipio: null,
      anoInicio: '1989',
      anoFim: '1992',
      siglaPartidoEleicao: 'PT',
      uriPartidoEleicao:
        'https://dadosabertos.camara.leg.br/api/v2/partidos/36844',
    },
    {
      cargo: 'Prefeito(a)',
      siglaUf: 'SP',
      municipio: null,
      anoInicio: '1997',
      anoFim: '2000',
      siglaPartidoEleicao: 'PT',
      uriPartidoEleicao:
        'https://dadosabertos.camara.leg.br/api/v2/partidos/36844',
    },
    {
      cargo: 'Prefeito(a)',
      siglaUf: 'SP',
      municipio: null,
      anoInicio: '2001',
      anoFim: '2004',
      siglaPartidoEleicao: 'PT',
      uriPartidoEleicao:
        'https://dadosabertos.camara.leg.br/api/v2/partidos/36844',
    },
  ],
  links: [
    {
      rel: 'self',
      href: 'https://dadosabertos.camara.leg.br/api/v2/deputados/73440/mandatosExternos',
    },
  ],
}

// Fixture real: deputado 204554 — sem mandatos externos
const FIXTURE_VAZIO = {
  dados: [],
  links: [
    {
      rel: 'self',
      href: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204554/mandatosExternos',
    },
  ],
}

const SOURCE_URL =
  'https://dadosabertos.camara.leg.br/api/v2/deputados/73440/mandatosExternos'

describe('mandatosExternosResponseSchema', () => {
  it('valida resposta com mandatos', () => {
    const result =
      mandatosExternosResponseSchema.safeParse(FIXTURE_COM_MANDATOS)
    expect(result.success).toBe(true)
    expect(result.data?.dados).toHaveLength(3)
  })

  it('valida resposta vazia', () => {
    const result = mandatosExternosResponseSchema.safeParse(FIXTURE_VAZIO)
    expect(result.success).toBe(true)
    expect(result.data?.dados).toHaveLength(0)
  })

  it('aceita campos extras (passthrough)', () => {
    const result = mandatosExternosResponseSchema.safeParse({
      ...FIXTURE_COM_MANDATOS,
      campoFuturo: 'ignorado',
    })
    expect(result.success).toBe(true)
  })
})

describe('mapMandatosExternos', () => {
  const parlamentarId = 'uuid-test-1234'

  it('mapeia 3 mandatos corretamente', () => {
    const parsed = mandatosExternosResponseSchema.parse(FIXTURE_COM_MANDATOS)
    const rows = mapMandatosExternos(parlamentarId, parsed.dados, SOURCE_URL)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      parlamentarId,
      cargo: 'Prefeito(a)',
      siglaUf: 'SP',
      municipio: null,
      anoInicio: 1989,
      anoFim: 1992,
      siglaPartidoEleicao: 'PT',
      sourceUrl: SOURCE_URL,
    })
  })

  it('converte anoInicio/anoFim string → integer', () => {
    const parsed = mandatosExternosResponseSchema.parse(FIXTURE_COM_MANDATOS)
    const rows = mapMandatosExternos(parlamentarId, parsed.dados, SOURCE_URL)
    expect(typeof rows[0].anoInicio).toBe('number')
    expect(typeof rows[0].anoFim).toBe('number')
  })

  it('retorna [] para deputado sem mandatos', () => {
    const parsed = mandatosExternosResponseSchema.parse(FIXTURE_VAZIO)
    const rows = mapMandatosExternos(parlamentarId, parsed.dados, SOURCE_URL)
    expect(rows).toHaveLength(0)
  })

  it('trata siglaUf null como null', () => {
    const fixture = {
      dados: [
        {
          cargo: 'Ministro(a)',
          siglaUf: null,
          municipio: null,
          anoInicio: '2003',
          anoFim: '2004',
          siglaPartidoEleicao: 'PT',
        },
      ],
    }
    const parsed = mandatosExternosResponseSchema.parse(fixture)
    const rows = mapMandatosExternos(parlamentarId, parsed.dados, SOURCE_URL)
    expect(rows[0].siglaUf).toBeNull()
  })

  it('trata anoInicio null como null', () => {
    const fixture = {
      dados: [
        {
          cargo: 'Vereador(a)',
          siglaUf: 'MG',
          municipio: 'Belo Horizonte',
          anoInicio: null,
          anoFim: null,
          siglaPartidoEleicao: null,
        },
      ],
    }
    const parsed = mandatosExternosResponseSchema.parse(fixture)
    const rows = mapMandatosExternos(parlamentarId, parsed.dados, SOURCE_URL)
    expect(rows[0].anoInicio).toBeNull()
    expect(rows[0].anoFim).toBeNull()
  })
})
