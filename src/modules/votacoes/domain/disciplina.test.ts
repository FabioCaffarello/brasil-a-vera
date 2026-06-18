import { describe, expect, it } from 'vitest'

import {
  calcularDisciplinaMedia,
  calcularDisciplinaPartido,
  divergiuDaOrientacao,
  isOrientacaoEfetiva,
  isVotoAtivo,
  siglasFederadasExcluidas,
  type VotosAtivosPartido,
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

describe('divergiuDaOrientacao', () => {
  it('considera divergência quando voto ativo diverge de orientação efetiva', () => {
    expect(divergiuDaOrientacao('NAO', 'SIM')).toBe(true)
    expect(divergiuDaOrientacao('SIM', 'NAO')).toBe(true)
    expect(divergiuDaOrientacao('SIM', 'OBSTRUCAO')).toBe(true)
  })

  it('não considera divergência quando voto segue orientação', () => {
    expect(divergiuDaOrientacao('SIM', 'SIM')).toBe(false)
    expect(divergiuDaOrientacao('NAO', 'NAO')).toBe(false)
    expect(divergiuDaOrientacao('OBSTRUCAO', 'OBSTRUCAO')).toBe(false)
  })

  it('não considera divergência quando partido liberou bancada', () => {
    expect(divergiuDaOrientacao('SIM', 'LIBERADO')).toBe(false)
    expect(divergiuDaOrientacao('NAO', 'LIBERADO')).toBe(false)
  })

  it('não considera divergência quando voto é AUSENTE ou ABSTENCAO', () => {
    expect(divergiuDaOrientacao('AUSENTE', 'SIM')).toBe(false)
    expect(divergiuDaOrientacao('ABSTENCAO', 'NAO')).toBe(false)
    expect(divergiuDaOrientacao('AUSENTE', 'OBSTRUCAO')).toBe(false)
  })
})

describe('calcularDisciplinaPartido', () => {
  it('calcula seguiram/divergiram/total e pct corretamente', () => {
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
      divergiram: 1,
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
      divergiram: 0,
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

  it('considera 0% quando todos divergem', () => {
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
        divergiram: 2,
        totalAtivo: 10,
        pctDisciplina: 80,
      },
      {
        partido: 'B',
        orientacao: 'NAO',
        seguiram: 9,
        divergiram: 1,
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
        divergiram: 2,
        totalAtivo: 3,
        pctDisciplina: (1 / 3) * 100,
      },
      {
        partido: 'B',
        orientacao: 'NAO',
        seguiram: 2,
        divergiram: 1,
        totalAtivo: 3,
        pctDisciplina: (2 / 3) * 100,
      },
    ])
    expect(media).toBeCloseTo(50, 5)
  })
})

describe('siglasFederadasExcluidas', () => {
  const votos = (
    partidoSigla: string,
    sim = 0,
    nao = 0,
    obstrucao = 0,
  ): VotosAtivosPartido => ({ partidoSigla, sim, nao, obstrucao })

  it('sinaliza federada com voto ativo ausente das barras de disciplina', () => {
    // PT votou (federada) e não tem orientação P → fora de `disciplinas`.
    expect(
      siglasFederadasExcluidas([votos('PT', 5, 2), votos('PL', 10)], ['PL']),
    ).toEqual(['PT'])
  })

  it('ignora partido não federado ausente das barras', () => {
    // PL votou e não tem disciplina, mas não é federado → não sinaliza.
    expect(siglasFederadasExcluidas([votos('PL', 4)], [])).toEqual([])
  })

  it('não sinaliza federada que aparece nas barras (P esparso da sigla)', () => {
    // Caso de borda: PT tem orientação P nesta votação → está em `disciplinas`.
    // O MINUS evita contradizer a barra visível.
    expect(siglasFederadasExcluidas([votos('PT', 3, 1)], ['PT'])).toEqual([])
  })

  it('não sinaliza federada sem voto ativo (só abstenção/ausência)', () => {
    // Ausência aqui não é por federação → não atribuir à federação.
    expect(siglasFederadasExcluidas([votos('PSOL', 0, 0, 0)], [])).toEqual([])
  })

  it('detecção é case-insensitive (grafia da sigla varia na fonte)', () => {
    expect(siglasFederadasExcluidas([votos('pcdob', 2)], [])).toEqual(['pcdob'])
  })

  it('preserva múltiplas federadas excluídas na ordem de entrada', () => {
    expect(
      siglasFederadasExcluidas(
        [votos('PT', 5), votos('PL', 9), votos('PSOL', 0, 3)],
        ['PL'],
      ),
    ).toEqual(['PT', 'PSOL'])
  })

  it('lista vazia quando nenhuma federada votou', () => {
    expect(
      siglasFederadasExcluidas([votos('PL', 5), votos('NOVO', 2)], []),
    ).toEqual([])
  })
})
