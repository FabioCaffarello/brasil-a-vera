import { describe, expect, it } from 'vitest'

import {
  calcularDisciplinaMedia,
  calcularDisciplinaPartido,
  isOrientacaoEfetiva,
  isRebelde,
  isVotoAtivo,
} from './disciplina'

describe('isVotoAtivo', () => {
  it('retorna true para SIM, NAO, OBSTRUCAO', () => {
    expect(isVotoAtivo('SIM')).toBe(true)
    expect(isVotoAtivo('NAO')).toBe(true)
    expect(isVotoAtivo('OBSTRUCAO')).toBe(true)
  })

  it('retorna false para ABSTENCAO e AUSENTE', () => {
    expect(isVotoAtivo('ABSTENCAO')).toBe(false)
    expect(isVotoAtivo('AUSENTE')).toBe(false)
  })
})

describe('isOrientacaoEfetiva', () => {
  it('retorna true para SIM, NAO, OBSTRUCAO', () => {
    expect(isOrientacaoEfetiva('SIM')).toBe(true)
    expect(isOrientacaoEfetiva('NAO')).toBe(true)
    expect(isOrientacaoEfetiva('OBSTRUCAO')).toBe(true)
  })

  it('retorna false para LIBERADO', () => {
    expect(isOrientacaoEfetiva('LIBERADO')).toBe(false)
  })
})

describe('isRebelde', () => {
  it('considera rebelde quando voto ativo diverge de orientação efetiva', () => {
    expect(isRebelde('NAO', 'SIM')).toBe(true)
    expect(isRebelde('SIM', 'NAO')).toBe(true)
    expect(isRebelde('SIM', 'OBSTRUCAO')).toBe(true)
  })

  it('não considera rebelde quando voto segue orientação', () => {
    expect(isRebelde('SIM', 'SIM')).toBe(false)
    expect(isRebelde('NAO', 'NAO')).toBe(false)
    expect(isRebelde('OBSTRUCAO', 'OBSTRUCAO')).toBe(false)
  })

  it('não considera rebelde quando partido liberou bancada', () => {
    expect(isRebelde('SIM', 'LIBERADO')).toBe(false)
    expect(isRebelde('NAO', 'LIBERADO')).toBe(false)
  })

  it('não considera rebelde quando voto é AUSENTE ou ABSTENCAO', () => {
    expect(isRebelde('AUSENTE', 'SIM')).toBe(false)
    expect(isRebelde('ABSTENCAO', 'NAO')).toBe(false)
    expect(isRebelde('AUSENTE', 'OBSTRUCAO')).toBe(false)
  })
})

describe('calcularDisciplinaPartido', () => {
  it('calcula seguiram/rebelaram/total e pct corretamente', () => {
    const resultado = calcularDisciplinaPartido('XYZ', 'SIM', [
      'SIM',
      'SIM',
      'SIM',
      'SIM',
      'NAO',
    ])
    expect(resultado).toEqual({
      partido: 'XYZ',
      orientacao: 'SIM',
      seguiram: 4,
      rebelaram: 1,
      totalAtivo: 5,
      pctDisciplina: 80,
    })
  })

  it('ignora ABSTENCAO e AUSENTE no denominador', () => {
    const resultado = calcularDisciplinaPartido('XYZ', 'SIM', [
      'SIM',
      'SIM',
      'AUSENTE',
      'ABSTENCAO',
    ])
    expect(resultado).toMatchObject({
      seguiram: 2,
      rebelaram: 0,
      totalAtivo: 2,
      pctDisciplina: 100,
    })
  })

  it('retorna null quando orientação é LIBERADO', () => {
    expect(
      calcularDisciplinaPartido('XYZ', 'LIBERADO', ['SIM', 'NAO']),
    ).toBeNull()
  })

  it('retorna null quando nenhum voto ativo registrado', () => {
    expect(
      calcularDisciplinaPartido('XYZ', 'SIM', ['AUSENTE', 'ABSTENCAO']),
    ).toBeNull()
    expect(calcularDisciplinaPartido('XYZ', 'SIM', [])).toBeNull()
  })

  it('considera 100% quando todos seguem orientação', () => {
    const resultado = calcularDisciplinaPartido('XYZ', 'NAO', [
      'NAO',
      'NAO',
      'NAO',
    ])
    expect(resultado?.pctDisciplina).toBe(100)
  })

  it('considera 0% quando todos rebelam', () => {
    const resultado = calcularDisciplinaPartido('XYZ', 'SIM', [
      'NAO',
      'NAO',
      'NAO',
    ])
    expect(resultado?.pctDisciplina).toBe(0)
  })
})

describe('calcularDisciplinaMedia', () => {
  it('calcula média aritmética simples dos pcts', () => {
    const media = calcularDisciplinaMedia([
      {
        partido: 'A',
        orientacao: 'SIM',
        seguiram: 8,
        rebelaram: 2,
        totalAtivo: 10,
        pctDisciplina: 80,
      },
      {
        partido: 'B',
        orientacao: 'NAO',
        seguiram: 9,
        rebelaram: 1,
        totalAtivo: 10,
        pctDisciplina: 90,
      },
    ])
    expect(media).toBe(85)
  })

  it('retorna null quando lista vazia (sem orientações efetivas)', () => {
    expect(calcularDisciplinaMedia([])).toBeNull()
  })

  it('preserva pct fracionários', () => {
    const media = calcularDisciplinaMedia([
      {
        partido: 'A',
        orientacao: 'SIM',
        seguiram: 1,
        rebelaram: 2,
        totalAtivo: 3,
        pctDisciplina: (1 / 3) * 100,
      },
      {
        partido: 'B',
        orientacao: 'NAO',
        seguiram: 2,
        rebelaram: 1,
        totalAtivo: 3,
        pctDisciplina: (2 / 3) * 100,
      },
    ])
    expect(media).toBeCloseTo(50, 5)
  })
})
