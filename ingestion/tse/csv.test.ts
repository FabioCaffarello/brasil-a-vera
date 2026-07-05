import { describe, expect, it } from 'vitest'

import {
  createCsvRecordStream,
  createCsvStreamParser,
  parseCsv,
  rowsToRecords,
} from './csv'

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

describe('createCsvStreamParser', () => {
  // Alimenta o mesmo conteúdo em chunks de todos os tamanhos possíveis e
  // exige resultado idêntico ao parse whole-string — fronteiras de chunk
  // podem cair em QUALQUER ponto (inclusive entre \r e \n ou dentro de "").
  function parseChunked(content: string, chunkSize: number): string[][] {
    const rows: string[][] = []
    const parser = createCsvStreamParser((row) => rows.push(row))
    for (let i = 0; i < content.length; i += chunkSize) {
      parser.push(content.slice(i, i + chunkSize))
    }
    parser.flush()
    return rows
  }

  it('é equivalente a parseCsv para qualquer fronteira de chunk', () => {
    const csv =
      '"COD";"DESC";"VALOR"\r\n"95";"linha com\nquebra e ""aspas""";"15879,55"\r\na;b\n\n"";x\n'
    const expected = parseCsv(csv)
    for (let size = 1; size <= csv.length; size++) {
      expect(parseChunked(csv, size), `chunkSize=${size}`).toEqual(expected)
    }
  })

  it('emite a última linha no flush quando o arquivo não termina em newline', () => {
    const rows: string[][] = []
    const parser = createCsvStreamParser((row) => rows.push(row))
    parser.push('a;b\nc;')
    parser.push('d')
    expect(rows).toEqual([['a', 'b']])
    parser.flush()
    expect(rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })
})

describe('createCsvRecordStream', () => {
  it('usa a primeira linha como header e emite records incrementais', () => {
    const records: Array<Record<string, string>> = []
    const skipped: number[] = []
    const stream = createCsvRecordStream(
      (record) => records.push(record),
      (_row, index) => skipped.push(index),
    )
    stream.push('"ANO";"SQ"\n"2022";"110001595906"\n"quebrado"\n"2014";"7"')
    stream.flush()
    expect(records).toEqual([
      { ANO: '2022', SQ: '110001595906' },
      { ANO: '2014', SQ: '7' },
    ])
    expect(skipped).toEqual([2])
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
