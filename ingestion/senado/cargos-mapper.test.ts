import { describe, expect, it } from 'vitest'
import { mapCargosSenado } from './cargos-mapper'
import { senadoCargosEnvelopeSchema } from './cargos-schema'

// Regressão #727 item 3: o envelope real é `CargoParlamentar` (não
// `CargosExercidosParlamentar`) e o item traz `IdentificacaoComissao` +
// `DescricaoCargo` — o schema antigo falhava o parse para 81/81 senadores
// e a fonte nunca populou prod. Fixture literal reduzida do payload real
// (senador 470, 2026-07-14).
function rawEnvelope(cargos: unknown) {
  return {
    CargoParlamentar: {
      noNamespaceSchemaLocation: 'https://legis.senado.leg.br/…',
      Metadados: { Versao: '14/07/2026', VersaoServico: '4' },
      Parlamentar: {
        Codigo: '470',
        Nome: 'Senadora Teste',
        Cargos: { Cargo: cargos },
      },
    },
  }
}

const CARGO_REAL = {
  IdentificacaoComissao: {
    CodigoComissao: '2053',
    SiglaComissao: 'GPGUIANA',
    NomeComissao: 'Grupo Parlamentar Brasil - Guiana',
    SiglaCasaComissao: 'CN',
  },
  CodigoCargo: '1',
  DescricaoCargo: 'PRESIDENTE',
  DataInicio: '2019-08-08',
  DataFim: '2023-01-31',
}

function parseAndMap(cargos: unknown) {
  const parsed = senadoCargosEnvelopeSchema.parse(rawEnvelope(cargos))
  return mapCargosSenado(parsed, 'uuid-senadora', 57)
}

describe('senadoCargosEnvelopeSchema + mapCargosSenado', () => {
  it('aceita o envelope real e mapeia cargo → lideranca_cargo row', () => {
    const rows = parseAndMap([CARGO_REAL])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      parlamentarId: 'uuid-senadora',
      tipo: 'PRESIDENTE_COMISSAO',
      entidade: 'GPGUIANA',
      casa: 'SENADO',
      legislatura: 57,
      dataInicio: '2019-08-08',
      dataFim: '2023-01-31',
    })
  })

  it('cargo único como objeto (XML→JSON) também parseia', () => {
    const rows = parseAndMap(CARGO_REAL)
    expect(rows).toHaveLength(1)
  })

  it('normaliza DescricaoCargo (vice, suplente, membro)', () => {
    const rows = parseAndMap([
      { ...CARGO_REAL, DescricaoCargo: 'VICE-PRESIDENTE' },
      {
        ...CARGO_REAL,
        DescricaoCargo: 'SUPLENTE',
        IdentificacaoComissao: { SiglaComissao: 'CCJ' },
      },
      {
        ...CARGO_REAL,
        DescricaoCargo: 'TITULAR',
        IdentificacaoComissao: { SiglaComissao: 'CRA' },
      },
    ])
    expect(rows.map((r) => r.tipo).sort()).toEqual([
      'MEMBRO_COMISSAO',
      'SUPLENTE_COMISSAO',
      'VICE_PRESIDENTE_COMISSAO',
    ])
  })

  it('dedupe: mesmo cargo em períodos distintos mantém o mais recente (#728)', () => {
    const rows = parseAndMap([
      CARGO_REAL,
      { ...CARGO_REAL, DataInicio: '2023-02-01', DataFim: null },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].dataInicio).toBe('2023-02-01')
    expect(rows[0].dataFim).toBeNull()
  })

  it('Cargos nulos/ausentes → array vazio', () => {
    const semCargos = senadoCargosEnvelopeSchema.parse({
      CargoParlamentar: { Parlamentar: { Codigo: '1', Cargos: null } },
    })
    expect(mapCargosSenado(semCargos, 'uuid-x', 57)).toEqual([])
  })

  it('rejeita o envelope antigo (CargosExercidosParlamentar)', () => {
    const antigo = { CargosExercidosParlamentar: { Parlamentar: null } }
    expect(senadoCargosEnvelopeSchema.safeParse(antigo).success).toBe(false)
  })
})
