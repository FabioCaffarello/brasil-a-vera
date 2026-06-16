import { describe, expect, it } from 'vitest'

import { parseCsv, rowsToRecords } from './csv'

describe('parseCsv', () => {
  it('parseia campos mistos quoted/unquoted com separador ;', () => {
    const csv = '"A";"B";C\n"1";"x";9'
    expect(parseCsv(csv)).toEqual([
      ['A', 'B', 'C'],
      ['1', 'x', '9'],
    ])
  })

  it('preserva ; dentro de campo entre aspas', () => {
    expect(parseCsv('"a;b";"c"')).toEqual([['a;b', 'c']])
  })

  it('preserva quebra de linha embutida dentro das aspas (caso real TSE)', () => {
    // DS_BEM_CANDIDATO com LF no meio — o registro NÃO pode partir ao meio.
    const csv =
      '"COD";"DESC";"VALOR"\r\n"95";"Consórcio Canopus CNPJ 68.318.773/0001-54, suspenso e não\ncontemplado";"15879,55"\r\n'
    expect(parseCsv(csv)).toEqual([
      ['COD', 'DESC', 'VALOR'],
      [
        '95',
        'Consórcio Canopus CNPJ 68.318.773/0001-54, suspenso e não\ncontemplado',
        '15879,55',
      ],
    ])
  })

  it('trata aspas escapadas ("") como aspas literais', () => {
    expect(parseCsv('"diz ""olá"" aqui";"x"')).toEqual([
      ['diz "olá" aqui', 'x'],
    ])
  })

  it('trata CRLF e LF como mesmo fim de linha e descarta linhas em branco', () => {
    expect(parseCsv('a;b\r\nc;d\n\ne;f\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ])
  })

  it('preserva campo vazio entre aspas (distinto de linha em branco)', () => {
    expect(parseCsv('"";"x"')).toEqual([['', 'x']])
  })
})

describe('rowsToRecords', () => {
  it('chaveia pelo header e pula linhas com contagem divergente', () => {
    const skipped: number[] = []
    const records = rowsToRecords(
      [['ANO', 'SQ'], ['2022', '110001595906'], ['quebrado']],
      (_row, index) => skipped.push(index),
    )
    expect(records).toEqual([{ ANO: '2022', SQ: '110001595906' }])
    expect(skipped).toEqual([2])
  })
})
