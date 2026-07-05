// Parser CSV quote-aware e multi-linha, sob medida para os dumps do TSE.
//
// Por que não um split ingênuo por `;`/`\n` (confirmado empiricamente no CSV
// real do TSE 2022, princípio 13):
// - Encoding ISO-8859-1 (decodificar com TextDecoder('latin1') ANTES daqui).
// - Separador `;`, campos de texto entre aspas duplas, numéricos sem aspas
//   (campos mistos numa mesma linha).
// - `DS_BEM_CANDIDATO` é texto livre e contém quebras de linha (LF) embutidas
//   dentro das aspas → ~2.174 registros de 96k se partiriam ao meio num parser
//   line-based, corrompendo silenciosamente o dataset.
// - Aspas escapadas como `""` dentro de campo entre aspas.
//
// Duas formas de consumo:
// - `parseCsv(content)` — string inteira → linhas (arquivos que cabem numa
//   string; ex.: bem_candidato ~23MB).
// - `createCsvStreamParser(onRow)` — incremental por chunks. Necessário para
//   votacao_candidato_munzona: SP 2022 descomprimido tem 1,2GB, acima do
//   limite de string do V8 (~512MB) — o arquivo NUNCA vira uma string única
//   (medido no zip real, princípio 13).

export interface CsvStreamParser {
  /** Alimenta um chunk já decodificado (Latin-1 → UTF-8). */
  push(chunk: string): void
  /** Finaliza (o arquivo pode não terminar com newline). */
  flush(): void
}

// Máquina de estados única — parseCsv delega para cá. Fronteiras de chunk
// podem cair em qualquer ponto (inclusive entre `\r` e `\n`): o estado
// (campo parcial, aspas abertas, CR pendente) sobrevive entre pushes.
export function createCsvStreamParser(
  onRow: (row: string[]) => void,
  delimiter = ';',
): CsvStreamParser {
  let field = ''
  let row: string[] = []
  let inQuotes = false
  // Distingue "linha em branco" (descartável) de "linha com 1 campo vazio".
  let rowTouched = false
  // `\r` no fim de um chunk: o `\n` opcional pode vir no chunk seguinte.
  let pendingCr = false
  // `"` no fim de um chunk dentro de aspas: pode ser escape `""` partido.
  let pendingQuote = false

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    if (rowTouched) onRow(row)
    row = []
    rowTouched = false
  }

  const push = (chunk: string): void => {
    let i = 0
    const n = chunk.length
    if (n === 0) return

    if (pendingCr) {
      pendingCr = false
      if (chunk[0] === '\n') i = 1
      endRow()
    }
    if (pendingQuote) {
      pendingQuote = false
      if (chunk[i] === '"') {
        field += '"'
        i++
      } else {
        inQuotes = false
      }
    }

    while (i < n) {
      const ch = chunk[i]

      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 >= n) {
            pendingQuote = true
            i++
            continue
          }
          if (chunk[i + 1] === '"') {
            field += '"'
            i += 2
            continue
          }
          inQuotes = false
          i++
          continue
        }
        field += ch
        i++
        continue
      }

      if (ch === '"') {
        inQuotes = true
        rowTouched = true
        i++
        continue
      }
      if (ch === delimiter) {
        endField()
        rowTouched = true
        i++
        continue
      }
      if (ch === '\r') {
        i++
        if (i >= n) {
          pendingCr = true
          continue
        }
        if (chunk[i] === '\n') i++
        endRow()
        continue
      }
      if (ch === '\n') {
        i++
        endRow()
        continue
      }
      field += ch
      rowTouched = true
      i++
    }
  }

  const flush = (): void => {
    if (pendingCr) {
      pendingCr = false
      endRow()
    }
    if (pendingQuote) {
      pendingQuote = false
      inQuotes = false
    }
    // Último campo/linha — o arquivo pode não terminar com newline.
    if (rowTouched || field.length > 0) {
      endRow()
    }
  }

  return { push, flush }
}

export function parseCsv(content: string, delimiter = ';'): string[][] {
  const rows: string[][] = []
  const parser = createCsvStreamParser((row) => rows.push(row), delimiter)
  parser.push(content)
  parser.flush()
  return rows
}

// Converte as linhas em objetos chaveados pelo header (primeira linha).
// Linhas com contagem de campos diferente do header são puladas e reportadas
// via `onSkip` (não estourar silenciosamente — princípio de honestidade).
export function rowsToRecords(
  rows: string[][],
  onSkip?: (row: string[], index: number) => void,
): Array<Record<string, string>> {
  if (rows.length === 0) return []
  const header = rows[0]
  const records: Array<Record<string, string>> = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length !== header.length) {
      onSkip?.(row, i)
      continue
    }
    const record: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = row[c]
    }
    records.push(record)
  }
  return records
}

// Versão streaming de rowsToRecords: primeira linha vira header, as demais
// viram records conforme chegam. Um parser por ARQUIVO (o header é estado).
export function createCsvRecordStream(
  onRecord: (record: Record<string, string>) => void,
  onSkip?: (row: string[], index: number) => void,
  delimiter = ';',
): CsvStreamParser {
  let header: string[] | null = null
  let index = 0
  return createCsvStreamParser((row) => {
    if (header === null) {
      header = row
      return
    }
    index++
    if (row.length !== header.length) {
      onSkip?.(row, index)
      return
    }
    const record: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = row[c]
    }
    onRecord(record)
  }, delimiter)
}
