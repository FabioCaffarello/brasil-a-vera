import { describe, expect, it } from 'vitest'
import {
  createVotoAggregator,
  mapVotoMunicipio,
  normalizeCodigoMunicipio,
  TOP_MUNICIPIOS_PERSISTIDOS,
  type VotoMunicipioRow,
} from './votacao-municipal-mapper'
import { tseVotacaoMunicipalRecordSchema } from './votacao-municipal-schema'

// Linha realista (formato 2022, verificado contra o CSV real).
const RECORD_2022 = {
  ANO_ELEICAO: '2022',
  NR_TURNO: '1',
  SG_UF: 'AC',
  CD_MUNICIPIO: '1139',
  NM_MUNICIPIO: 'FEIJÓ',
  CD_CARGO: '6',
  SQ_CANDIDATO: '10001643698',
  QT_VOTOS_NOMINAIS: '37',
}

function row(overrides: Partial<VotoMunicipioRow> = {}): VotoMunicipioRow {
  return {
    anoEleicao: 2022,
    nrTurno: 1,
    sqCandidato: 100,
    cdCargo: 6,
    municipioTseCodigo: '1139',
    municipioNome: 'FEIJÓ',
    uf: 'AC',
    qtVotosNominais: 10,
    ...overrides,
  }
}

describe('mapVotoMunicipio', () => {
  it('mapeia registro real de 2022 com tipos numéricos', () => {
    const parsed = tseVotacaoMunicipalRecordSchema.parse(RECORD_2022)
    expect(mapVotoMunicipio(parsed)).toEqual({
      anoEleicao: 2022,
      nrTurno: 1,
      sqCandidato: 10001643698,
      cdCargo: 6,
      municipioTseCodigo: '1139',
      municipioNome: 'FEIJÓ',
      uf: 'AC',
      qtVotosNominais: 37,
    })
  })

  it('normaliza CD_MUNICIPIO com zero à esquerda (formato 2014)', () => {
    const parsed = tseVotacaoMunicipalRecordSchema.parse({
      ...RECORD_2022,
      ANO_ELEICAO: '2014',
      CD_MUNICIPIO: '01120',
    })
    expect(mapVotoMunicipio(parsed).municipioTseCodigo).toBe('1120')
  })
})

describe('normalizeCodigoMunicipio', () => {
  it('remove zeros à esquerda e preserva forma já canônica', () => {
    expect(normalizeCodigoMunicipio('01120')).toBe('1120')
    expect(normalizeCodigoMunicipio('1139')).toBe('1139')
    expect(normalizeCodigoMunicipio(' 01120 ')).toBe('1120')
    expect(normalizeCodigoMunicipio('000')).toBe('0')
  })
})

describe('createVotoAggregator', () => {
  it('soma zonas do mesmo município e computa total integral', () => {
    const agg = createVotoAggregator(2022, new Set([100]))
    expect(agg.add(row({ qtVotosNominais: 10 }))).toBe(true)
    expect(agg.add(row({ qtVotosNominais: 5 }))).toBe(true) // outra zona
    expect(
      agg.add(
        row({
          municipioTseCodigo: '1200',
          municipioNome: 'RIO BRANCO',
          qtVotosNominais: 80,
        }),
      ),
    ).toBe(true)

    const [candidato] = agg.snapshot()
    expect(candidato.sqCandidato).toBe(100)
    expect(candidato.totalVotos).toBe(95)
    expect(candidato.municipios).toEqual([
      {
        municipioTseCodigo: '1200',
        municipioNome: 'RIO BRANCO',
        uf: 'AC',
        qtVotosNominais: 80,
      },
      {
        municipioTseCodigo: '1139',
        municipioNome: 'FEIJÓ',
        uf: 'AC',
        qtVotosNominais: 15,
      },
    ])
  })

  it('filtra ano, turno, cargo não-federal e SQ não-vinculado', () => {
    const agg = createVotoAggregator(2022, new Set([100]))
    expect(agg.add(row({ anoEleicao: 2018 }))).toBe(false)
    expect(agg.add(row({ nrTurno: 2 }))).toBe(false)
    expect(agg.add(row({ cdCargo: 1 }))).toBe(false) // Presidente (_BR.csv)
    expect(agg.add(row({ sqCandidato: 999 }))).toBe(false)
    expect(agg.snapshot()).toEqual([])
  })

  it('corta no top-N com total preservando a soma integral', () => {
    const agg = createVotoAggregator(2022, new Set([100]), 2)
    for (let i = 1; i <= 4; i++) {
      agg.add(
        row({
          municipioTseCodigo: String(i),
          municipioNome: `MUN ${i}`,
          qtVotosNominais: i * 10,
        }),
      )
    }
    const [candidato] = agg.snapshot()
    expect(candidato.municipios).toHaveLength(2)
    expect(candidato.municipios.map((m) => m.qtVotosNominais)).toEqual([40, 30])
    // Denominador do % NÃO é a soma do top-N: é a soma integral.
    expect(candidato.totalVotos).toBe(100)
  })

  it('desempata por nome de município (ordem determinística)', () => {
    const agg = createVotoAggregator(2022, new Set([100]))
    agg.add(row({ municipioTseCodigo: '2', municipioNome: 'ZULMIRÓPOLIS' }))
    agg.add(row({ municipioTseCodigo: '1', municipioNome: 'ABADIA' }))
    const [candidato] = agg.snapshot()
    expect(candidato.municipios.map((m) => m.municipioNome)).toEqual([
      'ABADIA',
      'ZULMIRÓPOLIS',
    ])
  })

  it('exporta top-N default sincronizável com o disclaimer da UI', () => {
    expect(TOP_MUNICIPIOS_PERSISTIDOS).toBe(20)
  })
})
