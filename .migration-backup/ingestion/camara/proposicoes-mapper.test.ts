import { describe, expect, it } from 'vitest'

import {
  extractDeputadoIdFromUri,
  mapSituacao,
  mapTipoAutoria,
  mapTipoSigla,
} from './proposicoes-mapper'

describe('mapTipoSigla', () => {
  it('aceita os tipos cobertos na Wave 0', () => {
    expect(mapTipoSigla('PL')).toBe('PL')
    expect(mapTipoSigla('PEC')).toBe('PEC')
    expect(mapTipoSigla('PLP')).toBe('PLP')
    expect(mapTipoSigla('MPV')).toBe('MPV')
    expect(mapTipoSigla('PDC')).toBe('PDC')
    expect(mapTipoSigla('PRC')).toBe('PRC')
  })

  it('normaliza espaços e case', () => {
    expect(mapTipoSigla('  pl  ')).toBe('PL')
    expect(mapTipoSigla('Pec')).toBe('PEC')
  })

  it('retorna null para tipos fora do escopo da Wave 0', () => {
    expect(mapTipoSigla('REQ')).toBeNull()
    expect(mapTipoSigla('INC')).toBeNull()
    expect(mapTipoSigla('EMP')).toBeNull()
  })
})

describe('mapSituacao', () => {
  it('detecta "Transformada em Norma" mesmo com variações', () => {
    expect(mapSituacao('Transformada em Norma Jurídica')).toBe(
      'TRANSFORMADA_EM_NORMA',
    )
    expect(mapSituacao('Transformado em Lei Ordinária')).toBe(
      'TRANSFORMADA_EM_NORMA',
    )
  })

  it('classifica situações por substring', () => {
    expect(mapSituacao('Aprovada em Plenário')).toBe('APROVADA')
    expect(mapSituacao('Rejeitada na CCJC')).toBe('REJEITADA')
    expect(mapSituacao('Arquivada de forma definitiva')).toBe('ARQUIVADA')
  })

  it('default é TRAMITANDO', () => {
    expect(mapSituacao(null)).toBe('TRAMITANDO')
    expect(mapSituacao('')).toBe('TRAMITANDO')
    expect(mapSituacao('Pronta para Pauta')).toBe('TRAMITANDO')
    expect(mapSituacao('Aguardando Designação de Relator')).toBe('TRAMITANDO')
  })
})

describe('mapTipoAutoria', () => {
  it('proponente=1 é AUTOR', () => {
    expect(mapTipoAutoria(1)).toBe('AUTOR')
  })

  it('proponente=0 ou ausente é COAUTOR', () => {
    expect(mapTipoAutoria(0)).toBe('COAUTOR')
    expect(mapTipoAutoria(null)).toBe('COAUTOR')
    expect(mapTipoAutoria(undefined)).toBe('COAUTOR')
  })
})

describe('extractDeputadoIdFromUri', () => {
  it('extrai id numérico da URI canônica', () => {
    expect(
      extractDeputadoIdFromUri(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/178957',
      ),
    ).toBe('178957')
  })

  it('lida com query string ou trailing slash', () => {
    expect(extractDeputadoIdFromUri('https://x/deputados/123/')).toBe('123')
    expect(extractDeputadoIdFromUri('https://x/deputados/456?foo=bar')).toBe(
      '456',
    )
  })

  it('retorna null para autores não-deputados', () => {
    expect(extractDeputadoIdFromUri(null)).toBeNull()
    expect(extractDeputadoIdFromUri(undefined)).toBeNull()
    expect(
      extractDeputadoIdFromUri('https://senado.leg.br/senadores/123'),
    ).toBeNull()
    expect(extractDeputadoIdFromUri('https://x/orgaos/4242')).toBeNull()
  })
})
