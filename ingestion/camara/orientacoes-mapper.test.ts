import { describe, expect, it } from 'vitest'

import { classificarOrientacao, mapOrientacaoVoto } from './orientacoes-mapper'
import type { CamaraOrientacao } from './orientacoes-schema'

// Helper: monta uma linha da API com defaults, sobrescrevendo o relevante.
function linha(over: Partial<CamaraOrientacao>): CamaraOrientacao {
  return {
    orientacaoVoto: 'Sim',
    codTipoLideranca: 'P',
    siglaPartidoBloco: 'PT',
    codPartidoBloco: 36844,
    uriPartidoBloco: 'https://exemplo/partido',
    ...over,
  } as CamaraOrientacao
}

describe('mapOrientacaoVoto', () => {
  it('mapeia variações canônicas observadas em prod', () => {
    expect(mapOrientacaoVoto('Sim')).toBe('SIM')
    expect(mapOrientacaoVoto('Não')).toBe('NAO')
    expect(mapOrientacaoVoto('Liberado')).toBe('LIBERADO')
    expect(mapOrientacaoVoto('Obstrução')).toBe('OBSTRUCAO')
  })

  it('é case-insensitive e tolera acentos ausentes', () => {
    expect(mapOrientacaoVoto('SIM')).toBe('SIM')
    expect(mapOrientacaoVoto('nao')).toBe('NAO')
    expect(mapOrientacaoVoto('LIBERADO')).toBe('LIBERADO')
    expect(mapOrientacaoVoto('obstrucao')).toBe('OBSTRUCAO')
  })

  it('tolera espaços em branco extras', () => {
    expect(mapOrientacaoVoto('  Sim  ')).toBe('SIM')
    expect(mapOrientacaoVoto('  Não  ')).toBe('NAO')
  })

  it('aceita abreviações S/N', () => {
    expect(mapOrientacaoVoto('S')).toBe('SIM')
    expect(mapOrientacaoVoto('N')).toBe('NAO')
  })

  it('retorna null para entrada vazia ou nula (skip silencioso)', () => {
    expect(mapOrientacaoVoto('')).toBeNull()
    expect(mapOrientacaoVoto('   ')).toBeNull()
    expect(mapOrientacaoVoto(null)).toBeNull()
    expect(mapOrientacaoVoto(undefined)).toBeNull()
  })

  it('retorna null para valores desconhecidos (caller decide warn)', () => {
    expect(mapOrientacaoVoto('???')).toBeNull()
    expect(mapOrientacaoVoto('Talvez')).toBeNull()
    expect(mapOrientacaoVoto('Abstenção')).toBeNull()
  })
})

describe('classificarOrientacao', () => {
  it('retém partido (P) com sigla verbatim', () => {
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'P',
          siglaPartidoBloco: 'PL',
          codPartidoBloco: 37906,
        }),
      ),
    ).toEqual({ partidoSigla: 'PL', tipoLideranca: 'P' })
  })

  it('descarta P sem código de partido (anomalia)', () => {
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'P',
          siglaPartidoBloco: 'PL',
          codPartidoBloco: null,
        }),
      ),
    ).toBeNull()
  })

  it('retém os 4 blocos institucionais (B) com sigla canônica', () => {
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Governo',
          codPartidoBloco: null,
        }),
      ),
    ).toEqual({ partidoSigla: 'Governo', tipoLideranca: 'B' })
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Oposição',
          codPartidoBloco: null,
        }),
      ),
    ).toEqual({ partidoSigla: 'Oposição', tipoLideranca: 'B' })
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Maioria',
          codPartidoBloco: null,
        }),
      ),
    ).toEqual({ partidoSigla: 'Maioria', tipoLideranca: 'B' })
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Minoria',
          codPartidoBloco: null,
        }),
      ),
    ).toEqual({ partidoSigla: 'Minoria', tipoLideranca: 'B' })
  })

  it('canoniza caixa/acento do bloco para join previsível', () => {
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'OPOSICAO',
          codPartidoBloco: null,
        }),
      ),
    ).toEqual({ partidoSigla: 'Oposição', tipoLideranca: 'B' })
  })

  it('descarta federações e blocos ad-hoc (fora do escopo ADR-040)', () => {
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Fdr PT-PCdoB-PV',
          codPartidoBloco: null,
        }),
      ),
    ).toBeNull()
    expect(
      classificarOrientacao(
        linha({
          codTipoLideranca: 'B',
          siglaPartidoBloco: 'Bl UniPpPsd...',
          codPartidoBloco: null,
        }),
      ),
    ).toBeNull()
  })
})
