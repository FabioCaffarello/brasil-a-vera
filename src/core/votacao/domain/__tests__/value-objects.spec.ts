import { describe, expect, it } from 'vitest'
import { OrientacaoBancada } from '../value-objects/orientacao-bancada.vo'
import { ResultadoVotacao } from '../value-objects/resultado-votacao.vo'

describe('ResultadoVotacao', () => {
  it('should create with all fields', () => {
    const r = new ResultadoVotacao(300, 100, 10, 20, true)
    expect(r.votosSim).toBe(300)
    expect(r.votosNao).toBe(100)
    expect(r.abstencoes).toBe(10)
    expect(r.ausentes).toBe(20)
    expect(r.aprovada).toBe(true)
  })

  it('should calculate total', () => {
    const r = new ResultadoVotacao(300, 100, 10, 20, true)
    expect(r.total).toBe(430)
  })

  it('should be equal with same values', () => {
    const r1 = new ResultadoVotacao(300, 100, 10, 20, true)
    const r2 = new ResultadoVotacao(300, 100, 10, 20, true)
    expect(r1.equals(r2)).toBe(true)
  })

  it('should not be equal with different values', () => {
    const r1 = new ResultadoVotacao(300, 100, 10, 20, true)
    const r2 = new ResultadoVotacao(200, 100, 10, 20, false)
    expect(r1.equals(r2)).toBe(false)
  })
})

describe('OrientacaoBancada', () => {
  it('should create with partido and orientacao', () => {
    const o = new OrientacaoBancada('PT', 'SIM')
    expect(o.partidoSigla).toBe('PT')
    expect(o.orientacao).toBe('SIM')
  })

  it('should be equal with same values', () => {
    const o1 = new OrientacaoBancada('PT', 'SIM')
    const o2 = new OrientacaoBancada('PT', 'SIM')
    expect(o1.equals(o2)).toBe(true)
  })

  it('should not be equal with different values', () => {
    const o1 = new OrientacaoBancada('PT', 'SIM')
    const o2 = new OrientacaoBancada('PL', 'NAO')
    expect(o1.equals(o2)).toBe(false)
  })
})
