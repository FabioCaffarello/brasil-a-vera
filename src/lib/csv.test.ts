import { describe, expect, it } from 'vitest'

import { type CsvColumn, csvResponseHeaders, toCsv } from './csv'

interface Row {
  nome: string
  partido: string | null
  votos: number
  ativo: boolean
  data: Date
}

const colunas: CsvColumn<Row>[] = [
  { header: 'nome', get: (r) => r.nome },
  { header: 'partido', get: (r) => r.partido },
  { header: 'votos', get: (r) => r.votos },
  { header: 'ativo', get: (r) => r.ativo },
  { header: 'data', get: (r) => r.data },
]

describe('toCsv', () => {
  it('gera header + linhas com BOM UTF-8 e CRLF', () => {
    const rows: Row[] = [
      {
        nome: 'Alice',
        partido: 'PT',
        votos: 100,
        ativo: true,
        data: new Date('2025-05-10T00:00:00Z'),
      },
    ]
    const out = toCsv(rows, colunas)
    expect(out.startsWith('﻿')).toBe(true)
    expect(out).toContain('\r\n')
    expect(out).toContain('nome,partido,votos,ativo,data\r\n')
    expect(out).toContain('Alice,PT,100,true,2025-05-10T00:00:00.000Z\r\n')
  })

  it('escapa valores com vírgula, aspas ou newline', () => {
    const rows = [
      { campo: 'a,b' },
      { campo: 'tem "aspas"' },
      { campo: 'linha\nquebra' },
    ]
    const out = toCsv(rows, [{ header: 'campo', get: (r) => r.campo }])
    expect(out).toContain('"a,b"')
    expect(out).toContain('"tem ""aspas"""')
    expect(out).toContain('"linha\nquebra"')
  })

  it('trata null/undefined como string vazia', () => {
    const rows = [{ nome: 'X', partido: null }]
    const out = toCsv(rows, [
      { header: 'nome', get: (r) => r.nome },
      { header: 'partido', get: (r) => r.partido },
    ])
    expect(out).toContain('X,\r\n')
  })

  it('aceita Iterable<T> (não só array)', () => {
    function* gen() {
      yield { v: 1 }
      yield { v: 2 }
    }
    const out = toCsv(gen(), [{ header: 'v', get: (r) => r.v }])
    expect(out).toContain('1\r\n2\r\n')
  })
})

describe('csvResponseHeaders', () => {
  it('define headers corretos para download', () => {
    const h = csvResponseHeaders('parlamentares.csv') as Record<string, string>
    expect(h['content-type']).toContain('text/csv')
    expect(h['content-type']).toContain('utf-8')
    expect(h['content-disposition']).toContain('attachment')
    expect(h['content-disposition']).toContain('parlamentares.csv')
  })
})
