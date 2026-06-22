import { describe, expect, it } from 'vitest'

import {
  extrairRelatorSourceId,
  mapRelatorProposicao,
} from './relatorias-mapper'

describe('extrairRelatorSourceId', () => {
  it('extrai o id de uma URL de deputado', () => {
    expect(
      extrairRelatorSourceId(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/80815',
      ),
    ).toBe('80815')
  })

  it('null/vazio → null (fail-closed)', () => {
    expect(extrairRelatorSourceId(null)).toBeNull()
    expect(extrairRelatorSourceId(undefined)).toBeNull()
    expect(extrairRelatorSourceId('')).toBeNull()
  })

  it('URL sem padrão de deputado → null', () => {
    expect(
      extrairRelatorSourceId(
        'https://dadosabertos.camara.leg.br/api/v2/orgaos/2008',
      ),
    ).toBeNull()
  })
})

describe('mapRelatorProposicao', () => {
  it('lê statusProposicao.uriUltimoRelator', () => {
    const r = mapRelatorProposicao({
      dados: {
        id: '2233802',
        statusProposicao: {
          uriUltimoRelator:
            'https://dadosabertos.camara.leg.br/api/v2/deputados/80815',
        },
      },
    })
    expect(r.relatorSourceId).toBe('80815')
  })

  it('uriUltimoRelator null → relatorSourceId null', () => {
    const r = mapRelatorProposicao({
      dados: { id: '1', statusProposicao: { uriUltimoRelator: null } },
    })
    expect(r.relatorSourceId).toBeNull()
  })

  it('statusProposicao ausente → null', () => {
    const r = mapRelatorProposicao({ dados: { id: '1' } })
    expect(r.relatorSourceId).toBeNull()
  })
})
